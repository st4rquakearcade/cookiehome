(function () {
  "use strict";

  var root = document.documentElement.getAttribute("data-root") || "../";
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var CATS = [
    { id: "music",      label: "MUSIC" },
    { id: "anime",      label: "ANIME" },
    { id: "movie",      label: "MOVIE" },
    { id: "drama",      label: "DRAMA" },
    { id: "literature", label: "LIT." },
    { id: "ect",        label: "ECT." }
  ];

  var store = { items: [] };
  var currentCat = "music";
  var detailItem = null;

  /* ── 데이터 로드 ── */
  function loadData() {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch("archive").then(function (val) {
        return (val && val.items) ? val : fetchJson();
      });
    }
    return fetchJson();
  }

  function fetchJson() {
    return fetch(root + "data/archive.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .catch(function () { return { items: [] }; });
  }

  function persist() {
    if (window.SQDb && SQDb.ready()) return SQDb.push("archive", store);
    return Promise.resolve(true);
  }

  /* ── 카테고리 탭 ── */
  function renderNav() {
    var el = document.getElementById("arc-nav");
    if (!el) return;
    el.innerHTML = CATS.map(function (c) {
      return '<button type="button" class="arc-nav__btn' + (c.id === currentCat ? " is-active" : "") + '" data-cat="' + c.id + '">' + c.label + '</button>';
    }).join("");

    el.querySelectorAll(".arc-nav__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCategory(btn.getAttribute("data-cat"));
      });
    });
  }

  function setCategory(cat) {
    currentCat = cat;

    /* 탭 활성화 갱신 */
    document.querySelectorAll(".arc-nav__btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-cat") === cat);
    });

    /* 뮤직 시각화 영역 토글 */
    var visWrap = document.getElementById("arc-vis-wrap");
    if (visWrap) visWrap.style.display = (cat === "music") ? "" : "none";

    renderItems();
  }

  /* ── 아이템 렌더 ── */
  function renderItems() {
    var grid = document.getElementById("arc-grid");
    if (!grid) return;

    var list = store.items.filter(function (it) { return it.category === currentCat; });

    if (!list.length) {
      grid.innerHTML = '<p class="arc-empty">아직 기록이 없습니다.</p>';
      return;
    }

    grid.innerHTML = list.map(function (item) {
      var isMusicCat = item.category === "music";
      var coverHtml = item.cover || item.image
        ? '<img src="' + esc(item.cover || item.image) + '" alt="' + esc(item.title) + '" />'
        : '<span class="arc-item__cover-placeholder">IMAGE</span>';

      var sub = isMusicCat
        ? esc(item.artist || "")
        : (item.author ? esc(item.author) : esc(item.year || ""));

      return '<article class="arc-item' + (isMusicCat ? ' arc-item--music' : '') + '" data-id="' + esc(item.id) + '">' +
        '<div class="arc-item__cover">' + coverHtml + '<div class="arc-item__overlay"></div></div>' +
        '<div class="arc-item__meta">' +
          '<p class="arc-item__title">' + esc(item.title) + '</p>' +
          (sub ? '<p class="arc-item__sub">' + sub + '</p>' : '') +
          renderRatingHtml(item) +
          (item.note ? '<p class="arc-item__note">' + esc(item.note) + '</p>' : '') +
        '</div>' +
      '</article>';
    }).join("");

    /* 스타 버튼 이벤트 */
    grid.querySelectorAll(".arc-rating__star").forEach(function (star) {
      star.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = star.closest("[data-id]").getAttribute("data-id");
        var n = parseInt(star.getAttribute("data-n"), 10);
        setRating(id, n);
      });
    });

    /* 아이템 클릭 → 상세 패널 */
    grid.querySelectorAll(".arc-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-id");
        openDetail(id);
      });
    });

    /* 스태거 애니메이션 */
    animateIn(grid.querySelectorAll(".arc-item"));
  }

  function renderRatingHtml(item) {
    var n = item.rating || 0;
    var stars = "";
    for (var i = 1; i <= 5; i++) {
      stars += '<button type="button" class="arc-rating__star' + (i <= n ? " is-filled" : "") + '" data-n="' + i + '" aria-label="' + i + '점">★</button>';
    }
    return '<div class="arc-rating">' + stars + '</div>';
  }

  function findItem(id) {
    for (var i = 0; i < store.items.length; i++) if (store.items[i].id === id) return store.items[i];
    return null;
  }

  function setRating(id, n) {
    var item = findItem(id);
    if (!item) return;
    item.rating = n;
    persist().then(function () { renderItems(); });
  }

  /* ── 스태거 애니메이션 ── */
  function animateIn(els) {
    els = Array.prototype.slice.call(els);
    /* 초기 상태는 CSS에서 opacity:0, translateY(16px) */
    els.forEach(function (el, i) {
      el.style.transitionDelay = (i * 60) + "ms";
      /* 다음 프레임에서 is-visible 추가 */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.add("is-visible");
        });
      });
    });
  }

  /* ── 상세 패널 ── */
  function openDetail(id) {
    var item = findItem(id);
    if (!item) return;
    detailItem = item;

    var panel = document.getElementById("arc-detail");
    var body  = document.getElementById("arc-detail-body");
    if (!panel || !body) return;

    var isMusicCat = item.category === "music";
    var coverHtml = item.cover || item.image
      ? '<img src="' + esc(item.cover || item.image) + '" alt="' + esc(item.title) + '" />'
      : '';
    var sub = isMusicCat
      ? esc(item.artist || "")
      : (item.author ? esc(item.author) : esc(item.year || ""));

    var audioHtml = isMusicCat
      ? '<div class="arc-audio">' +
          '<div class="arc-audio__url">' +
            '<input type="url" id="arc-audio-url" placeholder="오디오 URL (https://...)" value="' + esc(item.url || "") + '" />' +
            '<button type="button" id="arc-audio-set">재생</button>' +
          '</div>' +
          '<div class="arc-audio__player" id="arc-audio-player">' +
            (item.url ? '<audio id="arc-audio-el" controls src="' + esc(item.url) + '"></audio>' : '') +
          '</div>' +
        '</div>'
      : '';

    var commentHtml =
      '<div class="arc-comments">' +
        '<p class="arc-comments__label">COMMENTS</p>' +
        '<ul class="arc-comment-list" id="arc-comment-list"></ul>' +
        '<form class="arc-comment-form" id="arc-comment-form">' +
          '<input type="text" id="arc-cmt-author" placeholder="NAME" maxlength="40" autocomplete="off" />' +
          '<textarea id="arc-cmt-text" placeholder="댓글을 입력하세요..." rows="3"></textarea>' +
          '<button type="submit" class="arc-comment-form__submit">ADD</button>' +
        '</form>' +
      '</div>';

    body.innerHTML =
      '<div class="arc-detail__cover' + (isMusicCat ? ' arc-detail--music' : '') + '">' + coverHtml + '</div>' +
      '<p class="arc-detail__title">' + esc(item.title) + '</p>' +
      (sub ? '<p class="arc-detail__sub">' + sub + '</p>' : '') +
      '<div class="arc-detail__rating">' + renderRatingHtml(item) + '</div>' +
      (item.note ? '<p class="arc-detail__note">' + esc(item.note) + '</p>' : '') +
      audioHtml +
      commentHtml;

    /* 상세 별점 이벤트 */
    body.querySelectorAll(".arc-rating__star").forEach(function (star) {
      star.addEventListener("click", function () {
        var n = parseInt(star.getAttribute("data-n"), 10);
        setRating(item.id, n);
        /* 상세 패널 별점도 갱신 */
        body.querySelectorAll(".arc-rating__star").forEach(function (s, si) {
          s.classList.toggle("is-filled", (si + 1) <= n);
        });
      });
    });

    /* 뮤직: 오디오 URL 설정 */
    var urlInput = document.getElementById("arc-audio-url");
    var audioSet = document.getElementById("arc-audio-set");
    if (urlInput && audioSet) {
      audioSet.addEventListener("click", function () {
        var url = urlInput.value.trim();
        item.url = url;
        persist();
        var playerDiv = document.getElementById("arc-audio-player");
        if (playerDiv) {
          playerDiv.innerHTML = url
            ? '<audio id="arc-audio-el" controls src="' + esc(url) + '"></audio>'
            : '';
          var audioEl = document.getElementById("arc-audio-el");
          if (audioEl) connectVisualizer(audioEl);
        }
      });
    }

    /* 기존 오디오 연결 */
    requestAnimationFrame(function () {
      var audioEl = document.getElementById("arc-audio-el");
      if (audioEl) connectVisualizer(audioEl);
    });

    /* 댓글 로드 & 폼 바인드 */
    var commentList = document.getElementById("arc-comment-list");
    var commentForm = document.getElementById("arc-comment-form");
    if (commentList) loadComments(item.id, commentList);
    if (commentForm) {
      commentForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var author = (document.getElementById("arc-cmt-author").value || "").trim();
        var text   = (document.getElementById("arc-cmt-text").value || "").trim();
        if (!text) return;
        if (!author) author = "익명";
        addComment(item.id, author, text, commentList);
        commentForm.reset();
      });
    }

    panel.classList.add("is-open");
  }

  function closeDetail() {
    var panel = document.getElementById("arc-detail");
    if (panel) panel.classList.remove("is-open");
    detailItem = null;
  }

  /* ── 오디오 시각화 ── */
  var audioCtx = null;
  var analyserNode = null;
  var connectedAudio = null;
  var visRAF = null;
  var idleRAF = null;

  function initVisualizer() {
    var canvas = document.getElementById("arc-vis-canvas");
    if (!canvas) return;

    /* 캔버스 DPI */
    function resize() {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    /* 아이들 애니메이션 */
    startIdleAnimation(canvas);
  }

  function startIdleAnimation(canvas) {
    if (idleRAF) cancelAnimationFrame(idleRAF);
    var ctx = canvas.getContext("2d");
    var t = 0;
    var BARS = 32;

    function draw() {
      var w = canvas.width;
      var h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      var barW = Math.floor(w / BARS) - 1;
      var dpr = window.devicePixelRatio || 1;
      for (var i = 0; i < BARS; i++) {
        /* 아이들: 사인파 기반 높이 */
        var phase = (i / BARS) * Math.PI * 2;
        var amp = 0.15 + 0.12 * Math.abs(Math.sin(t * 0.8 + phase));
        var barH = h * amp;
        var x = i * (w / BARS);
        var y = (h - barH) / 2;
        ctx.fillStyle = "#c6c6c6";
        ctx.fillRect(x, y, barW, barH);
      }
      t += 0.04;
      idleRAF = requestAnimationFrame(draw);
    }
    draw();
  }

  function connectVisualizer(audioEl) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    if (connectedAudio === audioEl) return; /* 이미 연결됨 */

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (connectedAudio) {
        /* 기존 연결 해제는 불가 (Web Audio 특성) — 새 analyser 사용 */
      }
      var source = audioCtx.createMediaElementSource(audioEl);
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
      connectedAudio = audioEl;

      /* 아이들 중지 후 주파수 시각화 시작 */
      if (idleRAF) { cancelAnimationFrame(idleRAF); idleRAF = null; }
      startFreqAnimation();
    } catch (e) {
      /* createMediaElementSource는 동일 element에 한 번만 사용 가능 — 무시 */
    }
  }

  function startFreqAnimation() {
    var canvas = document.getElementById("arc-vis-canvas");
    if (!canvas || !analyserNode) return;
    if (visRAF) cancelAnimationFrame(visRAF);

    var ctx = canvas.getContext("2d");
    var bufLen = analyserNode.frequencyBinCount;
    var dataArr = new Uint8Array(bufLen);

    function draw() {
      visRAF = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArr);

      var w = canvas.width;
      var h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      var barW = Math.floor(w / bufLen) - 1;
      for (var i = 0; i < bufLen; i++) {
        var v = dataArr[i] / 255;
        var barH = h * v;
        ctx.fillStyle = v > 0.7 ? "#5e5e5e" : "#c6c6c6";
        ctx.fillRect(i * (w / bufLen), h - barH, barW, barH);
      }
    }
    draw();
  }

  /* ── 댓글 ── */
  function loadComments(itemId, listEl) {
    if (!window.SQDb || !SQDb.ready()) { renderComments([], listEl); return; }
    SQDb.fetch("archive-comments").then(function (val) {
      var bucket = (val && val[itemId]) ? val[itemId] : [];
      if (!Array.isArray(bucket)) bucket = Object.keys(bucket).map(function (k) { return bucket[k]; });
      bucket.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      renderComments(bucket, listEl);
    }).catch(function () { renderComments([], listEl); });
  }

  function renderComments(arr, listEl) {
    if (!arr.length) {
      listEl.innerHTML = '<li class="arc-comment-empty">아직 댓글이 없습니다.</li>';
      return;
    }
    listEl.innerHTML = arr.map(function (c) {
      return '<li class="arc-comment-item">' +
        '<p class="arc-comment-item__author">' + esc(c.author || "?") + '</p>' +
        '<p class="arc-comment-item__text">' + esc(c.text || "") + '</p>' +
        '</li>';
    }).join("");
  }

  function addComment(itemId, author, text, listEl) {
    if (!window.SQDb || !SQDb.ready()) return;
    SQDb.fetch("archive-comments").then(function (val) {
      var all = val || {};
      var bucket = all[itemId] ? all[itemId] : [];
      if (!Array.isArray(bucket)) bucket = Object.keys(bucket).map(function (k) { return bucket[k]; });
      bucket.push({ id: uid(), author: author, text: text, createdAt: Date.now() });
      all[itemId] = bucket;
      return SQDb.push("archive-comments", all).then(function () {
        renderComments(bucket, listEl);
      });
    });
  }

  /* ── 바인드 ── */
  function bind() {
    /* 상세 패널 닫기 */
    var backdrop = document.getElementById("arc-detail-backdrop");
    var closeBtn = document.getElementById("arc-detail-close");
    if (backdrop) backdrop.addEventListener("click", closeDetail);
    if (closeBtn) closeBtn.addEventListener("click", closeDetail);

    /* ESC 키 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDetail();
    });
  }

  /* ── 부트 ── */
  function boot() {
    loadData().then(function (data) {
      store.items = (data && data.items) || [];
      renderNav();
      setCategory("music");
      initVisualizer();
      bind();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
