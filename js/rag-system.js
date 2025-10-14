// js/rag-system.js
class RAGSystem {
    constructor() {
        this.searchEngine = new VectorSearchEngine();
        // 第1回で作成したクライアントを再利用
        this.llm = new EducationLLMClient(API_CONFIG.studentId);
    }
    
    async initialize(documents) {
        console.log('RAGシステム初期化中...');
        for (const doc of documents) {
            await this.searchEngine.addDocument(
                doc.content, 
                doc  // メタデータも保存
            );
        }
        console.log(`${documents.length}件の文書を登録完了！`);
    }
    
    async query(question, options = {}) {
        // 1. 関連文書の検索
        const relevantDocs = await this.searchEngine.search(
            question, 
            options.retrieveCount || 3
        );
        
        if (relevantDocs.length === 0) {
            // 関連文書がなければ通常のLLM
            return await this.llm.chat(question);
        }
        
        // 2. コンテキストの構築
        const context = this.buildContext(relevantDocs);
        
        // 3. プロンプトの生成
        const prompt = this.buildPrompt(question, context);
        
        // 4. LLMで回答生成
        const response = await this.llm.chat(prompt);
        
        return { ...response, sources: relevantDocs };
    }
    
    buildContext(relevantDocs) {
        return relevantDocs
            .map((doc, index) => 
                `[文書${index + 1}] ${doc.document.text}`
            )
            .join('\n\n');
    }
    
    buildPrompt(question, context) {
        return `以下の文書を参考にして、質問に答えてください。

参考文書:
${context}

質問: ${question}

回答:`;
    }

    displayRAGResult(result) {
        const resultDiv = document.getElementById('rag-result');
        const responseDiv = document.createElement('div');
        responseDiv.textContent = result.response;
        resultDiv.appendChild(responseDiv);

        // TODO: 参考文書の表示を仕上げる
        // 表示のイメージ：
        // 🌱 💻 文書1 (類似度: 0.892)
        // 変数は、データを格納するための...
        // 📖 変数の概念 | 📂 programming | 🌱 beginner
        //
        // 🌿 💻 文書2 (類似度: 0.654)
        // 関数は変数を使って...
        // 📖 関数の基本 | 📂 programming | 🌿 intermediate
        
        console.log(result);
    }
}