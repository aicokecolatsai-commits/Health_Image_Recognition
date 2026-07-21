/**
 * HistoryManager - 脊椎評估歷史紀錄管理
 * 使用 localStorage 儲存
 */
export class HistoryManager {
    constructor(storageKey = 'moveageeye_scoliosis_history') {
        this.storageKey = storageKey;
    }

    /**
     * 取得所有紀錄（最新的在前）
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * 儲存一筆紀錄
     * @param {Object} result - SpineAnalyzer 的分析結果
     * @param {string} [thumbnail] - 小縮圖 base64（可選）
     */
    save(result, thumbnail = null) {
        const records = this.getAll();
        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString('zh-TW'),
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            totalScore: result.totalScore,
            severity: result.severity,
            details: result.details,
            advice: result.advice,
            thumbnail
        };
        records.unshift(record); // 新的在前
        // 最多保留 50 筆
        if (records.length > 50) records.length = 50;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(records));
        } catch (e) {
            // 可能超過 localStorage 容量，移除舊的縮圖
            records.forEach(r => { r.thumbnail = null; });
            localStorage.setItem(this.storageKey, JSON.stringify(records));
        }
        return record;
    }

    /**
     * 刪除一筆紀錄
     */
    delete(id) {
        const records = this.getAll().filter(r => r.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(records));
    }

    /**
     * 清空所有紀錄
     */
    clearAll() {
        localStorage.removeItem(this.storageKey);
    }
}
