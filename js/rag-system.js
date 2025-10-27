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
        const response = document.createElement('p');
        response.textContent = result.response;
        resultDiv.appendChild(response);
        const ul = document.createElement('ul');
        result.sources.forEach((source, index) => {
            let levelText = source.document.metadata.level;
            let levelIcon = '';
            switch (levelText) {
                case 'beginner':
                    levelIcon = '🌱';
                    break;
                case 'intermediate':
                    levelIcon = '🌿';
                    break;
                case 'advanced':
                    levelIcon = '🍀';
                    break;
            }
            let similarity = source.similarity;
            let color = similarity > 0.8 ? 'green' : similarity > 0.5 ? 'orange' : 'gray';
            const li = document.createElement('li');
            li.setAttribute('style', `color: ${color}`);
            li.insertAdjacentText('beforeend', `${levelIcon} 💻 文書${index + 1} (類似度: ${source.similarity.toFixed(3)})`);
            li.insertAdjacentElement('beforeend', document.createElement('br'));
            li.insertAdjacentText('beforeend', source.document.text);
            li.insertAdjacentElement('beforeend', document.createElement('br'));
            li.insertAdjacentText('beforeend', `📖 ${source.document.metadata.title} | 📂 ${source.document.metadata.subject} | ${levelIcon} ${levelText}`);
            ul.appendChild(li);
        });
        resultDiv.appendChild(ul);
        console.log(result);
    }
}