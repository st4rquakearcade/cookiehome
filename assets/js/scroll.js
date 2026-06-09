(function () {
  "use strict";

  function initScroll() {
    /* ── 진행 막대 삽입 ── */
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);

    /* ── 스크롤 탑 버튼 교체: ^ → 화살표 ── */
    var btn = document.getElementById("scroll-top");
    if (btn) {
      btn.innerHTML = '<div class="arrow-top"></div><div class="arrow-bottom"></div>';
      btn.setAttribute("aria-label", "맨 위로");
      btn.addEventListener("click", function () {
        var scrollEl = document.querySelector("[data-page-scroll]");
        if (scrollEl) {
          scrollEl.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    /* ── 스크롤 이벤트 ── */
    function onScroll(target) {
      var scrollTop = target.scrollTop !== undefined ? target.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
      var scrollHeight = target.scrollHeight !== undefined ? target.scrollHeight : document.documentElement.scrollHeight;
      var clientHeight = target.clientHeight !== undefined ? target.clientHeight : window.innerHeight;
      var max = scrollHeight - clientHeight;
      var pct = max > 0 ? Math.round((scrollTop / max) * 1000) / 10 : 0;

      bar.style.width = pct + "%";

      if (btn) {
        if (scrollTop > 80) {
          btn.classList.add("is-visible");
        } else {
          btn.classList.remove("is-visible");
        }
      }
    }

    /* page-shell scroll area */
    var scrollEl = document.querySelector("[data-page-scroll]");
    if (scrollEl) {
      scrollEl.addEventListener("scroll", function () { onScroll(scrollEl); }, { passive: true });
    }
    /* fallback: window scroll */
    window.addEventListener("scroll", function () { onScroll(window); }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScroll);
  } else {
    initScroll();
  }
})();
