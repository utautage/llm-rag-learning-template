// API設定
const API_CONFIG = {
    baseURL: 'https://llm-education-proxy.vercel.app', // 教員から伝えられたAPI URLに変更
    studentId: 'student_20', // 各自の学生IDに変更

    // APIリクエストのデフォルト設定
    defaultOptions: {
        temperature: 0.7,
        max_tokens: 500
    }
};

// 設定をエクスポート（他のファイルから使えるようにする）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}