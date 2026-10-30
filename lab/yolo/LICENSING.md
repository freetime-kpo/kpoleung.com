# Licensing notes — in-browser object detection on kpoleung.com

Updated: 2026-09-24 HKT · Research for local lab prototype only (not legal advice).

## Recommendation

**Use TensorFlow.js COCO-SSD (Apache-2.0) for the public personal-site demo.**

Reasons:
- Runs fully in the visitor’s browser (WebGL/CPU); no server GPU.
- Apache-2.0 is permissive: fine for a personal site without AGPL copyleft on the whole project.
- Mature CDN distribution (`@tensorflow/tfjs` + `@tensorflow-models/coco-ssd`).
- Good enough for a teaching sample (80 COCO classes); not a claim of “Ultralytics YOLO production accuracy.”

Name the page honestly: “object detection sample (COCO-SSD)” while the *podcast* can still explain the YOLO *idea* (you-only-look-once family). Do not imply the lab page loads Ultralytics weights if it does not.

## Comparison (verify again before production deploy)

| Option | License (code / typical weights) | Browser-friendly? | Fit for public personal site |
|--------|----------------------------------|-------------------|------------------------------|
| **Ultralytics YOLOv5/v8/11** | **AGPL-3.0** (Enterprise for closed use) | Possible via ONNX/TFJS exports, but AGPL obligations follow | Risky unless entire derivative work is AGPL’d or Enterprise licensed |
| **YOLOX** | Apache-2.0 | Needs your own ONNX/TFJS/WebGPU path | Good license; more build work than COCO-SSD |
| **TF.js COCO-SSD** | **Apache-2.0** | Yes (official) | **Recommended for this lab** |
| **MediaPipe Object Detector** | Apache-2.0 (SDK); confirm each `.tflite` / `.task` bundle | Yes (WASM) | Strong alternative; verify model-file license + privacy notice |
| **RT-DETR variants** | Varies by implementation (Ultralytics RT-DETR → AGPL; other ports differ) | Uneven | Only if a clearly permissive browser build is pinned |

## Sources

1. Ultralytics License explainer (AGPL vs Enterprise): https://www.ultralytics.com/license  
2. Ultralytics Terms §5 (AGPL-3.0 or commercial): https://www.ultralytics.com/legal/terms-of-service  
3. Ultralytics pricing note (Free/Pro = AGPL): https://www.ultralytics.com/pricing  
4. TF.js coco-ssd README / Apache-2.0: https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd  
5. npm `@tensorflow-models/coco-ssd` license field Apache-2.0: https://www.npmjs.com/package/@tensorflow-models/coco-ssd  
6. YOLOX repository Apache-2.0: https://github.com/Megvii-BaseDetection/YOLOX  
7. MediaPipe LICENSE Apache-2.0: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE  
8. MediaPipe Tasks Vision (npm Apache-2.0): https://www.jsdelivr.com/package/npm/@mediapipe/tasks-vision  

## CDN libraries used by the prototype

- `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js`
- `https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js`
- Model weights fetched by the library from Google Cloud Storage under the tfjs-models savedmodel paths (default `lite_mobilenet_v2`).

Retain Apache notices; do not remove license headers from vendored copies if you later vendor instead of CDN.
