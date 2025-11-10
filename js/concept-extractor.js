// js/concept-extractor.js - 文章から概念を抽出

class ConceptExtractor {
  constructor() {
    // 概念とそのキーワードのマッピング
    this.conceptKeywords = new Map([
      [
        "programming",
        ["プログラミング", "プログラム", "コーディング", "coding"],
      ],
      ["variables", ["変数", "variable", "var", "let", "const"]],
      ["functions", ["関数", "function", "メソッド", "method"]],
      ["loops", ["ループ", "for", "while", "繰り返し", "iteration"]],
      ["conditionals", ["条件分岐", "if", "else", "条件", "conditional"]],
      ["data-structures", ["データ構造", "data structure", "配列", "array"]],
      ["algorithms", ["アルゴリズム", "algorithm", "計算手法"]],
      ["recursion", ["再帰", "recursion", "再帰的"]],
      ['object-oriented', ['オブジェクト指向', 'OOP', 'クラス', 'インスタンス']],
      ['inheritance', ['継承', 'inheritance', '親クラス', '子クラス']],
    ]);
  }

  // 文章から概念を抽出
  extractConcepts(text) {
    const concepts = [];
    const lowerText = text.toLowerCase();

    // 各概念のキーワードをチェック
    for (const [concept, keywords] of this.conceptKeywords) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          concepts.push(concept);
          break; // この概念は見つかったので次へ
        }
      }
    }

    // 重複を除去
    return [...new Set(concepts)];
  }

  // 新しい概念キーワードを追加
  addConceptKeywords(concept, keywords) {
    if (this.conceptKeywords.has(concept)) {
      const existing = this.conceptKeywords.get(concept);
      this.conceptKeywords.set(concept, [...existing, ...keywords]);
    } else {
      this.conceptKeywords.set(concept, keywords);
    }
  }

  // デバッグ用：抽出結果を表示
  analyzeText(text) {
    console.log("=== 概念抽出分析 ===");
    console.log("入力テキスト:", text.substring(0, 100) + "...");

    const concepts = this.extractConcepts(text);
    console.log("抽出された概念:", concepts);

    return concepts;
  }
}