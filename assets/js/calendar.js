(function () {
  "use strict";

  var root = document.documentElement.getAttribute("data-root") || "../";
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var VALID_VIEWS = { daily: 1, weekly: 1, monthly: 1, yearly: 1 };
  var view = VALID_VIEWS[qs.get("view")] ? qs.get("view") : "daily";

  var store = { categories: [], events: [] };
  var cursor = new Date();
  var TODAY = new Date();
  var DOW = ["SUN.", "MON.", "TUE.", "WED.", "THU.", "FRI.", "SAT."];
  var DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];
  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }
  function startOfWeek(d) { return addDays(d, -d.getDay()); }
  function t(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function diffDays(a, b) { return Math.round((t(b) - t(a)) / 86400000); }
  function sameDay(a, b) { return t(a) === t(b); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function loadStore() {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch("calendar").then(function (val) {
        if (val && val.events) return val;
        return fetchJson();
      });
    }
    return fetchJson();
  }

  function fetchJson() {
    return fetch(root + "data/calendar.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }

  function persist() {
    if (window.SQDb && SQDb.ready()) return SQDb.push("calendar", store);
    return Promise.resolve(true);
  }

  function findEvent(id) {
    for (var i = 0; i < store.events.length; i++) if (store.events[i].id === id) return store.events[i];
    return null;
  }

  function occurrences(ev, rs, re) {
    var s = parse(ev.start);
    var e = parse(ev.end || ev.start);
    var dur = Math.max(0, diffDays(s, e));
    var rep = ev.repeat || "none";
    var out = [];
    function pushIf(os) {
      var oe = addDays(os, dur);
      if (t(oe) >= t(rs) && t(os) <= t(re)) out.push({ start: os, end: oe });
    }
    if (rep === "none") { pushIf(s); return out; }
    var cur = new Date(s);
    var g = 0;
    if (rep === "weekly") {
      if (t(cur) < t(rs)) cur = addDays(cur, Math.floor(diffDays(cur, rs) / 7) * 7);
      while (t(cur) <= t(re) && g++ < 500) { pushIf(cur); cur = addDays(cur, 7); }
    } else if (rep === "monthly") {
      var mb = (rs.getFullYear() - cur.getFullYear()) * 12 + (rs.getMonth() - cur.getMonth());
      if (mb > 0) cur = addMonths(cur, mb - 1);
      while (t(cur) <= t(re) && g++ < 80) { pushIf(cur); cur = addMonths(cur, 1); }
    } else if (rep === "yearly") {
      var yb = rs.getFullYear() - cur.getFullYear();
      if (yb > 0) cur = new Date(cur.getFullYear() + yb - 1, cur.getMonth(), cur.getDate());
      while (t(cur) <= t(re) && g++ < 40) { pushIf(cur); cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate()); }
    }
    return out;
  }

  function occsInRange(rs, re) {
    var list = [];
    getVisibleEvents(store.events).forEach(function (ev) {
      occurrences(ev, rs, re).forEach(function (o) {
        list.push({ ev: ev, start: o.start, end: o.end });
      });
    });
    return list;
  }

  function isDone(ev, occStart) {
    return (ev.doneDates || []).indexOf(ymd(occStart)) >= 0;
  }

  function setView(v) {
    view = v;
    var u = new URL(location.href);
    u.searchParams.set("view", v);
    history.replaceState(null, "", u.pathname + u.search);
    document.querySelectorAll("[data-cal-view]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-cal-view") === v);
    });
    render();
  }

  function renderDaily() {
    var y = cursor.getFullYear();
    var m = cursor.getMonth();
    var ms = new Date(y, m, 1);
    var me = new Date(y, m + 1, 0);
    var html = '<h2 class="cal-month-label">' + MONTHS[m] + "</h2>";
    for (var d = new Date(ms); t(d) <= t(me); d = addDays(d, 1)) {
      var occ = occsInRange(d, d);
      var today = sameDay(d, TODAY);
      html +=
        '<section class="cal-day-block" data-date="' + ymd(d) + '">' +
        '<div class="cal-day-head">' +
        '<span class="cal-day-head__date">' + pad(d.getDate()) + "/" + DOW[d.getDay()] + "</span>" +
        (today ? '<span class="cal-day-head__today">TODAY</span>' : "<span></span>") +
        "</div>";
      if (!occ.length) {
        html += '<div class="cal-task" data-add="' + ymd(d) + '"><span class="cal-task__time">00:00</span><span class="cal-task__title">+ 일정</span><span></span><span></span></div>';
      } else {
        occ.forEach(function (o) {
          var done = isDone(o.ev, o.start);
          var cat = null;
          for (var ci = 0; ci < store.categories.length; ci++) {
            if (store.categories[ci].id === o.ev.catId) { cat = store.categories[ci]; break; }
          }
          html +=
            '<div class="cal-task' + (done ? " is-done" : "") + '" data-id="' + o.ev.id + '" data-occ="' + ymd(o.start) + '" draggable="true"' +
            (cat ? ' style="border-left:3px solid ' + esc(cat.color) + '"' : '') + '>' +
            '<span class="cal-task__time">' + esc(o.ev.time || "00:00") + "</span>" +
            '<span class="cal-task__title">' + esc(o.ev.title) + "</span>" +
            '<span class="cal-task__memo">' + esc(o.ev.memo || "") + "</span>" +
            '<button type="button" class="cal-task__check' + (done ? " is-checked" : "") + '" aria-label="완료"></button>' +
            "</div>";
        });
      }
      html += "</section>";
    }
    $("cal-body").innerHTML = html;
    bindDrag();
  }

  function renderMonthly() {
    var y = cursor.getFullYear();
    var m = cursor.getMonth();
    var ms = new Date(y, m, 1);
    var me = new Date(y, m + 1, 0);
    var gridStart = startOfWeek(ms);
    var occs = occsInRange(gridStart, addDays(startOfWeek(me), 6));
    var html =
      '<div class="cal-month-head"><span>' + MONTHS[m] + "</span><span>" + y + "</span></div>" +
      '<div class="cal-weekdays">' +
      DOW_KO.map(function (d, i) {
        return '<span class="' + (i === 0 ? "sun" : i === 6 ? "sat" : "") + '">' + d + "</span>";
      }).join("") +
      "</div>" +
      '<div class="cal-month-wrap"><div class="cal-grid" id="cal-grid">';
    var cells = "";
    for (var i = 0; i < 42; i++) {
      var d = addDays(gridStart, i);
      var other = d.getMonth() !== m;
      var dot = false;
      occs.forEach(function (o) {
        if (sameDay(o.start, o.end) && sameDay(d, o.start)) dot = true;
      });
      cells +=
        '<div class="cal-cell' + (other ? " is-other" : "") + '" data-date="' + ymd(d) + '">' +
        '<span class="cal-cell__num">' + d.getDate() + "</span>" +
        (dot ? '<span class="cal-cell__dot"></span>' : "") +
        "</div>";
    }
    html += cells + "</div>";
    var bars = "";
    var colW = 100 / 7;
    occs.forEach(function (o) {
      if (sameDay(o.start, o.end)) return;
      var startCol = Math.max(0, diffDays(gridStart, o.start));
      var endCol = Math.min(41, diffDays(gridStart, o.end));
      if (endCol < 0 || startCol > 41) return;
      var row = Math.floor(startCol / 7);
      var sc = startCol % 7;
      var ec = endCol % 7;
      var span = endCol - startCol + 1;
      var left = sc * colW;
      var width = span * colW;
      bars +=
        '<div class="cal-bar" style="top:' + (row * 52 + 28) + "px;left:" + left + "%;width:" + width + '%"></div>';
    });
    html += '<div class="cal-bars">' + bars + "</div></div>";
    html += '<p class="cal-foot">MOVE TO ' + y + " FAV ↓</p>";
    $("cal-body").innerHTML = html;
  }

  /* ── 주간 뷰 ── */
  function renderWeekly() {
    var weekStart = startOfWeek(cursor);
    var html = '<div class="cal-week-grid">';
    html += '<div class="cal-week-head">';
    for (var d2 = 0; d2 < 7; d2++) {
      var dd = addDays(weekStart, d2);
      var isToday2 = sameDay(dd, TODAY);
      html += '<div class="cal-week-head__cell' + (isToday2 ? " is-today" : "") + '">' +
        '<span class="cal-week-head__dow">' + DOW[dd.getDay()] + '</span>' +
        '<span class="cal-week-head__num">' + dd.getDate() + '</span>' +
        '</div>';
    }
    html += '</div><div class="cal-week-body">';
    for (var d3 = 0; d3 < 7; d3++) {
      var day = addDays(weekStart, d3);
      var occs = occsInRange(day, day);
      html += '<div class="cal-week-col" data-date="' + ymd(day) + '">';
      if (!occs.length) {
        html += '<div class="cal-week-empty" data-add="' + ymd(day) + '">+</div>';
      } else {
        occs.forEach(function (o) {
          var done = isDone(o.ev, o.start);
          var cat = null;
          for (var ci = 0; ci < store.categories.length; ci++) {
            if (store.categories[ci].id === o.ev.catId) { cat = store.categories[ci]; break; }
          }
          html += '<div class="cal-week-task' + (done ? " is-done" : "") + '" data-id="' + o.ev.id + '" data-occ="' + ymd(o.start) + '" draggable="true"' +
            (cat ? ' style="border-left:3px solid ' + esc(cat.color) + '"' : '') + '>' +
            '<span class="cal-week-task__time">' + esc(o.ev.time || "00:00") + '</span>' +
            '<span class="cal-week-task__title">' + esc(o.ev.title) + '</span>' +
            '<button type="button" class="cal-task__check' + (done ? " is-checked" : "") + '" aria-label="완료"></button>' +
            '</div>';
        });
      }
      html += '</div>';
    }
    html += '</div></div>';
    $("cal-body").innerHTML = html;
    bindDrag();
  }

  /* ── 연간 뷰 ── */
  function renderYearly() {
    var y = cursor.getFullYear();
    var html = '<div class="cal-year-grid">';
    for (var m = 0; m < 12; m++) {
      var ms = new Date(y, m, 1);
      var me = new Date(y, m + 1, 0);
      var gs = startOfWeek(ms);
      var ge = addDays(startOfWeek(me), 6);
      var monthOccs = occsInRange(gs, ge);
      html += '<div class="cal-year-month">';
      html += '<p class="cal-year-month__name">' + MONTHS[m] + '</p>';
      html += '<div class="cal-year-mini">';
      for (var dow = 0; dow < 7; dow++) {
        html += '<span class="cal-year-mini__dow">' + DOW_KO[dow] + '</span>';
      }
      var cellDate = new Date(gs);
      while (t(cellDate) <= t(ge)) {
        var isOther = cellDate.getMonth() !== m;
        var hasDot = false;
        monthOccs.forEach(function (o) { if (sameDay(cellDate, o.start)) hasDot = true; });
        var isToday3 = sameDay(cellDate, TODAY);
        html += '<div class="cal-year-cell' + (isOther ? " is-other" : "") + (isToday3 ? " is-today" : "") + '" data-date="' + ymd(cellDate) + '">' +
          cellDate.getDate() +
          (hasDot ? '<span class="cal-year-dot"></span>' : '') +
          '</div>';
        cellDate = addDays(cellDate, 1);
      }
      html += '</div></div>';
    }
    html += '</div>';
    html += '<p class="cal-year-label">' + y + '</p>';
    $("cal-body").innerHTML = html;
  }

  function render() {
    if (view === "monthly") renderMonthly();
    else if (view === "weekly") renderWeekly();
    else if (view === "yearly") renderYearly();
    else renderDaily();
  }

  /* ── 드래그로 이동 ── */
  var dragId = null;

  function bindDrag() {
    $("cal-body").querySelectorAll("[draggable]").forEach(function (el) {
      el.addEventListener("dragstart", function (e) {
        dragId = el.dataset.id;
        e.dataTransfer.effectAllowed = "move";
        el.style.opacity = "0.4";
      });
      el.addEventListener("dragend", function () {
        el.style.opacity = "";
        dragId = null;
      });
    });

    $("cal-body").querySelectorAll("[data-date],[data-add]").forEach(function (cell) {
      cell.addEventListener("dragover", function (e) {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        cell.classList.add("drag-over");
      });
      cell.addEventListener("dragleave", function () {
        cell.classList.remove("drag-over");
      });
      cell.addEventListener("drop", function (e) {
        e.preventDefault();
        cell.classList.remove("drag-over");
        if (!dragId) return;
        var targetDate = cell.dataset.date || cell.dataset.add;
        if (!targetDate) return;
        var ev = findEvent(dragId);
        if (!ev) return;
        var dur = diffDays(parse(ev.start), parse(ev.end || ev.start));
        ev.start = targetDate;
        ev.end = ymd(addDays(parse(targetDate), dur));
        dragId = null;
        persist().then(render);
      });
    });
  }

  var editingId = null;
  var activeFilter = null; /* null = 전체 표시, { exclude: [catId, ...] } = 제외 필터 */

  /* ── 다중 날짜 선택 ── */
  var selAnchor = null; /* 드래그/Shift 기준 날짜 */
  var selFocus  = null; /* 현재 커서 날짜 */
  var selDragging = false;
  var selJustFinished = false; /* mouseup 후 click 이벤트 억제용 */

  function selRange() {
    if (!selAnchor || !selFocus) return null;
    var a = parse(selAnchor), b = parse(selFocus);
    return t(a) <= t(b) ? { start: selAnchor, end: selFocus } : { start: selFocus, end: selAnchor };
  }

  function isInSel(d) {
    var r = selRange();
    if (!r) return selAnchor && ymd(d) === selAnchor;
    return t(d) >= t(parse(r.start)) && t(d) <= t(parse(r.end));
  }

  function clearSel() { selAnchor = null; selFocus = null; selDragging = false; }

  function highlightSel() {
    document.querySelectorAll(".cal-cell").forEach(function (c) {
      if (!c.dataset.date) return;
      c.classList.toggle("is-selected", isInSel(parse(c.dataset.date)));
    });
  }
  function fillCatSelect(sel) {
    $("cm-cat").innerHTML = store.categories
      .map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + esc(c.name) + "</option>";
      })
      .join("");
  }

  function openModalNew(start, end) {
    editingId = null;
    $("cm-heading").textContent = "새 일정";
    $("cm-title").value = "";
    $("cm-memo").value = "";
    $("cm-time").value = "00:00";
    fillCatSelect(store.categories[0] && store.categories[0].id);
    $("cm-start").value = start;
    $("cm-end").value = end || start;
    $("cm-repeat").value = "none";
    $("cm-delete").style.display = "none";
    $("cal-modal").hidden = false;
  }

  function openModalEdit(id) {
    var ev = findEvent(id);
    if (!ev) return;
    editingId = id;
    $("cm-heading").textContent = "일정 수정";
    $("cm-title").value = ev.title || "";
    $("cm-memo").value = ev.memo || "";
    $("cm-time").value = ev.time || "00:00";
    fillCatSelect(ev.catId);
    $("cm-start").value = ev.start;
    $("cm-end").value = ev.end || ev.start;
    $("cm-repeat").value = ev.repeat || "none";
    $("cm-delete").style.display = "";
    $("cal-modal").hidden = false;
  }

  function closeModal() { $("cal-modal").hidden = true; }

  function saveModal() {
    var title = $("cm-title").value.trim();
    if (!title) { alert("제목을 입력하세요."); return; }
    var start = $("cm-start").value;
    var end = $("cm-end").value || start;
    if (t(parse(end)) < t(parse(start))) { var tmp = start; start = end; end = tmp; }
    var data = {
      title: title,
      memo: $("cm-memo").value.trim(),
      time: $("cm-time").value.trim() || "00:00",
      catId: $("cm-cat").value,
      start: start,
      end: end,
      repeat: $("cm-repeat").value
    };
    if (editingId) Object.assign(findEvent(editingId), data);
    else { data.id = uid(); data.doneDates = []; store.events.push(data); }
    persist().then(function () { closeModal(); render(); });
  }

  function deleteModal() {
    if (!editingId || !confirm("이 일정을 삭제할까요?")) return;
    store.events = store.events.filter(function (e) { return e.id !== editingId; });
    persist().then(function () { closeModal(); render(); });
  }

  function toggleDone(id, occ, e) {
    if (e) e.stopPropagation();
    var ev = findEvent(id);
    if (!ev) return;
    if (!Array.isArray(ev.doneDates)) ev.doneDates = [];
    var i = ev.doneDates.indexOf(occ);
    var nowDone;
    if (i >= 0) { ev.doneDates.splice(i, 1); nowDone = false; }
    else { ev.doneDates.push(occ); nowDone = true; }
    /* 즉시 UI 반영 (Firebase 저장 전) */
    if (e && e.target) {
      var row = e.target.closest(".cal-task, .cal-week-task");
      if (row) {
        row.classList.toggle("is-done", nowDone);
        var chk = row.querySelector(".cal-task__check");
        if (chk) chk.classList.toggle("is-checked", nowDone);
      }
    }
    persist().then(render);
  }

  function nav(dir) {
    cursor = addMonths(new Date(cursor.getFullYear(), cursor.getMonth(), 1), dir);
    render();
  }

  function renderCats() {
    var el = $("cal-cats");
    if (!el) return;

    /* toggle-pill 칩 (checkbox) — 체크 = 보임, 미체크 = 숨김 */
    var chips = store.categories.map(function (c) {
      var isVisible = activeFilter === null ||
        !activeFilter.exclude ||
        activeFilter.exclude.indexOf(c.id) === -1;
      return '<label class="cal-cat-label">' +
        '<input type="checkbox" class="cal-chip" value="' + esc(c.id) + '"' +
        ' data-label="' + esc(c.name) + '"' +
        ' style="--chip-color:' + esc(c.color) + '"' +
        (isVisible ? ' checked' : '') + '>' +
        '<button class="cal-cat__del" type="button" data-cat="' + c.id + '" title="삭제">×</button>' +
        '</label>';
    }).join("");

    el.innerHTML = chips +
      '<span class="cal-cat-add">' +
      '<input type="text" id="cal-cat-name" placeholder="카테고리" />' +
      '<input type="color" id="cal-cat-color" value="#c6c6c6" />' +
      '<button type="button" id="cal-cat-add">+</button>' +
      '</span>';

    /* 칩 토글 → offIds 수집 → activeFilter 갱신 → 재렌더 */
    el.querySelectorAll(".cal-chip").forEach(function (chk) {
      chk.addEventListener("change", function () {
        var offIds = [];
        el.querySelectorAll(".cal-chip").forEach(function (c) { if (!c.checked) offIds.push(c.value); });
        activeFilter = offIds.length ? { exclude: offIds } : null;
        render();
      });
    });

    /* 카테고리 추가 */
    $("cal-cat-add").addEventListener("click", function () {
      var name = $("cal-cat-name").value.trim();
      if (!name) { alert("카테고리 이름을 입력하세요."); return; }
      store.categories.push({ id: uid(), name: name, color: $("cal-cat-color").value });
      persist().then(function () { renderCats(); render(); });
    });

    /* 카테고리 삭제 */
    el.querySelectorAll(".cal-cat__del").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        if (!confirm("이 카테고리를 삭제할까요?")) return;
        store.categories = store.categories.filter(function (c) { return c.id !== b.dataset.cat; });
        persist().then(function () { renderCats(); render(); });
      });
    });
  }

  /* 필터 적용된 이벤트 반환 */
  function getVisibleEvents(evArr) {
    if (!activeFilter || !activeFilter.exclude || !activeFilter.exclude.length) return evArr;
    return evArr.filter(function (ev) {
      return activeFilter.exclude.indexOf(ev.catId || "") === -1;
    });
  }

  function bind() {
    if ($("cal-prev")) $("cal-prev").addEventListener("click", function () { nav(-1); });
    if ($("cal-next")) $("cal-next").addEventListener("click", function () { nav(1); });
    if ($("cal-today")) $("cal-today").addEventListener("click", function () { cursor = new Date(); render(); });

    document.querySelectorAll("[data-cal-view]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        setView(a.getAttribute("data-cal-view"));
      });
      a.classList.toggle("is-active", a.getAttribute("data-cal-view") === view);
    });

    $("cal-body").addEventListener("click", function (e) {
      var chk = e.target.closest(".cal-task__check");
      if (chk) {
        var row = chk.closest(".cal-task, .cal-week-task");
        if (row) toggleDone(row.dataset.id, row.dataset.occ, e);
        return;
      }
      var add = e.target.closest("[data-add]");
      if (add) { openModalNew(add.getAttribute("data-add")); return; }
      var task = e.target.closest(".cal-task[data-id], .cal-week-task[data-id]");
      if (task) { openModalEdit(task.dataset.id); return; }
      var cell = e.target.closest(".cal-cell");
      if (cell && cell.dataset.date) {
        if (selJustFinished) { selJustFinished = false; return; }
        if (e.shiftKey && selAnchor) {
          /* Shift+Click → 범위 확장 후 모달 열기 */
          selFocus = cell.dataset.date;
          var r = selRange();
          clearSel();
          highlightSel();
          if (r) openModalNew(r.start, r.end);
          return;
        }
        /* 일반 클릭: 단일 날짜 */
        clearSel();
        openModalNew(cell.dataset.date, cell.dataset.date);
        return;
      }
      var yearCell = e.target.closest(".cal-year-cell");
      if (yearCell) openModalNew(yearCell.dataset.date, yearCell.dataset.date);
      var block = e.target.closest(".cal-day-block");
      if (block && !e.target.closest(".cal-task")) openModalNew(block.dataset.date);
    });

    /* 월간 뷰 드래그 선택 */
    $("cal-body").addEventListener("mousedown", function (e) {
      if (view !== "monthly") return;
      var cell = e.target.closest(".cal-cell");
      if (!cell || !cell.dataset.date || e.target.closest(".cal-task")) return;
      if (e.shiftKey) return; /* Shift+Click은 click 핸들러에서 처리 */
      selAnchor = cell.dataset.date;
      selFocus  = cell.dataset.date;
      selDragging = true;
      highlightSel();
      e.preventDefault();
    });

    $("cal-body").addEventListener("mousemove", function (e) {
      if (!selDragging) return;
      var cell = e.target.closest(".cal-cell");
      if (!cell || !cell.dataset.date) return;
      if (cell.dataset.date === selFocus) return;
      selFocus = cell.dataset.date;
      highlightSel();
    });

    document.addEventListener("mouseup", function (e) {
      if (!selDragging) return;
      selDragging = false;
      var r = selRange();
      if (r && r.start !== r.end) {
        /* 다중 날짜 선택 완료 → 모달 열기 */
        clearSel();
        highlightSel();
        selJustFinished = true;
        openModalNew(r.start, r.end);
      } else {
        /* 단일 날짜: click 핸들러가 처리하므로 여기서 초기화만 */
        clearSel();
        highlightSel();
      }
    });

    $("cm-save").addEventListener("click", saveModal);
    $("cm-delete").addEventListener("click", deleteModal);
    $("cm-close").addEventListener("click", closeModal);
    $("cal-modal").addEventListener("click", function (e) { if (e.target === $("cal-modal")) closeModal(); });

    $("cal-export").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "calendar.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("cal-import").addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          store = JSON.parse(fr.result);
          persist().then(function () { render(); alert("불러왔습니다."); });
        } catch (e) { alert("JSON을 읽을 수 없습니다."); }
      };
      fr.readAsText(f);
    });
  }

  loadStore().then(function (data) {
    store.categories = (data && data.categories) || [{ id: "day", name: "일상", color: "#c6c6c6" }];
    store.events = (data && data.events) || [];
    store.events.forEach(function (ev) {
      if (!Array.isArray(ev.doneDates)) {
        if (ev.done) {
          ev.doneDates = [ev.start];
        } else if (ev.doneDates && typeof ev.doneDates === "object") {
          /* Firebase가 배열을 객체로 반환할 때 복원 */
          ev.doneDates = Object.keys(ev.doneDates).sort().map(function (k) { return ev.doneDates[k]; });
        } else {
          ev.doneDates = [];
        }
      }
      delete ev.done;
    });
    bind();
    renderCats();
    render();
  });
})();
