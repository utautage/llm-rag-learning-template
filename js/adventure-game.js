// js/adventure-game.js

class AdventureGame {
    constructor() {
        this.llm = new EducationLLMClient(API_CONFIG.studentId);
        this.ragSystem = new RAGSystem(); // RAG用
        this.ontology = new LearningOntology(); // オントロジー用
        
        // プレイヤーの学習状況
        this.masteredConcepts = new Set();

        this.chatLog = document.getElementById('chat-log');
        this.npcSpeech = document.getElementById('npc-speech');
        this.choicesArea = document.getElementById('choices');
    }

    // ゲーム初期化
    async initialize(ontologyData, ragDocuments) {
        console.log("🚀 ゲーム初期化中...");
        
        // 1. オントロジー読み込み
        await this.ontology.loadOntology(ontologyData);
        console.log("✅ オントロジー読み込み完了");
        
        // 2. RAGシステムの初期化（豆知識文書を登録）
        await this.ragSystem.initialize(ragDocuments);
        console.log("✅ RAGシステム（豆知識）準備完了");
        
        // 3. 最初のシーンを開始
        this.startScene('cafe_entrance');
    }

    // シーン（場面）の管理
    async startScene(sceneId) {
        switch (sceneId) {
            case 'cafe_entrance':
                this.setNPCSpeech("AI:「さあ、入ろう。まずは店員さんに挨拶しないとね。」");
                
                // RAGで豆知識を検索
                const trivia = await this.ragSystem.query("ロンドンのカフェ文化は？", { retrieveCount: 1 });
                if (trivia.sources.length > 0) {
                    this.addLog(`（豆知識）${trivia.sources[0].document.text}`);
                }
                
                this.updateChoices([
                    { text: "店員に挨拶する", action: 'action_greet', required: null },
                    { text: "（まだ）注文する", action: 'action_order', required: 'greeting' }
                ]);
                break;
                
            case 'cafe_order':
                this.setNPCSpeech("AI:「挨拶はバッチリだね！じゃあ、注文してみよう。『I would like a ...』みたいに丁寧に言うのがコツだよ。」");
                this.updateChoices([
                    { text: "（挨拶に戻る）", action: 'action_greet', required: null },
                    { text: "（クリア！）ゲームデモ終了", action: null, required: 'ordering-food' }
                ]);
                break;
        }
    }

    // 選択肢の描画（オントロジー活用）
    updateChoices(choices) {
        this.choicesArea.innerHTML = '';
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.innerText = choice.text;
            
            // オントロジーで学習済みかチェック
            const isLocked = choice.required && !this.masteredConcepts.has(choice.required);
            
            if (isLocked) {
                button.disabled = true;
                button.innerText += ` (先に「${this.ontology.getConcept(choice.required).label}」が必要)`;
            } else {
                button.onclick = () => this.handleAction(choice.action);
            }
            this.choicesArea.appendChild(button);
        });
    }

    // アクションの処理
    handleAction(action) {
        if (action === 'action_greet') {
            this.addLog("あなた:「Hi, how are you?」（挨拶した）");
            // 挨拶の概念をマスター
            this.masteredConcepts.add('greeting');
            this.addLog("（システム：挨拶の概念をマスターした！）");
            this.startScene('cafe_order'); // 次のシーンへ
        }
        if (action === 'action_order') {
            this.addLog("あなた:「I'd like a coffee, please.」（注文した）");
            // 注文の概念をマスター
            this.masteredConcepts.add('ordering-food');
            this.addLog("（システム：注文の概念をマスターした！）");
            this.startScene('cafe_order'); // シーン更新
        }
    }

    // LLMを使った自由会話
    async sendPlayerChat(text) {
        this.addLog(`あなた: ${text}`);
        const prompt = `あなたは私の英語学習のパートナーAIです。以下の私の発言に対して、フレンドリーな旅仲間として英語で返答してください。\n\n私: ${text}\nAI:`;
        const response = await this.llm.chat(prompt);
        this.addLog(`AI: ${response.response}`);
    }

    // LLMを使った英語添削
    async checkPlayerEnglish(text) {
        this.addLog(`（システム：英語の添削を依頼...）`);
        const prompt = `あなたは優秀な英語教師です。以下の英文を添削し、より自然な表現があれば提案してください。\n\n英文: ${text}\n\n添削結果:`;
        const response = await this.llm.chat(prompt);
        this.addLog(`AI (添削): ${response.response}`);
    }

    // ログ・セリフのヘルパー関数
    addLog(message) { this.chatLog.innerHTML += `<p>${message}</p>`; }
    setNPCSpeech(message) { this.npcSpeech.innerText = message; }
}

// --- グローバル関数 ---
let game;

// ページの読み込み完了時
document.addEventListener('DOMContentLoaded', async () => {
    game = new AdventureGame();
    
    // 企画STEPで作成したJSONファイルを読み込む
    const [ontologyRes, ragRes] = await Promise.all([
        fetch('data/english-ontology.json'),
        fetch('data/adventure-documents.json')
    ]);
    const ontologyData = await ontologyRes.json();
    const ragData = await ragRes.json();
    
    // ゲームを初期化
    await game.initialize(ontologyData, ragData.documents);
});

// ボタン操作
async function sendPlayerInput() {
    const input = document.getElementById('player-input');
    if (input.value) {
        await game.sendPlayerChat(input.value);
        input.value = '';
    }
}
async function checkMyEnglish() {
    const input = document.getElementById('player-input');
    if (input.value) {
        await game.checkPlayerEnglish(input.value);
    }
}