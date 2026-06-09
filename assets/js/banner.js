(function () {
  "use strict";

  var PAGE_SIZE = 10;
  var loadedCount = 0;
  var allBanners = [];
  var loading = false;
  var bannerData = { my: {}, others: [] };
  var isAdmin = sessionStorage.getItem("sq_auth") === "ok";

  var root = (window.SQ && window.SQ.root) || "../";

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  function persist() {
    if (window.SQDb && SQDb.ready()) return SQDb.push("banner", bannerData);
    return Promise.resolve(false);
  }

  function renderBannerItem(item, container, loaderEl) {
    var el = document.createElement("div");
    el.className = "bn-item";
    if (item.id) el.setAttribute("data-id", item.id);

    if (item.image) {
      var imgTag = '<img src="' + esc(item.image) + '" alt="' + esc(item.label || "") + '" />';
      el.innerHTML = item.url
        ? '<a href="' + esc(item.url) + '" target="_blank" rel="noopener">' + imgTag + '</a>'
        : imgTag;
    } else {
      el.innerHTML = '<span class="bn-item__placeholder">IMAGE</span>';
    }

    /* 어드민 삭제 버튼 */
    if (isAdmin && item.id) {
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "bn-item__del";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm("이 배너를 삭제할까요?")) return;
        bannerData.others = bannerData.others.filter(function (b) { return b.id !== item.id; });
        persist().then(function () { reloadOthers(); });
      });
      el.appendChild(delBtn);
    }

    return el;
  }

  function reloadOthers() {
    var container = document.getElementById("bn-others");
    if (!container) return;
    container.innerHTML = "";
    loadedCount = 0;
    allBanners = bannerData.others || [];
    if (!allBanners.length) {
      container.innerHTML = '<span class="bn-item__placeholder" style="padding:24px 0;display:block;text-align:center;color:var(--muted);font-size:12px;">배너가 없습니다.</span>';
      return;
    }

    var loaderEl = document.createElement("p");
    loaderEl.className = "bn-loader";
    loaderEl.textContent = "Loading...";
    container.appendChild(loaderEl);
    loadMore(container, loaderEl);

    if (!window.IntersectionObserver) return;
    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) loadMore(container, loaderEl);
    }, { threshold: 0.1 });
    obs.observe(loaderEl);
  }

  function loadMore(container, loaderEl) {
    if (loading) return;
    var next = allBanners.slice(loadedCount, loadedCount + PAGE_SIZE);
    if (!next.length) { if (loaderEl) loaderEl.remove(); return; }
    loading = true;
    var frag = document.createDocumentFragment();
    next.forEach(function (item) { frag.appendChild(renderBannerItem(item, container, loaderEl)); });
    container.insertBefore(frag, loaderEl || null);
    loadedCount += next.length;
    loading = false;
    if (loadedCount >= allBanners.length && loaderEl) loaderEl.remove();
  }

  function initBanners(data) {
    bannerData = data || { my: {}, others: [] };
    if (!Array.isArray(bannerData.others)) bannerData.others = [];

    /* MY BANNER */
    var myImg  = document.getElementById("bn-my-image");
    var myDesc = document.getElementById("bn-my-desc");
    if (bannerData.my) {
      if (bannerData.my.image && myImg) {
        var myImgTag = '<img src="' + esc(bannerData.my.image) + '" alt="My Banner" />';
        myImg.innerHTML = bannerData.my.url
          ? '<a href="' + esc(bannerData.my.url) + '" target="_blank" rel="noopener">' + myImgTag + '</a>'
          : myImgTag;
      }
      if (bannerData.my.desc && myDesc) myDesc.textContent = bannerData.my.desc;
    }

    /* OTHERS' BANNER */
    allBanners = bannerData.others;
    if (!allBanners.length && !isAdmin) {
      for (var i = 0; i < 3; i++) allBanners.push({});
    }

    var container = document.getElementById("bn-others");
    if (!container) return;

    if (allBanners.length) {
      var loaderEl = document.createElement("p");
      loaderEl.className = "bn-loader";
      loaderEl.textContent = "Loading...";
      container.appendChild(loaderEl);
      loadMore(container, loaderEl);
      if (window.IntersectionObserver) {
        var obs = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) loadMore(container, loaderEl);
        }, { threshold: 0.1 });
        obs.observe(loaderEl);
      }
    }

    /* 어드민 폼 표시 */
    var managerEl = document.getElementById("bn-manager");
    if (isAdmin && managerEl) {
      managerEl.style.display = "";
      var form = document.getElementById("bn-form");
      if (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var imgUrl  = (document.getElementById("bn-img-url").value || "").trim();
          var linkUrl = (document.getElementById("bn-link-url").value || "").trim();
          var label   = (document.getElementById("bn-label").value || "").trim();
          if (!imgUrl) { alert("이미지 URL을 입력하세요."); return; }
          var newItem = { id: uid(), image: imgUrl, url: linkUrl, label: label };
          bannerData.others.push(newItem);
          persist().then(function () {
            form.reset();
            reloadOthers();
          });
        });
      }
    }
  }

  function boot() {
    if (window.SQDb && SQDb.ready()) {
      SQDb.fetch("banner").then(function (data) {
        initBanners(data);
      }).catch(function () { initBanners(null); });
    } else if (window.SQApp) {
      SQApp.loadData(root + "data/banner.json", "banner").then(function (data) {
        initBanners(data);
      }).catch(function () { initBanners(null); });
    } else {
      initBanners(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
