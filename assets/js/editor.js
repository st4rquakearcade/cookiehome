(function () {
  "use strict";

  var qs = new URLSearchParams(location.search);
  var board = qs.get("board") || "notice";
  var editId = qs.get("id") || "";
  var root = (window.SQ && window.SQ.root) || "../";

  var $ = function (id) {
    return document.getElementById(id);
  };
  var elBoard = $("ed-board");
  var elTitle = $("ed-title");
  var elSubtitle = $("ed-subtitle");
  var elCategory = $("ed-category");
  var ed = $("ed-body");
  var elTags = $("ed-tags");
  var elPinned = $("ed-pinned");
  var elSecret = $("ed-secret");
  var elStatus = $("ed-status");
  var elFont = $("ed-font");
  var elFore = $("ed-forecolor");
  var elHilite = $("ed-hilite");
  var elSource = $("ed-source");
  var emojiPop = $("emoji-pop");

  function boot() {
    if (!window.SQPosts) return;
    init();
  }

  function init() {
    Object.keys(SQPosts.BOARDS).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = SQPosts.BOARDS[k];
      if (k === board) o.selected = true;
      elBoard.appendChild(o);
    });

    if (editId) {
      SQPosts.get(editId).then(function (p) {
        if (!p) {
          status("불러올 글을 찾지 못했어요.");
          return;
        }
        elBoard.value = p.board;
        elTitle.value = p.title || "";
        if (elSubtitle) elSubtitle.value = p.subtitle || "";
        if (elCategory) elCategory.value = p.category || "";
        ed.innerHTML = p.html || "";
        if (elTags) elTags.value = (p.tags || []).join(", ");
        elPinned.checked = !!p.pinned;
        if (elSecret) elSecret.checked = !!p.secret;
      });
    }

    bind();
  }

  var lastRange = null;
  function saveRange() {
    var sel = window.getSelection();
    if (sel.rangeCount && ed.contains(sel.anchorNode)) lastRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreRange() {
    if (!lastRange) return;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastRange);
  }
  ["keyup", "mouseup", "input"].forEach(function (ev) {
    ed.addEventListener(ev, saveRange);
  });
  ed.addEventListener("focus", saveRange);

  function exec(cmd, val) {
    ed.focus();
    restoreRange();
    document.execCommand(cmd, false, val || null);
    saveRange();
  }
  function execCSS(cmd, val) {
    ed.focus();
    restoreRange();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, val);
    document.execCommand("styleWithCSS", false, false);
    saveRange();
  }
  function insertHTML(html) {
    ed.focus();
    restoreRange();
    document.execCommand("insertHTML", false, html);
    saveRange();
  }

  var FONTS = {
    sans: "'Presentation', -apple-system, sans-serif",
    serif: "Georgia, 'Nanum Myeongjo', serif",
    round: "'Apple SD Gothic Neo', Pretendard, sans-serif",
    mono: "ui-monospace, Menlo, monospace"
  };

  var ACT = {
    link: function () {
      var u = prompt("링크 주소 (https://...)");
      if (u) exec("createLink", u);
    },
    image: openImgDialog,
    spoiler: wrapSpoiler,
    fold: insertFold,
    table: insertTable,
    hr: function () {
      exec("insertHorizontalRule");
    },
    emoji: toggleEmoji,
    html: toggleHtml
  };

  function bind() {
    if (elFont)
      elFont.addEventListener("change", function () {
        var v = elFont.value;
        if (v) execCSS("fontName", FONTS[v] || v);
        elFont.selectedIndex = 0;
      });
    if (elFore) elFore.addEventListener("change", function () { execCSS("foreColor", elFore.value); });
    if (elHilite)
      elHilite.addEventListener("change", function () {
        ed.focus();
        restoreRange();
        document.execCommand("styleWithCSS", false, true);
        if (!document.execCommand("hiliteColor", false, elHilite.value))
          document.execCommand("backColor", false, elHilite.value);
        document.execCommand("styleWithCSS", false, false);
        saveRange();
      });

    $("ed-toolbar").addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      e.preventDefault();
      if (btn.dataset.cmd) exec(btn.dataset.cmd);
      else if (btn.dataset.block) exec("formatBlock", "<" + btn.dataset.block + ">");
      else if (btn.dataset.act && ACT[btn.dataset.act]) ACT[btn.dataset.act]();
    });

    var imgDialog = $("img-dialog");
    var imgFileInput = $("imgd-file");
    var comp = null;

    function openImgDialog() {
      if (!imgDialog) return;
      imgDialog.hidden = false;
      $("imgd-preview").hidden = true;
      comp = null;
      imgFileInput.value = "";
      $("imgd-url").value = "";
    }
    function closeImgDialog() {
      if (imgDialog) imgDialog.hidden = true;
    }
    function imgOpts() {
      return { maxW: +$("imgd-maxw").value, maxH: +$("imgd-maxw").value, quality: +$("imgd-q").value / 100 };
    }
    function runCompress(file) {
      if (!file || !window.SQImg) return;
      SQImg.compress(file, imgOpts())
        .then(function (r) {
          comp = r;
          $("imgd-img").src = r.dataURL;
          var save = r.origBytes ? Math.max(0, Math.round((1 - r.bytes / r.origBytes) * 100)) : 0;
          $("imgd-stat").textContent =
            r.w + "×" + r.h + " · " + SQImg.fmtBytes(r.origBytes) + " → " + SQImg.fmtBytes(r.bytes) + " (−" + save + "%)";
          $("imgd-preview").hidden = false;
        })
        .catch(function (e) {
          alert(e.message || "압축 실패");
        });
    }

    if (imgFileInput)
      imgFileInput.addEventListener("change", function () {
        var f = this.files && this.files[0];
        if (f) runCompress(f);
      });
    if ($("imgd-maxw"))
      $("imgd-maxw").addEventListener("input", function () {
        $("imgd-maxw-v").textContent = this.value;
        if (imgFileInput.files[0]) runCompress(imgFileInput.files[0]);
      });
    if ($("imgd-q"))
      $("imgd-q").addEventListener("input", function () {
        $("imgd-q-v").textContent = this.value;
        if (imgFileInput.files[0]) runCompress(imgFileInput.files[0]);
      });
    if ($("imgd-insert"))
      $("imgd-insert").addEventListener("click", function () {
        if (!comp) return;
        insertHTML('<img src="' + comp.dataURL + '" alt="">');
        closeImgDialog();
      });
    if ($("imgd-download"))
      $("imgd-download").addEventListener("click", function () {
        if (!comp) return;
        var ext = comp.type === "image/webp" ? "webp" : "jpg";
        var a = document.createElement("a");
        a.href = comp.blob ? URL.createObjectURL(comp.blob) : comp.dataURL;
        a.download = "image-" + Date.now() + "." + ext;
        a.click();
        if (comp.blob) setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      });
    if ($("imgd-url-insert"))
      $("imgd-url-insert").addEventListener("click", function () {
        var u = $("imgd-url").value.trim();
        if (!u) return;
        insertHTML('<img src="' + u.replace(/"/g, "&quot;") + '" alt="">');
        closeImgDialog();
      });
    if ($("imgd-close")) $("imgd-close").addEventListener("click", closeImgDialog);
    if (imgDialog) imgDialog.addEventListener("click", function (e) { if (e.target === imgDialog) closeImgDialog(); });

    if ($("ed-close"))
      $("ed-close").addEventListener("click", function () {
        window.close();
        setTimeout(function () { location.href = root + "index.html"; }, 120);
      });

    var EMOJIS = ("😀 😄 😊 🥰 😍 😎 🤭 🤔 😴 😢 😭 😡 🥺 😳 🤯 👍 👏 🙏 💪 🙌 👀 ✨ 🌟 ⭐ 🔥 " +
      "💖 💕 ❤️ 🧡 💛 💚 💙 💜 🤍 🖤 🌸 🌷 🌹 🍀 🌙 ☁️ ☕ 🍪 🎵 🎶 📌 ✅ ⚠️ ❓ ❗").split(" ");
    if (emojiPop)
      emojiPop.innerHTML = EMOJIS.map(function (e) {
        return '<button type="button" data-emoji="' + e + '">' + e + "</button>";
      }).join("");
    function toggleEmoji() {
      if (emojiPop) emojiPop.hidden = !emojiPop.hidden;
    }
    if (emojiPop)
      emojiPop.addEventListener("click", function (e) {
        var b = e.target.closest("[data-emoji]");
        if (!b) return;
        insertHTML(b.dataset.emoji);
        emojiPop.hidden = true;
      });
    document.addEventListener("click", function (e) {
      if (
        emojiPop &&
        !emojiPop.hidden &&
        !e.target.closest("#emoji-pop") &&
        !e.target.closest('[data-act="emoji"]')
      )
        emojiPop.hidden = true;
    });

    var sourceMode = false;
    function toggleHtml() {
      if (!elSource) return;
      if (!sourceMode) {
        elSource.value = ed.innerHTML;
        ed.hidden = true;
        elSource.hidden = false;
        sourceMode = true;
        elSource.focus();
      } else {
        ed.innerHTML = elSource.value;
        elSource.hidden = true;
        ed.hidden = false;
        sourceMode = false;
        ed.focus();
      }
    }

    function collectPost(publishedFlag) {
      if (sourceMode) toggleHtml();
      return {
        id: editId || "",
        board: elBoard.value,
        title: elTitle.value.trim(),
        subtitle: elSubtitle ? elSubtitle.value.trim() : "",
        category: elCategory ? elCategory.value.trim() : "",
        html: ed.innerHTML.trim(),
        tags: elTags ? elTags.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [],
        pinned: elPinned.checked,
        secret: elSecret ? elSecret.checked : false,
        published: !!publishedFlag
      };
    }

    /* Draft: 서버에 저장만 (published: false) */
    function doDraft() {
      var post = collectPost(false);
      if (!post.title && !post.html) {
        alert("제목이나 내용을 입력하세요.");
        return;
      }
      SQPosts.save(post).then(function (saved) {
        editId = saved.id;
        status("임시 저장되었습니다. (미발행)");
      });
    }

    /* Publish: 서버에 저장 + published: true → 게시판에 공개 */
    function doPublish() {
      var post = collectPost(true);
      if (!post.title && !post.html) {
        alert("제목이나 내용을 입력하세요.");
        return;
      }
      SQPosts.save(post).then(function (saved) {
        editId = saved.id;
        status("발행되었습니다.");
        setTimeout(function () {
          location.href = root + "pages/" + saved.board + ".html";
        }, 600);
      });
    }

    $("ed-save").addEventListener("click", doPublish);
    if ($("ed-draft")) $("ed-draft").addEventListener("click", doDraft);

    if ($("ed-export")) {
      $("ed-export").addEventListener("click", function () {
        SQPosts.exportJSON();
        status("posts.json을 내려받았어요. data/posts.json 자리에 올리면 모두에게 공개됩니다.");
      });
    }
    var edImport = $("ed-import");
    if (edImport) {
      edImport.addEventListener("change", function () {
        var f = edImport.files && edImport.files[0];
        if (!f) return;
        SQPosts.importJSON(f)
          .then(function () { alert("불러왔습니다. 화면을 새로고침합니다."); location.reload(); })
          .catch(function () { alert("JSON을 읽을 수 없습니다."); });
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && imgDialog && !imgDialog.hidden) closeImgDialog();
    });
  }

  function wrapSpoiler() {
    ed.focus();
    restoreRange();
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) {
      alert("가릴 부분을 먼저 선택하세요.");
      return;
    }
    var range = sel.getRangeAt(0);
    var span = document.createElement("span");
    span.className = "spoiler";
    try {
      range.surroundContents(span);
    } catch (e) {
      var frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    if (span.querySelector("img") && !span.textContent.trim()) span.classList.add("spoiler--img");
    saveRange();
  }

  function insertFold() {
    insertHTML(
      '<details class="fold" open><summary><span class="fold__open">접은 글</span></summary>' +
        '<div class="fold__body">여기에 접을 내용을 적으세요.</div></details><p><br></p>'
    );
  }

  function insertTable() {
    var rows = parseInt(prompt("표 행 수 (제목 줄 제외)", "2"), 10);
    var cols = parseInt(prompt("표 열 수", "2"), 10);
    if (!rows || !cols || rows < 1 || cols < 1) return;
    var h = "<table><thead><tr>";
    for (var j = 0; j < cols; j++) h += "<th>제목</th>";
    h += "</tr></thead><tbody>";
    for (var i = 0; i < rows; i++) {
      h += "<tr>";
      for (var k = 0; k < cols; k++) h += "<td>내용</td>";
      h += "</tr>";
    }
    h += "</tbody></table><p><br></p>";
    insertHTML(h);
  }

  function status(msg) {
    if (elStatus) elStatus.textContent = msg;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
