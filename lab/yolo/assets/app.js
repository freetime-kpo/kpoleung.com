(function () {
  "use strict";

  const SCORE_THRESHOLD = 0.5;
  const WEBCAM_DETECT_MS = 120;
  const CAPTION_MIN_MS = 1000;

  const statusEl = document.getElementById("status");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const video = document.getElementById("video");
  const fileInput = document.getElementById("fileInput");
  const webcamBtn = document.getElementById("webcamBtn");
  const stopBtn = document.getElementById("stopBtn");
  const detectBtn = document.getElementById("detectBtn");
  const captureBtn = document.getElementById("captureBtn");
  const saveLink = document.getElementById("saveLink");
  const detectionList = document.getElementById("detectionList");
  const samplesEl = document.getElementById("samples");
  const captionEnEl = document.getElementById("captionEn");
  const captionZhEl = document.getElementById("captionZh");
  const captionBox = document.getElementById("captionBox");

  // iOS Safari: set properties as well as attributes
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.muted = true;
  video.playsInline = true;

  let model = null;
  let stream = null;
  let loopTimer = null;
  let mode = "idle"; // idle | image | webcam
  let imageEl = null;
  let lastCaptionSig = "";
  let lastCaptionAt = 0;
  let pendingCaption = null;
  let webcamRunning = false;

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function clearDetections() {
    detectionList.innerHTML = "";
  }

  function applyCaption(result) {
    lastCaptionSig = result.signature;
    lastCaptionAt = Date.now();
    captionEnEl.textContent = result.en;
    captionZhEl.textContent = result.zh;
    captionBox.hidden = false;
    pendingCaption = null;
  }

  function setCaption(predictions, force) {
    if (!window.LabCaption) return;
    const result = window.LabCaption.describe(
      predictions,
      canvas.width,
      canvas.height,
      SCORE_THRESHOLD
    );
    if (force) {
      applyCaption(result);
      return;
    }
    if (result.signature === lastCaptionSig) {
      pendingCaption = null;
      return;
    }
    const now = Date.now();
    if (mode === "webcam" && now - lastCaptionAt < CAPTION_MIN_MS) {
      pendingCaption = result;
      return;
    }
    applyCaption(result);
  }

  function flushPendingCaption() {
    if (!pendingCaption) return;
    if (Date.now() - lastCaptionAt < CAPTION_MIN_MS) return;
    if (pendingCaption.signature === lastCaptionSig) {
      pendingCaption = null;
      return;
    }
    applyCaption(pendingCaption);
  }

  function clearCaption() {
    lastCaptionSig = "";
    lastCaptionAt = 0;
    pendingCaption = null;
    captionEnEl.textContent = "";
    captionZhEl.textContent = "";
    captionBox.hidden = true;
  }

  /** Stroke/font sized for on-screen pixels (canvas may be CSS-scaled). */
  function overlayStyle() {
    const cssW = canvas.clientWidth || canvas.width || 1;
    const scale = canvas.width / cssW; // canvas px per CSS px
    const lineWidth = Math.max(2 * scale, canvas.width / 200);
    const fontPx = Math.max(14 * scale, canvas.width / 45);
    const labelH = Math.max(20 * scale, fontPx * 1.35);
    const minBox = Math.max(10 * scale, canvas.width / 90); // keep distant boats visible
    return { lineWidth: lineWidth, fontPx: fontPx, labelH: labelH, minBox: minBox };
  }


  function hideSaveLink() {
    if (!saveLink) return;
    saveLink.hidden = true;
    saveLink.removeAttribute("href");
  }

  function offerSaveLink() {
    if (!saveLink) return;
    try {
      saveLink.href = canvas.toDataURL("image/png");
      saveLink.download = "field-notes-capture.png";
      saveLink.hidden = false;
    } catch (e) {
      hideSaveLink();
    }
  }

  function paintDetections(predictions) {
    clearDetections();
    const style = overlayStyle();
    predictions.forEach(function (p) {
      var x = p.bbox[0];
      var y = p.bbox[1];
      var w = p.bbox[2];
      var h = p.bbox[3];
      // Expand tiny boxes to a visible minimum (centred), so distant boats still show
      if (w < style.minBox) {
        x = x - (style.minBox - w) / 2;
        w = style.minBox;
      }
      if (h < style.minBox) {
        y = y - (style.minBox - h) / 2;
        h = style.minBox;
      }
      ctx.strokeStyle = "#5eead4";
      ctx.lineWidth = style.lineWidth;
      ctx.strokeRect(x, y, w, h);
      const label = p.class + " " + Math.round(p.score * 100) + "%";
      ctx.font = "600 " + Math.round(style.fontPx) + "px DM Sans, system-ui, sans-serif";
      const tw = ctx.measureText(label).width;
      const labelH = style.labelH;
      const ly = Math.max(0, y - labelH);
      ctx.fillStyle = "rgba(15, 118, 110, 0.92)";
      ctx.fillRect(x, ly, tw + style.lineWidth * 4, labelH);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + style.lineWidth * 2, ly + labelH * 0.72);
      const li = document.createElement("li");
      li.textContent = label;
      detectionList.appendChild(li);
    });
    if (!predictions.length) {
      const li = document.createElement("li");
      li.textContent = "No objects above threshold";
      detectionList.appendChild(li);
    }
  }

  /**
   * Always detect on the canvas bitmap so bbox coords match what we draw.
   * (Detecting on a full-res Image while the canvas is downscaled misplaces boxes.)
   */
  async function runDetectOnCanvas() {
    if (!model) return;
    setStatus("Detecting…");
    const predictions = await model.detect(canvas, 20, SCORE_THRESHOLD);
    paintDetections(predictions);
    setCaption(predictions, true);
    if (mode === "image" || mode === "captured") {
      offerSaveLink();
    }
    setStatus(
      predictions.length
        ? "Done — " + predictions.length + " box(es). Reminder: demos can miss or mis-label."
        : "Done — nothing confident enough. Try a clearer photo or another sample."
    );
    return predictions;
  }

  /** Re-run detect for the current still image (Detect button). */
  async function runDetect(source) {
    if (source && source !== canvas) {
      drawFrameToCanvas(source);
    }
    return runDetectOnCanvas();
  }

  /** Size canvas from an image or from videoWidth/videoHeight. */
  function drawFrameToCanvas(source) {
    const maxW = 1280; // cap bitmap size; always detect on this bitmap
    let w = source.videoWidth || source.naturalWidth || source.width || 0;
    let h = source.videoHeight || source.naturalHeight || source.height || 0;
    if (!w || !h) return false;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.drawImage(source, 0, 0, w, h);
    return true;
  }

  function waitForVideoMetadata(vid, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    if (vid.videoWidth > 0 && vid.videoHeight > 0) {
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var done = false;
      function ok() {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      }
      function fail() {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("Webcam video metadata timed out"));
      }
      function cleanup() {
        vid.removeEventListener("loadedmetadata", ok);
        vid.removeEventListener("loadeddata", ok);
        clearTimeout(timer);
      }
      vid.addEventListener("loadedmetadata", ok);
      vid.addEventListener("loadeddata", ok);
      var timer = setTimeout(fail, timeoutMs);
    });
  }

  async function requestWebcamStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw Object.assign(new Error("This browser cannot access a webcam here."), {
        name: "NotSupportedError",
      });
    }
    var attempts = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: { ideal: "user" } }, audio: false },
      { video: true, audio: false },
    ];
    var lastErr = null;
    for (var i = 0; i < attempts.length; i++) {
      try {
        return await navigator.mediaDevices.getUserMedia(attempts[i]);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Could not open webcam");
  }

  function permissionMessage(err) {
    var name = (err && err.name) || "";
    var msg = (err && err.message) || String(err || "");
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Webcam permission denied. Allow camera access for this site, then try again.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No camera found on this device.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Camera is busy or unreadable. Close other apps using it, then try again.";
    }
    if (name === "NotSupportedError" || name === "TypeError") {
      return "Webcam needs a secure context (HTTPS or localhost) and a supporting browser.";
    }
    if (name === "OverconstrainedError") {
      return "Could not match a usable camera. Trying again with fewer constraints may help — reload and retry.";
    }
    return "Webcam unavailable: " + (msg || name || "unknown error");
  }

  async function loadImage(src) {
    stopWebcamLoop();
    mode = "image";
    detectBtn.disabled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise(function (resolve, reject) {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
    imageEl = img;
    hideSaveLink();
    drawFrameToCanvas(img);
    clearDetections();
    clearCaption();
    await runDetectOnCanvas();
  }

  function stopWebcamLoop() {
    webcamRunning = false;
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    video.srcObject = null;
    try {
      video.pause();
    } catch (e) {}
    stopBtn.disabled = true;
    if (captureBtn) captureBtn.disabled = true;
    webcamBtn.disabled = false;
  }

  async function webcamTick() {
    if (!webcamRunning || mode !== "webcam" || !stream) return;
    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (drawFrameToCanvas(video)) {
          const predictions = await model.detect(canvas, 20, SCORE_THRESHOLD);
          // Re-draw frame then boxes (detect can take time; coords are canvas-space)
          drawFrameToCanvas(video);
          paintDetections(predictions);
          setCaption(predictions, false);
          flushPendingCaption();
          setStatus("Webcam live — detection on-device. Stop when finished.");
        }
      } else {
        flushPendingCaption();
      }
    } catch (e) {
      setStatus("Webcam detect error: " + (e && e.message ? e.message : e));
    }
    if (webcamRunning) {
      loopTimer = setTimeout(webcamTick, WEBCAM_DETECT_MS);
    }
  }

  function startWebcamLoop() {
    webcamRunning = true;
    if (loopTimer) clearTimeout(loopTimer);
    loopTimer = setTimeout(webcamTick, 0);
  }

  fileInput.addEventListener("change", function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url)
      .catch(function (e) {
        setStatus("Could not load image: " + (e && e.message ? e.message : e));
      })
      .finally(function () {
        URL.revokeObjectURL(url);
        fileInput.value = "";
      });
  });

  detectBtn.addEventListener("click", function () {
    if (mode === "image" && imageEl) runDetect(imageEl);
    else if (mode === "captured") runDetectOnCanvas();
  });

  webcamBtn.addEventListener("click", async function () {
    if (!model) return;
    webcamBtn.disabled = true;
    setStatus("Asking for camera permission…");
    try {
      stopWebcamLoop();
      clearCaption();
      stream = await requestWebcamStream();
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await waitForVideoMetadata(video);
      try {
        await video.play();
      } catch (playErr) {
        // Some browsers still play via autoplay+muted; continue if frames arrive
        console.warn("video.play()", playErr);
      }
      // Ensure dimensions once more after play
      if (!video.videoWidth) {
        await waitForVideoMetadata(video, 5000);
      }
      drawFrameToCanvas(video);
      mode = "webcam";
      detectBtn.disabled = true;
      stopBtn.disabled = false;
      if (captureBtn) captureBtn.disabled = false;
      webcamBtn.disabled = true;
      hideSaveLink();
      setStatus("Webcam live — detection on-device. Capture freezes one frame.");
      startWebcamLoop();
    } catch (e) {
      setStatus(permissionMessage(e));
      stopWebcamLoop();
      webcamBtn.disabled = false;
    }
  });

  stopBtn.addEventListener("click", function () {
    stopWebcamLoop();
    mode = "idle";
    setStatus("Webcam stopped. Upload an image, pick a sample, or start the webcam again.");
  });

  if (captureBtn) {
    captureBtn.addEventListener("click", async function () {
      if (!model || mode !== "webcam" || !stream) return;
      captureBtn.disabled = true;
      setStatus("Capturing frame…");
      try {
        if (!drawFrameToCanvas(video)) {
          setStatus("Capture failed — no video frame yet. Keep Live running a moment, then try again.");
          if (mode === "webcam" && stream) captureBtn.disabled = false;
          return;
        }
        // Freeze: stop loop + camera tracks (saves battery)
        stopWebcamLoop();
        mode = "captured";
        detectBtn.disabled = false;
        const predictions = await runDetectOnCanvas();
        offerSaveLink();
        setStatus(
          (predictions && predictions.length)
            ? "Captured — " + predictions.length + " box(es). Start webcam again to go live."
            : "Captured — nothing confident enough. Start webcam again to go live."
        );
      } catch (e) {
        setStatus("Capture failed: " + (e && e.message ? e.message : e));
        mode = "idle";
      }
    });
  }

  async function loadSamples() {
    try {
      const res = await fetch("./assets/samples.json", { cache: "no-store" });
      const data = await res.json();
      samplesEl.innerHTML = "";
      (data.samples || []).forEach(function (s) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sample";
        btn.dataset.sampleId = s.id || "";
        btn.innerHTML =
          '<img alt="" loading="lazy" src="' +
          s.image +
          '" />' +
          "<strong>" +
          s.title +
          "</strong>" +
          "<span>" +
          s.blurb +
          "</span>";
        btn.addEventListener("click", function () {
          setStatus("Loading sample: " + s.title + "…");
          loadImage(s.image).catch(function (e) {
            setStatus("Sample failed: " + (e && e.message ? e.message : e));
          });
        });
        samplesEl.appendChild(btn);
      });
    } catch (e) {
      samplesEl.textContent = "Could not load samples.json";
    }
  }

  async function boot() {
    try {
      if (typeof tf === "undefined" || typeof cocoSsd === "undefined") {
        setStatus("Libraries failed to load. Check network / CDN.");
        return;
      }
      setStatus("Loading COCO-SSD model (first visit may take a moment)…");
      await tf.ready();
      model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      setStatus("Model ready. Upload an image, start the webcam, or pick a sample.");
      detectBtn.disabled = false;
      await loadSamples();
    } catch (e) {
      setStatus("Model load failed: " + (e && e.message ? e.message : e));
    }
  }

  boot();
})();
