(function (global) {
  "use strict";

  var CLASS_ZH = {
    person: "人", bicycle: "單車", car: "車", motorcycle: "電單車", airplane: "飛機",
    bus: "巴士", train: "火車", truck: "貨車", boat: "船",
    "traffic light": "交通燈", "fire hydrant": "消防栓", "stop sign": "停車標誌",
    "parking meter": "停車收費錶", bench: "長椅", bird: "鳥", cat: "貓", dog: "狗",
    horse: "馬", sheep: "羊", cow: "牛", elephant: "大象", bear: "熊", zebra: "斑馬",
    giraffe: "長頸鹿", backpack: "背囊", umbrella: "遮", handbag: "手袋", tie: "領帶",
    suitcase: "行李", frisbee: "飛碟", skis: "滑雪板", snowboard: "滑雪板",
    "sports ball": "球", kite: "風箏", "baseball bat": "棒球棒", "baseball glove": "棒球手套",
    skateboard: "滑板", surfboard: "衝浪板", "tennis racket": "網球拍", bottle: "樽",
    "wine glass": "酒杯", cup: "杯", fork: "叉", knife: "刀", spoon: "匙羹", bowl: "碗",
    banana: "香蕉", apple: "蘋果", sandwich: "三文治", orange: "橙", broccoli: "西蘭花",
    carrot: "蘿蔔", "hot dog": "熱狗", pizza: "薄餅", donut: "冬甩", cake: "蛋糕",
    chair: "椅", couch: "梳化", "potted plant": "盆栽", bed: "床", "dining table": "餐枱",
    toilet: "廁所", tv: "電視", laptop: "手提電腦", mouse: "滑鼠", remote: "遙控",
    keyboard: "鍵盤", "cell phone": "手機", microwave: "微波爐", oven: "焗爐",
    toaster: "多士爐", sink: "洗手盆", refrigerator: "雪櫃", book: "書", clock: "鐘",
    vase: "花瓶", scissors: "剪刀", "teddy bear": "公仔", "hair drier": "風筒",
    toothbrush: "牙刷"
  };

  var IRREGULAR_PLURAL = { person: "people", sheep: "sheep", scissors: "scissors", skis: "skis" };
  var EN_NUM = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
    "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
  var ZH_NUM = ["零","一","兩","三","四","五","六","七","八","九","十",
    "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十"];
  var REGION_ZH = {
    "top left": "左上角", top: "上方", "top right": "右上角",
    left: "左邊", centre: "畫面中央", right: "右邊",
    "bottom left": "左下角", bottom: "下方", "bottom right": "右下角"
  };
  var MEASURE = {
    person: "個", bicycle: "架", car: "架", motorcycle: "架", bus: "架", truck: "架",
    boat: "艘", bird: "隻", cat: "隻", dog: "隻", horse: "匹", book: "本",
    bottle: "枝", cup: "個", chair: "張", "cell phone": "部", laptop: "部", tv: "部"
  };

  function enCount(n) { return (n >= 0 && n < EN_NUM.length) ? EN_NUM[n] : String(n); }
  function zhCount(n) { return (n >= 0 && n < ZH_NUM.length) ? ZH_NUM[n] : String(n); }
  function pluralize(cls, n) {
    if (n === 1) return cls;
    if (IRREGULAR_PLURAL[cls]) return IRREGULAR_PLURAL[cls];
    if (/s$|x$|ch$|sh$/.test(cls)) return cls + "es";
    if (/[^aeiou]y$/.test(cls)) return cls.slice(0, -1) + "ies";
    return cls + "s";
  }
  function measure(cls) { return MEASURE[cls] || "個"; }
  function zhName(cls) { return CLASS_ZH[cls] || cls; }

  function regionOf(bbox, W, H) {
    var x = bbox[0], y = bbox[1], w = bbox[2], h = bbox[3];
    var cx = (x + w / 2) / W, cy = (y + h / 2) / H;
    var area = (w * h) / (W * H);
    var hPos = cx < 1 / 3 ? "left" : cx > 2 / 3 ? "right" : "mid";
    var vPos = cy < 1 / 3 ? "top" : cy > 2 / 3 ? "bottom" : "mid";
    var key;
    if (hPos === "mid" && vPos === "mid") key = "centre";
    else if (hPos === "mid") key = vPos;
    else if (vPos === "mid") key = hPos;
    else key = vPos + " " + hPos;
    return { key: key, area: area };
  }

  function regionEn(key) {
    if (key === "centre") return "in the centre";
    if (key === "left" || key === "right") return "on the " + key;
    if (key === "top" || key === "bottom") return "near the " + key;
    return "at the " + key;
  }

  function unique(arr) {
    var out = [];
    arr.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    return out;
  }

  function joinEn(items) {
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function joinZh(items) {
    if (items.length <= 1) return items[0] || "";
    if (items.length === 2) return items[0] + "，" + items[1];
    return items.slice(0, -1).join("，") + "，同埋" + items[items.length - 1];
  }

  function chunkEn(cls, n, regions) {
    var regs = unique(regions);
    if (n === 1) return "one " + cls + " " + regionEn(regs[0] || "centre");
    if (n === 2 && regs.length === 2) {
      return "two " + pluralize(cls, 2) + ", one " + regionEn(regs[0]) + " and one " + regionEn(regs[1]);
    }
    if (regs.length === 1) return enCount(n) + " " + pluralize(cls, n) + " " + regionEn(regs[0]);
    return enCount(n) + " " + pluralize(cls, n) + " across the frame";
  }

  function chunkZh(cls, n, regions) {
    var regs = unique(regions);
    var m = measure(cls);
    var name = zhName(cls);
    if (n === 1) return zhCount(1) + m + name + "喺" + (REGION_ZH[regs[0]] || "畫面入面");
    if (n === 2 && regs.length === 2) {
      return "兩" + m + name + "，一" + m + "喺" + REGION_ZH[regs[0]] + "，一" + m + "喺" + REGION_ZH[regs[1]];
    }
    if (regs.length === 1) return zhCount(n) + m + name + "都喺" + REGION_ZH[regs[0]];
    return zhCount(n) + m + name + "散佈喺唔同位置";
  }

  function countEnWords(s) {
    return (s || "").trim().split(/\s+/).filter(Boolean).length;
  }
  function countZhChars(s) {
    return (s || "").replace(/\s+/g, "").length;
  }

  function describe(predictions, canvasW, canvasH, minScore) {
    minScore = typeof minScore === "number" ? minScore : 0.5;
    var filtered = (predictions || []).filter(function (p) {
      return p && p.score >= minScore && p.bbox && canvasW > 0 && canvasH > 0;
    });

    if (!filtered.length) {
      return {
        en: "I cannot pick out any of the eighty object types this model knows. Buildings, sky, and scenery stay unnamed even when clearly visible.",
        zh: "呢個模型認唔到畫面入面嘅常見物件。建築物同天空唔喺八十類裏面，叫唔到名。",
        signature: "empty"
      };
    }

    var byClass = {};
    var largest = null;
    var sig = [];

    filtered.forEach(function (p) {
      var r = regionOf(p.bbox, canvasW, canvasH);
      if (!byClass[p.class]) byClass[p.class] = { cls: p.class, count: 0, regions: [], totalArea: 0 };
      var g = byClass[p.class];
      g.count += 1;
      g.regions.push(r.key);
      g.totalArea += r.area;
      if (!largest || r.area > largest.share) largest = { cls: p.class, share: r.area };
      sig.push(r.key + ":" + p.class + ":" + Math.round(r.area * 1000));
    });

    var groups = Object.keys(byClass).map(function (k) { return byClass[k]; });
    groups.sort(function (a, b) {
      return b.totalArea - a.totalArea || b.count - a.count;
    });
    var hasMore = groups.length > 3;
    var top = groups.slice(0, 3);
    var onlyBoats = top.length === 1 && top[0].cls === "boat";
    var hasBoat = top.some(function (g) { return g.cls === "boat"; });

    var enChunks = top.map(function (g) { return chunkEn(g.cls, g.count, g.regions); });
    var zhChunks = top.map(function (g) { return chunkZh(g.cls, g.count, g.regions); });

    // Sentence 1 — summary
    var en1, zh1;
    if (onlyBoats) {
      // Prefer: "two boats on the water, one at … and one at …"
      var bg = top[0];
      var bregs = unique(bg.regions);
      if (bg.count === 2 && bregs.length === 2) {
        en1 = "I can see two boats on the water, one " + regionEn(bregs[0]) + " and one " + regionEn(bregs[1]) + ".";
        zh1 = "畫面入面我見到兩艘船喺水上面，一艘喺" + REGION_ZH[bregs[0]] + "，一艘喺" + REGION_ZH[bregs[1]] + "。";
      } else if (bg.count === 1) {
        en1 = "I can see one boat on the water " + regionEn(bregs[0] || "centre") + ".";
        zh1 = "畫面入面我見到一艘船喺水上面，位置喺" + (REGION_ZH[bregs[0]] || "畫面入面") + "。";
      } else {
        en1 = "I can see " + enCount(bg.count) + " boats on the water.";
        zh1 = "畫面入面我見到" + zhCount(bg.count) + "艘船喺水上面。";
      }
    } else if (top.length === 1) {
      en1 = "I can see " + enChunks[0] + ".";
      zh1 = "畫面入面我見到" + zhChunks[0] + "。";
    } else {
      en1 = "I can see " + joinEn(enChunks) + ".";
      zh1 = "畫面入面我見到" + joinZh(zhChunks) + "。";
    }
    if (hasMore) {
      en1 = en1.replace(/\.$/, "") + ", and a few other things.";
      zh1 = zh1.replace(/。$/, "") + "，仲有少少其他嘢。";
    }

    // Sentence 2 — one helpful extra only (keep total ~20–30 words / chars)
    var en2 = "";
    var zh2 = "";
    var share = largest ? largest.share : 0;
    var cls = largest ? largest.cls : "";

    if (cls === "person" && share >= 0.35) {
      en2 = "One person fills much of the frame, so they are likely close to the camera.";
      zh2 = "有個人佔咗好多畫面，睇落離鏡頭幾近。";
    } else if (share >= 0.45) {
      en2 = "That " + cls + " fills most of the frame, so it is probably close to the camera.";
      zh2 = "嗰" + measure(cls) + zhName(cls) + "佔咗大半個畫面，應該離鏡頭幾近。";
    } else if (share >= 0.22) {
      en2 = "The " + cls + " takes a fair share of the frame and looks fairly near.";
      zh2 = "嗰" + measure(cls) + zhName(cls) + "佔咗唔少畫面，睇落唔算遠。";
    } else if (filtered.length <= 2) {
      en2 = "Buildings and sky stay unnamed because they are outside the eighty categories.";
      zh2 = "建築物同天空唔喺八十類裏面，叫唔到名。";
    } else if (share < 0.08) {
      en2 = "The detections look small, so distant detail is easy for this model to miss.";
      zh2 = "偵測到嘅嘢都幾細，遠景好容易俾模型漏咗。";
    } else {
      en2 = "Nothing else among the model's categories stands out as clearly.";
      zh2 = "模型識嘅類別裏面，其他嘢冇咁突出。";
    }

    // If boats dominate as small objects, prefer water + category note over weak closeness
    if (hasBoat && share < 0.15 && filtered.length <= 3) {
      en2 = "Buildings and sky stay unnamed because they are outside the eighty categories.";
      zh2 = "建築物同天空唔喺八十類裏面，叫唔到名。";
    }

    // If sentence 1 already carries enough length, keep sentence 2 short or drop it
    if (countEnWords(en1) >= 18) {
      // keep a short second sentence only when it adds closeness (not the categories note)
      if (/fills most|fills much|fair share|fairly near|close to the camera/i.test(en2)) {
        /* keep */
      } else {
        en2 = "";
      }
    }
    if (countZhChars(zh1) >= 24) {
      if (/佔咗|離鏡頭|離鏡頭/.test(zh2)) {
        /* keep closeness */
      } else {
        zh2 = "";
      }
    }

    var en = (en1 + (en2 ? " " + en2 : "")).replace(/\s+/g, " ").trim();
    var zh = (zh1 + zh2).trim();

    // Prefer dropping sentence 2 rather than mid-cut if still too long
    if (countEnWords(en) > 35) {
      en = en1;
      if (countEnWords(en) < 15) en = en1 + " Nothing else stands out clearly.";
    }
    if (countZhChars(zh) > 40) {
      zh = zh1;
      if (countZhChars(zh) < 15) zh = zh1 + "其他嘢暫時叫唔到。";
    }

    return { en: en, zh: zh, signature: sig.sort().join("|") };
  }

  global.LabCaption = {
    describe: describe,
    CLASS_ZH: CLASS_ZH,
    countEnWords: countEnWords,
    countZhChars: countZhChars
  };
})(typeof window !== "undefined" ? window : globalThis);
