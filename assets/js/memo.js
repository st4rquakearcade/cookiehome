(function () {
  "use strict";

  var root = document.documentElement.getAttribute("data-root") || "../";

  /* ── 유틸 ── */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtDate(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return pad2(d.getMonth() + 1) + "." + pad2(d.getDate());
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ── 마크다운 파서 (최소 구현) ── */
  function parseMarkdown(md) {
    if (!md) return "";
    var lines = md.split("\n");
    var html = "";
    var inList = false;
    lines.forEach(function (line) {
      if (/^## /.test(line)) {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<strong>" + esc(line.slice(3)) + "</strong><br>";
      } else if (/^# /.test(line)) {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<strong>" + esc(line.slice(2)) + "</strong><br>";
      } else if (/^- /.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inlineFormat(line.slice(2)) + "</li>";
      } else if (line.trim() === "") {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<p>" + inlineFormat(line) + "</p>";
      }
    });
    if (inList) html += "</ul>";
    return html;
  }

  function inlineFormat(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  /* 본문에서 #태그 추출 */
  function extractTags(content) {
    var tags = [];
    var seen = {};
    var matches = (content || "").match(/#([a-zA-Z가-힣0-9_]+)/g) || [];
    matches.forEach(function (m) {
      var t = m.slice(1).toLowerCase();
      if (!seen[t]) { seen[t] = true; tags.push(t); }
    });
    return tags;
  }

  /* ── 스토어 ── */
  var store = { memos: [] };
  var isAdmin = sessionStorage.getItem("sq_auth") === "ok";

  function loadStore() {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch("memo").then(function (val) {
        if (val && val.memos) return val;
        return fetchJson();
      });
    }
    return fetchJson();
  }

  function fetchJson() {
    return fetch(root + "data/memo.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { memos: [] }; })
      .catch(function () { return { memos: [] }; });
  }

  function persist() {
    if (window.SQDb && SQDb.ready()) return SQDb.push("memo", store);
    return Promise.resolve(true);
  }

  function findMemo(id) {
    for (var i = 0; i < store.memos.length; i++) if (store.memos[i].id === id) return store.memos[i];
    return null;
  }

  /* ── 상태 ── */
  var searchQuery = "";
  var activeTag   = null;
  var selected    = {};  /* id → true */
  var dragSrcId   = null;

  /* ── DOM refs ── */
  var grid       = document.getElementById("memo-grid");
  var searchEl   = document.getElementById("memo-search");
  var tagsEl     = document.getElementById("memo-tags");
  var bulkBar    = document.getElementById("memo-bulk");
  var bulkCount  = document.getElementById("memo-bulk-count");
  var tagEditEl  = document.getElementById("memo-tag-edit");
  var tagEditInp = document.getElementById("memo-tag-edit-input");

  /* ── 렌더 ── */
  function getFiltered() {
    var q = searchQuery.toLowerCase();
    return store.memos.filter(function (m) {
      if (activeTag && (m.tags || []).indexOf(activeTag) === -1) return false;
      if (q && (m.title || "").toLowerCase().indexOf(q) === -1 &&
               (m.content || "").toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function renderTags() {
    var all = {};
    store.memos.forEach(function (m) {
      (m.tags || []).forEach(function (t) { all[t] = true; });
    });
    var tags = Object.keys(all).sort();
    if (!tags.length) { tagsEl.innerHTML = ""; return; }
    tagsEl.innerHTML = tags.map(function (t) {
      return '<button type="button" class="memo-tag-btn' + (activeTag === t ? " is-active" : "") + '" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
    }).join("");
    tagsEl.querySelectorAll(".memo-tag-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeTag = activeTag === btn.dataset.tag ? null : btn.dataset.tag;
        render();
      });
    });
  }

  function renderCard(memo) {
    var el = document.createElement("article");
    el.className = "memo-card" +
      (memo.pinned ? " is-pinned" : "") +
      (selected[memo.id] ? " is-selected" : "");
    el.setAttribute("data-id", memo.id);
    el.setAttribute("draggable", "true");

    var tagHtml = (memo.tags || []).map(function (t) {
      return '<span class="memo-card__tag">#' + esc(t) + '</span>';
    }).join("");

    el.innerHTML =
      '<button type="button" class="memo-card__pin" title="' + (memo.pinned ? "고정 해제" : "고정") + '">★</button>' +
      '<h2 class="memo-card__title">' + esc(memo.title || "제목 없음") + '</h2>' +
      '<div class="memo-card__body">' + parseMarkdown(memo.content) + '</div>' +
      '<footer class="memo-card__foot">' +
        '<div class="memo-card__tags">' + tagHtml + '</div>' +
        '<time class="memo-card__date">' + fmtDate(memo.updatedAt || memo.createdAt) + '</time>' +
      '</footer>';

    /* 핀 버튼 */
    el.querySelector(".memo-card__pin").addEventListener("click", function (e) {
      e.stopPropagation();
      memo.pinned = !memo.pinned;
      persist().then(render);
    });

    /* 더블클릭 → 편집 */
    el.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      startEdit(el, memo);
    });

    /* Shift+클릭 or 클릭 → 선택 */
    el.addEventListener("click", function (e) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (selected[memo.id]) delete selected[memo.id];
        else selected[memo.id] = true;
        el.classList.toggle("is-selected", !!selected[memo.id]);
        updateBulk();
      }
    });

    /* 드래그 정렬 */
    el.addEventListener("dragstart", function (e) {
      dragSrcId = memo.id;
      el.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", function () {
      el.classList.remove("is-dragging");
      grid.querySelectorAll(".drag-over").forEach(function (x) { x.classList.remove("drag-over"); });
    });
    el.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (dragSrcId !== memo.id) el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", function () { el.classList.remove("drag-over"); });
    el.addEventListener("drop", function (e) {
      e.preventDefault();
      el.classList.remove("drag-over");
      if (dragSrcId && dragSrcId !== memo.id) {
        moveMemo(dragSrcId, memo.id);
      }
    });

    return el;
  }

  function moveMemo(fromId, toId) {
    var fi = -1, ti = -1;
    store.memos.forEach(function (m, i) {
      if (m.id === fromId) fi = i;
      if (m.id === toId)   ti = i;
    });
    if (fi === -1 || ti === -1) return;
    var moved = store.memos.splice(fi, 1)[0];
    var insertAt = ti > fi ? ti - 1 : ti;
    store.memos.splice(insertAt, 0, moved);
    persist().then(render);
  }

  function render() {
    renderTags();
    var list = getFiltered();
    grid.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "memo-empty";
      empty.textContent = "메모가 없습니다. N 키를 눌러 새 메모를 작성하세요.";
      grid.appendChild(empty);
      return;
    }
    list.forEach(function (memo) {
      grid.appendChild(renderCard(memo));
    });
  }

  /* ── 편집 모드 ── */
  var editingId = null;

  function startEdit(cardEl, memo) {
    if (editingId === memo.id) return;
    cancelEdit();
    editingId = memo.id;
    cardEl.classList.add("memo-card--editing");
    cardEl.innerHTML =
      '<input class="memo-edit__title" value="' + esc(memo.title || "") + '" placeholder="제목" />' +
      '<textarea class="memo-edit__content" placeholder="내용을 입력하세요... (#태그 포함 가능)">' + esc(memo.content || "") + '</textarea>' +
      '<span class="memo-edit__hint">Ctrl+Enter 저장 · Esc 취소</span>';

    var titleEl   = cardEl.querySelector(".memo-edit__title");
    var contentEl = cardEl.querySelector(".memo-edit__content");
    autoResize(contentEl);
    contentEl.addEventListener("input", function () { autoResize(contentEl); });
    titleEl.focus();

    function save() {
      var t = titleEl.value.trim();
      var c = contentEl.value;
      memo.title = t || "제목 없음";
      memo.content = c;
      memo.tags = extractTags(c);
      memo.updatedAt = Date.now();
      editingId = null;
      persist().then(render);
    }

    [titleEl, contentEl].forEach(function (inp) {
      inp.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); save(); }
        if (e.key === "Escape") { e.preventDefault(); cancelEdit(); render(); }
      });
    });
  }

  function cancelEdit() {
    editingId = null;
    var editing = grid.querySelector(".memo-card--editing");
    if (editing) {
      var id = editing.getAttribute("data-id");
      if (id) {
        var memo = findMemo(id);
        if (memo) {
          var fresh = renderCard(memo);
          editing.parentNode.replaceChild(fresh, editing);
        }
      }
    }
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  /* ── 새 메모 ── */
  function newMemo() {
    cancelEdit();
    var memo = { id: uid(), title: "", content: "", tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
    store.memos.unshift(memo);

    var cardEl = renderCard(memo);
    cardEl.classList.add("memo-card--new");
    grid.insertBefore(cardEl, grid.firstChild);
    startEdit(cardEl, memo);
    /* 새 메모는 제목에 포커스 */
    var titleInp = cardEl.querySelector(".memo-edit__title");
    if (titleInp) titleInp.focus();
  }

  /* ── 불크 선택 ── */
  function updateBulk() {
    var count = Object.keys(selected).length;
    if (count > 0) {
      bulkCount.textContent = count + "개 선택";
      bulkBar.classList.add("is-visible");
    } else {
      bulkBar.classList.remove("is-visible");
    }
  }

  function clearSelection() {
    selected = {};
    grid.querySelectorAll(".memo-card.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
    bulkBar.classList.remove("is-visible");
  }

  /* 불크 태그 편집 */
  function openTagEdit() {
    var ids = Object.keys(selected);
    if (!ids.length) return;
    /* 공통 태그 수집 */
    var firstTags = (findMemo(ids[0]) || {}).tags || [];
    tagEditInp.value = firstTags.map(function (t) { return "#" + t; }).join(" ");
    tagEditEl.classList.add("is-open");
    tagEditInp.focus();
  }

  function applyTagEdit() {
    var raw = tagEditInp.value;
    var newTags = extractTags(raw);
    Object.keys(selected).forEach(function (id) {
      var m = findMemo(id);
      if (m) { m.tags = newTags; m.updatedAt = Date.now(); }
    });
    tagEditEl.classList.remove("is-open");
    clearSelection();
    persist().then(render);
  }

  /* ── 키보드 단축키 ── */
  document.addEventListener("keydown", function (e) {
    var tag = e.target.tagName;
    var isInput = tag === "INPUT" || tag === "TEXTAREA";

    if (!isInput && e.key === "n") { e.preventDefault(); newMemo(); return; }
    if (!isInput && e.key === "/") { e.preventDefault(); searchEl.focus(); return; }
    if (e.key === "Escape") {
      if (tagEditEl.classList.contains("is-open")) { tagEditEl.classList.remove("is-open"); return; }
      if (editingId) { cancelEdit(); render(); return; }
      clearSelection();
    }
  });

  /* ── 바인드 ── */
  function bind() {
    /* 검색 */
    searchEl.addEventListener("input", function () {
      searchQuery = searchEl.value;
      render();
    });

    /* 새 메모 버튼 */
    var newBtn = document.getElementById("memo-new-btn");
    if (newBtn) newBtn.addEventListener("click", newMemo);

    /* 불크 바 버튼 */
    var bulkTagBtn = document.getElementById("memo-bulk-tag");
    var bulkDelBtn = document.getElementById("memo-bulk-del");
    var bulkClrBtn = document.getElementById("memo-bulk-clr");
    if (bulkTagBtn) bulkTagBtn.addEventListener("click", openTagEdit);
    if (bulkDelBtn) bulkDelBtn.addEventListener("click", function () {
      if (!confirm("선택한 메모를 삭제할까요?")) return;
      var ids = Object.keys(selected);
      store.memos = store.memos.filter(function (m) { return ids.indexOf(m.id) === -1; });
      clearSelection();
      persist().then(render);
    });
    if (bulkClrBtn) bulkClrBtn.addEventListener("click", clearSelection);

    /* 태그 편집 팝업 */
    var tagApplyBtn = document.getElementById("memo-tag-edit-apply");
    var tagCancelBtn = document.getElementById("memo-tag-edit-cancel");
    if (tagApplyBtn) tagApplyBtn.addEventListener("click", applyTagEdit);
    if (tagCancelBtn) tagCancelBtn.addEventListener("click", function () {
      tagEditEl.classList.remove("is-open");
    });
    if (tagEditInp) tagEditInp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyTagEdit(); }
    });

    /* 빈 영역 클릭 → 선택 해제 */
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".memo-card") && !e.target.closest(".memo-bulk")) {
        clearSelection();
      }
    });
  }

  /* ── 부트 ── */
  function boot() {
    loadStore().then(function (data) {
      store.memos = (data && data.memos) || [];
      bind();
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
