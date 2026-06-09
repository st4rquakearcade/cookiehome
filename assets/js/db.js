(function (global) {
  "use strict";

  var db = null;
  var ok = false;

  function hasConfig(c) {
    return c && c.apiKey && c.databaseURL;
  }

  function init() {
    var cfg = global.SQ_FIREBASE;
    if (!hasConfig(cfg)) return;
    if (typeof firebase === "undefined" || !firebase.initializeApp) return;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
      ok = true;
    } catch (e) {
      ok = false;
    }
  }
  init();

  global.SQDb = {
    ready: function () {
      return ok && !!db;
    },
    fetch: function (node) {
      if (!this.ready()) return Promise.resolve(null);
      return db
        .ref(node)
        .once("value")
        .then(function (snap) {
          return snap.val();
        })
        .catch(function () {
          return null;
        });
    },
    watch: function (node, cb) {
      if (!this.ready()) return function () {};
      var ref = db.ref(node);
      var handler = ref.on("value", function (snap) {
        cb(snap.val());
      });
      return function () {
        ref.off("value", handler);
      };
    },
    push: function (node, val) {
      if (!this.ready()) return Promise.resolve(false);
      return db
        .ref(node)
        .set(val == null ? null : val)
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    }
  };
})(window);
