// js/semantic-rag.js - オントロジー強化RAGシステム

class SemanticRAGSystem {
  constructor() {
    // 第2回で作成したVectorSearchEngineを利用
    this.searchEngine = new VectorSearchEngine();

    // 第1回で作成したLLMクライアントを利用
    this.llm = new EducationLLMClient(API_CONFIG.studentId);

    // 新しく作成したオントロジーと概念抽出器
    this.ontology = new LearningOntology();
    this.conceptExtractor = new ConceptExtractor();

    this.initialized = false;
  }

  // 初期化
  async initialize(documents, ontologyData) {
    console.log("🚀 セマンティックRAGシステム初期化中...");

    try {
      // 1. オントロジーの読み込み
      await this.ontology.loadOntology(ontologyData);

      // 2. 文書のインデックス化
      console.log("📄 文書をインデックス化中...");
      for (const doc of documents) {
        await this.searchEngine.addDocument(doc.content, doc);
      }
      console.log(`✅ ${documents.length}件の文書を登録完了`);

      this.initialized = true;
      console.log("✅ セマンティックRAGシステム準備完了！");
    } catch (error) {
      console.error("❌ 初期化エラー:", error);
      throw error;
    }
  }

  // クエリの意味的拡張
  async expandQuery(query) {
    console.log("🔍 クエリを拡張中:", query);

    // 1. クエリから概念を抽出
    const concepts = this.conceptExtractor.extractConcepts(query);
    console.log("抽出された概念:", concepts);

    // 2. オントロジーで関連概念を発見
    const expandedConcepts = new Set(concepts);

    for (const concept of concepts) {
      // 関連概念を追加
      const relatedConcepts = this.ontology.findRelatedConcepts(concept, 1);
      relatedConcepts.forEach((c) => expandedConcepts.add(c));

      // 前提知識を追加
      const prerequisites = this.ontology.getPrerequisiteChain(concept);
      prerequisites.forEach((c) => expandedConcepts.add(c));
    }

    console.log("拡張された概念:", Array.from(expandedConcepts));

    // 3. 拡張されたクエリを生成
    const expandedQuery = this.buildExpandedQuery(query, expandedConcepts);

    return {
      original: query,
      concepts: Array.from(concepts),
      expandedConcepts: Array.from(expandedConcepts),
      expandedQuery: expandedQuery,
    };
  }

  // 拡張クエリの構築
  buildExpandedQuery(originalQuery, concepts) {
    // 概念のラベルを取得
    const conceptLabels = Array.from(concepts)
      .map((c) => this.ontology.getConcept(c))
      .filter((c) => c !== undefined)
      .map((c) => c.label);

    // 元のクエリに概念を追加
    return `${originalQuery} ${conceptLabels.join(" ")}`;
  }

  // セマンティック検索
  async semanticQuery(question, options = {}) {
    if (!this.initialized) {
      throw new Error("システムが初期化されていません");
    }

    console.log("\n=== セマンティック検索開始 ===");
    console.log("質問:", question);

    try {
      // 1. クエリ拡張
      const expandedQuery = await this.expandQuery(question);
      console.log("拡張クエリ:", expandedQuery.expandedQuery);

      // 2. 拡張されたクエリで検索
      const relevantDocs = await this.searchEngine.search(
        expandedQuery.expandedQuery,
        options.retrieveCount || 5
      );

      if (relevantDocs.length === 0) {
        console.log("⚠️ 関連文書が見つかりませんでした");
        return await this.llm.chat(question);
      }

      // 3. オントロジーベースのリランキング
      const rerankedDocs = this.rerankWithOntology(
        relevantDocs,
        expandedQuery.concepts
      );

      // 4. コンテキスト構築
      const context = this.buildSemanticContext(
        rerankedDocs.slice(0, 3),
        expandedQuery
      );

      // 5. セマンティックプロンプト生成
      const prompt = this.buildSemanticPrompt(question, context, expandedQuery);

      // 6. LLMで回答生成
      console.log("🤖 LLMで回答生成中...");
      const response = await this.llm.chat(prompt, options);

      console.log("✅ 回答生成完了");

      return {
        answer: response.response,
        originalQuery: question,
        expandedQuery: expandedQuery,
        sources: rerankedDocs.slice(0, 3),
        conceptsUsed: expandedQuery.expandedConcepts,
        usage: response.usage,
      };
    } catch (error) {
      console.error("❌ セマンティック検索エラー:", error);
      throw error;
    }
  }

  // オントロジーベースのリランキング
  rerankWithOntology(documents, queryConcepts) {
    console.log("📊 オントロジーベースのリランキング中...");

    return documents
      .map((doc) => {
        // 文書から概念を抽出
        const docConcepts = this.conceptExtractor.extractConcepts(
          doc.document.text
        );

        // セマンティック関連度を計算
        const semanticScore = this.calculateSemanticRelevance(
          queryConcepts,
          docConcepts
        );

        // ベクトル類似度とセマンティックスコアを組み合わせ
        const combinedScore = doc.similarity * 0.6 + semanticScore * 0.4;

        return {
          ...doc,
          semanticScore: semanticScore,
          combinedScore: combinedScore,
          docConcepts: docConcepts,
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }

  // セマンティック関連度の計算
  calculateSemanticRelevance(queryConcepts, docConcepts) {
    let relevanceScore = 0;

    for (const queryConcept of queryConcepts) {
      for (const docConcept of docConcepts) {
        if (queryConcept === docConcept) {
          // 直接マッチ
          relevanceScore += 1.0;
        } else {
          // オントロジーで関連概念かチェック
          const relatedConcepts = this.ontology.findRelatedConcepts(
            queryConcept,
            1
          );
          if (relatedConcepts.includes(docConcept)) {
            // 関連概念マッチ
            relevanceScore += 0.5;
          }
        }
      }
    }

    // 正規化（0〜1の範囲に）
    const maxScore = Math.max(queryConcepts.length, 1);
    return Math.min(1.0, relevanceScore / maxScore);
  }

  // セマンティックコンテキストの構築
  buildSemanticContext(rerankedDocs, expandedQuery) {
    let context = "参考文書:\n\n";

    rerankedDocs.forEach((doc, index) => {
      context += `[文書${index + 1}]\n`;
      context += `${doc.document.text}\n`;
      context += `（関連概念: ${doc.docConcepts.join(", ")}）\n\n`;
    });

    context += `\n検索で使用された概念: ${expandedQuery.expandedConcepts.join(
      ", "
    )}`;

    return context;
  }

  // セマンティックプロンプトの構築
  buildSemanticPrompt(question, context, expandedQuery) {
    return `あなたは学習支援AIです。以下の文書と概念の関係を考慮して回答してください。

${context}

質問: ${question}

回答の際は、関連する概念の繋がりも説明してください。
回答:`;
  }

  // 結果の表示
  displayRAGResult(result) {
    const container = document.getElementById("semantic-result");

    let html = `
            <div class="semantic-answer">
                <h3>🤖 AI回答:</h3>
                <p>${result.answer}</p>

                <h4>🔍 検索情報:</h4>
                <ul>
                    <li><strong>元の質問:</strong> ${result.originalQuery}</li>
                    <li><strong>抽出された概念:</strong> ${result.expandedQuery.concepts.join(
                      ", "
                    )}</li>
                    <li><strong>拡張された概念:</strong> ${result.expandedQuery.expandedConcepts.join(
                      ", "
                    )}</li>
                </ul>

                <h4>📚 参考文書（類似度順）:</h4>
        `;

    result.sources.forEach((source, index) => {
      const similarityPercent = (source.similarity * 100).toFixed(1);
      const semanticPercent = (source.semanticScore * 100).toFixed(1);
      const combinedPercent = (source.combinedScore * 100).toFixed(1);

      html += `
                <div class="source-doc" style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #2196F3;">
                    <strong>文書${index + 1}</strong>
                    <span style="color: #666; font-size: 0.9em;">
                        (ベクトル: ${similarityPercent}%,
                         セマンティック: ${semanticPercent}%,
                         総合: ${combinedPercent}%)
                    </span>
                    <p>${source.document.text.substring(0, 150)}...</p>
                    <small>関連概念: ${source.docConcepts.join(", ")}</small>
                </div>
            `;
    });

    html += `
                <small style="color: #666;">
                    使用トークン: ${result.usage.total_tokens}
                </small>
            </div>
        `;

    container.innerHTML = html;
  }
}