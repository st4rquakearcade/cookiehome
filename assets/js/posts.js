(function () {
  "use strict";

  var root = document.documentElement.getAttribute("data-root") || "";
  var cache = null;

  var BOARDS = {
    notice: "NOTICE",
    log: "LOG",
    memo: "MEMO",
    guest: "GUEST",
    archive: "ARCHIVE",
    pair: "PAIR"
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function fetchArr() {
    if (cache) return Promise.resolve(cache.slice());
    if (window.SQDb && SQDb.ready()) {
      return SQDb.fetch("posts").then(function (val) {
        cache = Array.isArray(val) ? val : (val && val.posts) || [];
        return cache.slice();
      });
    }
    return fetch(root + "data/posts.json", { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (j) {
        cache = Array.isArray(j) ? j : (j && j.posts) || [];
        return cache.slice();
      })
      .catch(function () {
        cache = [];
        return [];
      });
  }

  function persist(arr) {
    cache = arr.slice();
    if (window.SQDb && SQDb.ready()) {
      return SQDb.push("posts", cache).then(function () {
        return cache;
      });
    }
    return Promise.resolve(cache);
  }

  function sortPosts(a, b) {
    if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  }

  function all() {
    return fetchArr();
  }

  function byBoard(board) {
    return all().then(function (arr) {
      return arr.filter(function (p) {
        return p.board === board;
      }).sort(sortPosts);
    });
  }

  function get(id) {
    return all().then(function (arr) {
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      return null;
    });
  }

  function recent(n) {
    return all().then(function (arr) {
      return arr
        .slice()
        .sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        })
        .slice(0, n || 5);
    });
  }

  function save(post) {
    return all().then(function (arr) {
      var now = Date.now();
      if (post.id) {
        var idx = -1;
        for (var i = 0; i < arr.length; i++) if (arr[i].id === post.id) idx = i;
        if (idx >= 0) {
          post.createdAt = arr[idx].createdAt || now;
          post.updatedAt = now;
          arr[idx] = post;
        } else {
          post.createdAt = post.updatedAt = now;
          arr.push(post);
        }
      } else {
        post.id = uid();
        post.createdAt = post.updatedAt = now;
        arr.push(post);
      }
      return persist(arr).then(function () {
        return post;
      });
    });
  }

  function remove(id) {
    return all().then(function (arr) {
      var next = arr.filter(function (p) {
        return p.id !== id;
      });
      return persist(next).then(function () {
        return next;
      });
    });
  }

  function exportJSON() {
    return all().then(function (arr) {
      var blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "posts.json";
      a.click();
      URL.revokeObjectURL(a.href);
      return arr;
    });
  }

  function importJSON(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var data = JSON.parse(fr.result);
          var arr = Array.isArray(data) ? data : (data && data.posts) || [];
          persist(arr).then(resolve).catch(reject);
        } catch (e) {
          reject(e);
        }
      };
      fr.onerror = reject;
      fr.readAsText(file);
    });
  }

  function formatDate(ms) {
    var d = new Date(ms || Date.now());
    var p = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    return d.getFullYear() + " · " + p(d.getMonth() + 1) + " · " + p(d.getDate());
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  window.SQPosts = {
    BOARDS: BOARDS,
    all: all,
    byBoard: byBoard,
    get: get,
    recent: recent,
    save: save,
    remove: remove,
    exportJSON: exportJSON,
    importJSON: importJSON,
    formatDate: formatDate,
    escapeHtml: escapeHtml
  };
})();
