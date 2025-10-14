// js/vector-search.js
class VectorSearchEngine {
    constructor() {
        this.documents = [];
        this.embeddings = [];
        // 第1回で作成したクライアントを再利用
        this.llm = new EducationLLMClient(
            API_CONFIG.studentId  // config.jsから取得
        );
    }
    
    async addDocument(text, metadata = {}) {
        // getEmbedding() は第1回で実装済み
        const embedding = await this.llm.getEmbedding(text);
        
        const docId = this.documents.length;
        this.documents.push({
            id: docId,
            text: text,
            metadata: metadata
        });
        this.embeddings.push(embedding);
        
        return docId;
    }
    
    async search(query, topK = 5) {
        // 1. クエリの埋め込み生成
        const queryEmbedding = await this.llm.getEmbedding(query);
        
        // 2. 全文書との類似度計算
        const similarities = this.embeddings.map((docEmb, idx) => ({
            docId: idx,
            document: this.documents[idx],
            similarity: this.cosineSimilarity(queryEmbedding, docEmb),
        }));
        
        // 3. 類似度でソート
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // 4. 上位K件を返す
        return similarities.slice(0, topK);
    }
    
    cosineSimilarity(vectorA, vectorB) {
        // 内積を計算
        const dotProduct = vectorA.reduce(
            (sum, a, i) => sum + a * vectorB[i], 
            0
        );
        
        // ノルム（長さ）を計算
        const normA = Math.sqrt(
            vectorA.reduce((sum, a) => sum + a * a, 0)
        );
        const normB = Math.sqrt(
            vectorB.reduce((sum, b) => sum + b * b, 0)
        );
        
        // コサイン類似度
        return dotProduct / (normA * normB);
    }
}

async function testVectorSearch() {
    const engine = new VectorSearchEngine();
    
    // テスト用に3件追加
    await engine.addDocument("Pythonは人気のプログラミング言語");
    await engine.addDocument("変数はデータを保存する場所");
    await engine.addDocument("機械学習はAIの一分野");
    
    // 検索
    const results = await engine.search("プログラミング", 2);
    console.table(results.map(r => ({
        text: r.document.text.substring(0, 30),
        similarity: r.similarity.toFixed(3)
    })));
}