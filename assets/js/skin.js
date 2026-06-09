/* skin.js — Skin Editor (avocado_skin 구조 참조, Firebase 저장) */
(function () {
  "use strict";

  var root = document.documentElement.getAttribute("data-root") || "../";

  /* ── 상태 ── */
  var state = {
    board:     "notice",
    view:      "list",
    spacing:   "normal",     /* compact | normal | spacious */
    itemStyle: "line",       /* line | box | minimal */
    fontWeight:"normal",     /* normal | heavy */
    showCat:   true,
    showDate:  true,
    showName:  true
  };

  /* ── 보드별 더미 데이터 ── */
  var DUMMY = {
    notice: {
      list: [
        { cat: "NOTICE", subject: "사이트 오픈 안내", name: "admin", date: "06.01" },
        { cat: "NOTICE", subject: "게시판 이용 규칙", name: "admin", date: "05.28" },
        { cat: "EVENT",  subject: "6월 이벤트 안내", name: "admin", date: "05.25" }
      ],
      view: {
        cat: "NOTICE",
        title: "사이트 오픈 안내",
        name: "admin",
        date: "2026.06.01",
        body: "안녕하세요.\n사이트가 오픈되었습니다.\n많은 이용 부탁드립니다."
      }
    },
    log: {
      list: [
        { cat: "",     subject: "오늘의 기록", name: "admin", date: "06.08" },
        { cat: "",     subject: "어제의 기록", name: "admin", date: "06.07" },
        { cat: "",     subject: "이틀 전 기록", name: "admin", date: "06.06" }
      ],
      view: {
        cat: "",
        title: "오늘의 기록",
        name: "admin",
        date: "2026.06.08",
        body: "오늘도 평온한 하루를 보냈다.\n조용한 아침, 커피 한 잔."
      }
    },
    memo: {
      list: [
        { cat: "IDEA",  subject: "메모 제목 예시", name: "admin", date: "06.08" },
        { cat: "TODO",  subject: "해야 할 일 목록", name: "admin", date: "06.07" },
        { cat: "IDEA",  subject: "아이디어 스케치", name: "admin", date: "06.06" }
      ],
      view: {
        cat: "IDEA",
        title: "메모 제목 예시",
        name: "admin",
        date: "2026.06.08",
        body: "여기에 메모 내용이 들어갑니다.\n간단하게 적어두는 노트."
      }
    },
    guest: {
      list: [
        { cat: "",     subject: "방문했어요 :)", name: "visitor", date: "06.08" },
        { cat: "",     subject: "잘 보고 갑니다", name: "guest01", date: "06.07" },
        { cat: "",     subject: "또 올게요",       name: "guest02", date: "06.06" }
      ],
      view: {
        cat: "",
        title: "방문했어요 :)",
        name: "visitor",
        date: "2026.06.08",
        body: "안녕하세요! 예쁜 사이트네요.\n또 놀러 올게요 :-)"
      }
    },
    archive: {
      list: [
        { cat: "MUSIC",  subject: "오늘의 앨범 추천", name: "admin", date: "06.08" },
        { cat: "ANIME",  subject: "이번 달 애니 정주행", name: "admin", date: "06.07" },
        { cat: "MOVIE",  subject: "최근 감명 깊은 영화", name: "admin", date: "06.06" }
      ],
      view: {
        cat: "MUSIC",
        title: "오늘의 앨범 추천",
        name: "admin",
        date: "2026.06.08",
        body: "오늘은 이 앨범을 소개합니다.\n분위기 있는 음악과 함께."
      }
    }
  };

  /* ── 데이터 로드/저장 ── */
  function loadState() {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch("skin").then(function (val) {
        if (val) {
          Object.keys(val).forEach(function (k) {
            if (k in state) state[k] = val[k];
          });
        }
        return state;
      });
    }
    return Promise.resolve(state);
  }

  function saveState() {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.push("skin", state);
    }
    return Promise.resolve(true);
  }

  /* ── 미리보기 렌더 ── */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderListPreview() {
    var el = document.getElementById("skin-list-body");
    if (!el) return;
    var data = DUMMY[state.board] || DUMMY.notice;
    var items = data.list || [];

    var html = '<ul class="avocado-list">';
    items.forEach(function (item) {
      html += '<li><a href="#">';
      if (state.showCat) {
        html += '<span class="avo-cat">' + esc(item.cat) + '</span>';
      }
      html += '<span class="avo-subject">' + esc(item.subject) + '</span>';
      html += '<span class="avo-meta">';
      if (state.showName) html += '<span>' + esc(item.name) + '</span>';
      if (state.showDate) html += '<span>' + esc(item.date) + '</span>';
      html += '</span>';
      html += '</a></li>';
    });
    html += '</ul>';
    el.innerHTML = html;
  }

  function renderViewPreview() {
    var el = document.getElementById("skin-view-body");
    if (!el) return;
    var data = (DUMMY[state.board] || DUMMY.notice).view || {};

    el.innerHTML =
      '<div class="viewer-subject">' +
        (data.cat ? '<span class="viewer-cat">' + esc(data.cat) + '</span>' : '') +
        '<h2 class="viewer-title">' + esc(data.title) + '</h2>' +
      '</div>' +
      '<div class="viewer-info">' +
        '<span>' + esc(data.name) + '</span>' +
        '<span>' + esc(data.date) + '</span>' +
      '</div>' +
      '<div class="viewer-body">' + esc(data.body) + '</div>';
  }

  function renderWritePreview() {
    var el = document.getElementById("skin-write-body");
    if (!el) return;
    el.innerHTML =
      '<dl class="write-field">' +
        '<dt>CATEGORY</dt>' +
        '<dd><select class="write-select"><option>선택하세요</option><option>공지</option><option>이벤트</option></select></dd>' +
      '</dl>' +
      '<dl class="write-field">' +
        '<dt>SUBJECT</dt>' +
        '<dd><input type="text" class="write-input" placeholder="제목을 입력하세요" /></dd>' +
      '</dl>' +
      '<dl class="write-field">' +
        '<dt>CONTENT</dt>' +
        '<dd><textarea class="write-textarea" placeholder="내용을 입력하세요"></textarea></dd>' +
      '</dl>' +
      '<div class="write-actions">' +
        '<button type="button" class="write-btn primary">PUBLISH</button>' +
        '<button type="button" class="write-btn">DRAFT</button>' +
        '<button type="button" class="write-btn">CANCEL</button>' +
      '</div>';
  }

  function applyPreviewAttrs() {
    var preview = document.getElementById("skin-preview");
    if (!preview) return;
    preview.setAttribute("data-view",        state.view);
    preview.setAttribute("data-spacing",     state.spacing);
    preview.setAttribute("data-item-style",  state.itemStyle);
    preview.setAttribute("data-font-weight", state.fontWeight);

    /* 보드 레이블 */
    var boardLabel = document.getElementById("skin-preview-board-label");
    if (boardLabel) boardLabel.textContent = state.board.toUpperCase();
  }

  function renderAll() {
    applyPreviewAttrs();
    renderListPreview();
    renderViewPreview();
    renderWritePreview();
    syncControls();
  }

  /* ── 컨트롤 동기화 ── */
  function syncControls() {
    /* 보드 버튼 */
    document.querySelectorAll(".skin-board-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-board") === state.board);
    });

    /* 뷰 버튼 */
    document.querySelectorAll(".skin-view-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === state.view);
    });

    /* 라디오 */
    syncRadio("skin-spacing",   state.spacing);
    syncRadio("skin-itemstyle", state.itemStyle);
    syncRadio("skin-fontweight",state.fontWeight);

    /* 토글 */
    syncToggle("skin-showcat",  state.showCat);
    syncToggle("skin-showdate", state.showDate);
    syncToggle("skin-showname", state.showName);
  }

  function syncRadio(name, val) {
    var els = document.querySelectorAll('input[name="' + name + '"]');
    els.forEach(function (el) {
      el.checked = (el.value === val);
    });
  }

  function syncToggle(id, val) {
    var el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  /* ── 이벤트 바인딩 ── */
  function bind() {
    /* 보드 선택 */
    document.querySelectorAll(".skin-board-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.board = btn.getAttribute("data-board");
        renderAll();
      });
    });

    /* 뷰 선택 */
    document.querySelectorAll(".skin-view-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.getAttribute("data-view");
        renderAll();
      });
    });

    /* 라디오 변경 */
    document.querySelectorAll('input[name="skin-spacing"]').forEach(function (el) {
      el.addEventListener("change", function () {
        state.spacing = el.value;
        applyPreviewAttrs();
      });
    });

    document.querySelectorAll('input[name="skin-itemstyle"]').forEach(function (el) {
      el.addEventListener("change", function () {
        state.itemStyle = el.value;
        applyPreviewAttrs();
      });
    });

    document.querySelectorAll('input[name="skin-fontweight"]').forEach(function (el) {
      el.addEventListener("change", function () {
        state.fontWeight = el.value;
        applyPreviewAttrs();
      });
    });

    /* 토글 */
    var showCatEl = document.getElementById("skin-showcat");
    if (showCatEl) showCatEl.addEventListener("change", function () {
      state.showCat = showCatEl.checked;
      renderListPreview();
    });

    var showDateEl = document.getElementById("skin-showdate");
    if (showDateEl) showDateEl.addEventListener("change", function () {
      state.showDate = showDateEl.checked;
      renderListPreview();
    });

    var showNameEl = document.getElementById("skin-showname");
    if (showNameEl) showNameEl.addEventListener("change", function () {
      state.showName = showNameEl.checked;
      renderListPreview();
    });

    /* 저장 */
    var saveBtn = document.getElementById("skin-save");
    var statusEl = document.getElementById("skin-status");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        saveState().then(function () {
          if (statusEl) {
            statusEl.textContent = "저장되었습니다.";
            setTimeout(function () { statusEl.textContent = ""; }, 2200);
          }
        });
      });
    }
  }

  /* ── 부트 ── */
  function boot() {
    loadState().then(function () {
      renderAll();
      bind();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
