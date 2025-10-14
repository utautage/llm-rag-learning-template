let ragSystem;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    ragSystem = new RAGSystem();
    
    // 既存のサンプル文書を読み込み
    const response = await fetch('data/sample-documents.json');
    const data = await response.json();
    
    await ragSystem.initialize(data.documents);
    console.log('✅ RAGシステム準備完了！');
});

// 質問処理
async function askRAG() {
    const question = document.getElementById('question').value;
    const result = await ragSystem.query(question);
    ragSystem.displayRAGResult(result);
}