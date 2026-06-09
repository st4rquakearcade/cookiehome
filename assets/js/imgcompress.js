(function () {
  "use strict";

  function compress(file, opts) {
    opts = opts || {};
    var maxW = opts.maxW || 1280;
    var maxH = opts.maxH || 1280;
    var quality = opts.quality == null ? 0.8 : opts.quality;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("이미지 파일이 아닙니다."));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var scale = Math.min(1, maxW / w, maxH / h);
        var tw = Math.max(1, Math.round(w * scale));
        var th = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        canvas.getContext("2d").drawImage(img, 0, 0, tw, th);
        URL.revokeObjectURL(url);
        var type = "image/webp";
        var dataURL = canvas.toDataURL(type, quality);
        if (dataURL.indexOf("data:image/webp") !== 0) {
          type = "image/jpeg";
          dataURL = canvas.toDataURL(type, quality);
        }
        function done(blob) {
          resolve({
            dataURL: dataURL,
            blob: blob || null,
            w: tw,
            h: th,
            bytes: blob ? blob.size : Math.round(dataURL.length * 0.75),
            origBytes: file.size,
            type: type
          });
        }
        if (canvas.toBlob) canvas.toBlob(done, type, quality);
        else done(null);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("이미지를 읽을 수 없습니다."));
      };
      img.src = url;
    });
  }

  function fmtBytes(n) {
    if (n == null) return "-";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }

  window.SQImg = { compress: compress, fmtBytes: fmtBytes };
})();
