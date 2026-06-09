(function () {
  "use strict";

  var NAV = [
    { id: "home", label: "HOME", href: "index.html" },
    { id: "notice", label: "NOTICE", href: "pages/notice.html" },
    { id: "profile", label: "PROFILE", href: "pages/profile.html" },
    { id: "pair", label: "PAIR", href: "pages/pair.html" },
    { id: "log", label: "LOG", href: "pages/log.html" },
    { id: "memo", label: "MEMO", href: "pages/memo.html" },
    { id: "calendar", label: "CALANDAR", href: "pages/calendar.html" },
    { id: "archive", label: "ARCHIVE", href: "pages/archive.html" },
    { id: "guest", label: "GUEST", href: "pages/guest.html" },
    { id: "banner", label: "BANNER", href: "pages/banner.html" }
  ];

  var root = document.documentElement.getAttribute("data-root") || "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function injectNav() {
    var mount = document.getElementById("site-nav");
    if (!mount) return;
    var active = mount.getAttribute("data-active") || "";
    mount.innerHTML = NAV.map(function (item) {
      var href = root + item.href;
      var cls = item.id === active ? ' class="is-active"' : "";
      return '<a href="' + esc(href) + '"' + cls + ">" + esc(item.label) + "</a>";
    }).join("");
  }

  function initScrollTop() {
    var btn = document.getElementById("scroll-top");
    if (!btn) return;
    function toggle() {
      btn.classList.toggle("is-visible", window.scrollY > 200);
    }
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initFold() {
    document.querySelectorAll("[data-fold]").forEach(function (el) {
      var trigger = el.querySelector("[data-fold-trigger]");
      if (!trigger) return;
      trigger.addEventListener("click", function () {
        el.classList.toggle("is-open");
      });
    });
  }

  function fetchJson(path) {
    return fetch(root + path, { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  function loadData(jsonPath, fbNode) {
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch(fbNode).then(function (val) {
        if (val != null) return val;
        return fetchJson(jsonPath);
      });
    }
    return fetchJson(jsonPath);
  }

  window.SQApp = {
    esc: esc,
    root: root,
    loadData: loadData,
    fetchJson: fetchJson
  };

  function boot() {
    injectNav();
    initScrollTop();
    initFold();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
