// js/attention-demo.js
class SimpleAttention {
  // Q·K^T のスコア列を計算
  scores(query, keys) {
    return keys.map(k => this.dot(query, k));
  }
  // ソフトマックス（数値安定化）
  softmax(xs) {
    const m = Math.max(...xs);
    const exps = xs.map(x => Math.exp(x - m));
    const s = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / s);
  }
  // 内積
  dot(a, b) {
    if (a.length !== b.length) throw new Error("次元が一致しません");
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }
  // 重み付き和
  weightedSum(weights, values) {
    if (weights.length !== values.length) {
      throw new Error("weights と values の長さが一致しません");
    }
    return values.reduce((acc, v, i) => acc + v * weights[i], 0);
  }
  // 一括計算
  compute(query, keys, values) {
    // 入力検証
    if (!Array.isArray(query) || !Array.isArray(keys) || !Array.isArray(values)) {
      throw new Error("query/keys/values は配列で指定してください（JSON配列）");
    }
    if (keys.length !== values.length) {
      throw new Error("keys配列の個数と values配列の個数は一致させてください");
    }
    const d = query.length;
    if (!keys.every(k => Array.isArray(k) && k.length === d)) {
      throw new Error("すべての key の次元が query と一致している必要があります");
    }
    // 計算
    const sc = this.scores(query, keys);                  // QK^T
    const dk = Math.sqrt(query.length);                   // √d_k
    const scaled = sc.map(s => s / dk);                   // スケーリング
    const w = this.softmax(scaled);                       // softmax
    const y = this.weightedSum(w, values);                // 重み付き和
    return { scores: sc, scaledScores: scaled, weights: w, result: y };
  }
}

// ---- UI まわり ----
function $(id) { return document.getElementById(id); }

function pretty(num) {
  return (typeof num === "number") ? Number(num.toFixed(6)) : num;
}

function loadSample() {
  $("q-input").value = "[1, 0.5, -1]";
  $("k-input").value = "[[1,0,0],[0,1,0],[0,0,1]]";
  $("v-input").value = "[10,20,30]";
  $("notes").textContent = "サンプルを読み込みました。実行してみましょう。";
}

function runDemo() {
  const out = $("attn-output");
  out.textContent = "";
  $("notes").textContent = "";

  try {
    const q = JSON.parse($("q-input").value);
    const k = JSON.parse($("k-input").value);
    const v = JSON.parse($("v-input").value);

    const model = new SimpleAttention();
    const { scores, scaledScores, weights, result } = model.compute(q, k, v);

    const rows = weights.map((w, i) => ({
      i,
      score: pretty(scores[i]),
      scaled: pretty(scaledScores[i]),
      weight: pretty(w),
      value: pretty(v[i]),
      contrib: pretty(v[i] * w)
    }));

    const table = [
      ["Index","Score(Q·Kᵢ)","Scaled(/√d)","Weight(softmax)","Value(Vᵢ)","Contribution(Vᵢ×wᵢ)"],
      ...rows.map(r => [r.i, r.score, r.scaled, r.weight, r.value, r.contrib])
    ].map(cols => cols.join("\t")).join("\n");

    out.textContent =
      "【Weights と結果】\n" +
      table + "\n\n" +
      "Result (重み付き和) = " + pretty(result);
  } catch (e) {
    $("notes").textContent = "⚠️ " + e.message + "（JSONの形式や次元を確認）";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const run = $("run-attn");
  const sample = $("load-sample");
  if (run && sample) {
    sample.addEventListener("click", loadSample);
    run.addEventListener("click", runDemo);
  }
});

async function testAttention() {
  const model = new SimpleAttention();
  const queries = [
    [1, 0], // 単語Aからの視点
    [0, 1]  // 単語Bからの視点
  ];
  const keys = [[1, 0], [0, 1]];
  const values = [10, 20];

  for (const q of queries) {
    const result = model.compute(q, keys, values);
    console.log('Query:', q, '→ Attention result:', result);
  }
}