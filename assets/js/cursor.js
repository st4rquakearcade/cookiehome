(function () {
  "use strict";

  /* 터치 기기 제외 */
  if (!window.matchMedia("(hover: hover)").matches) return;

  var inner = document.createElement("div");
  inner.className = "cursor-inner";
  var outer = document.createElement("div");
  outer.className = "cursor-outer";
  document.body.appendChild(inner);
  document.body.appendChild(outer);

  var cx = -100, cy = -100;
  var ox = -100, oy = -100;
  var ease = 0.18; /* 렌즈 25% → 지연 약 18% */

  document.addEventListener("mousemove", function (e) {
    cx = e.clientX;
    cy = e.clientY;
    inner.style.left = cx + "px";
    inner.style.top  = cy + "px";
  });

  (function animOuter() {
    ox += (cx - ox) * ease;
    oy += (cy - oy) * ease;
    outer.style.left = ox + "px";
    outer.style.top  = oy + "px";
    requestAnimationFrame(animOuter);
  })();

  /* 링크·버튼 호버 → stuck 효과 */
  document.addEventListener("mouseover", function (e) {
    if (e.target.closest("a, button, [role='button'], input, label, select, textarea")) {
      outer.classList.add("is-stuck");
      inner.classList.add("is-hidden");
    }
  });
  document.addEventListener("mouseout", function (e) {
    if (e.target.closest("a, button, [role='button'], input, label, select, textarea")) {
      outer.classList.remove("is-stuck");
      inner.classList.remove("is-hidden");
    }
  });
})();
