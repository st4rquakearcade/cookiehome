(function () {
  "use strict";

  function initPageShell() {
    var hero = document.querySelector("[data-page-hero]");
    var scroll = document.querySelector("[data-page-scroll]");
    var loader = document.getElementById("page-loader");

    if (hero) {
      requestAnimationFrame(function () {
        hero.classList.add("is-animated");
      });
    }

    setTimeout(function () {
      if (hero) document.body.classList.add("scroll-locked");
      if (scroll) scroll.classList.add("is-ready");
      if (loader) loader.classList.add("is-hidden");
    }, 1000);
  }

  window.SQPageShell = { init: initPageShell };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageShell);
  } else {
    initPageShell();
  }
})();
