/**
 * Scoliosis Module - 脊椎側彎辨識流程控制
 */
import { Camera } from './camera.js';
import { PoseDetector } from './poseDetector.js';
import { SpineAnalyzer } from './spineAnalyzer.js';
import { HistoryManager } from './historyManager.js';

export class ScoliosisModule {
    constructor() {
        this.camera = null;
        this.detector = null;
        this.analyzer = new SpineAnalyzer();
        this.history = new HistoryManager();
        this.currentResult = null;
        this.capturedImage = null; // base64

        // 螢幕
        this.screens = {
            start: document.getElementById('scoliosis-start-screen'),
            guide: document.getElementById('scoliosis-guide-screen'),
            analyzing: document.getElementById('scoliosis-analyzing-screen'),
            result: document.getElementById('scoliosis-result-screen'),
            history: document.getElementById('scoliosis-history-screen')
        };

        // UI 元素
        this.ui = {
            cameraBtn: document.getElementById('scol-camera-btn'),
            uploadBtn: document.getElementById('scol-upload-btn'),
            historyBtn: document.getElementById('scol-history-btn'),
            fileInput: document.getElementById('scol-file-input'),
            captureBtn: document.getElementById('scol-capture-btn'),
            countdown: document.getElementById('scol-countdown'),
            progress: document.getElementById('scol-progress'),
            resultCanvas: document.getElementById('scol-result-canvas'),
            scoreCircle: document.getElementById('scol-score-circle'),
            scoreNum: document.getElementById('scol-score-num'),
            severity: document.getElementById('scol-severity'),
            details: document.getElementById('scol-details'),
            advice: document.getElementById('scol-advice'),
            saveBtn: document.getElementById('scol-save-btn'),
            retryBtn: document.getElementById('scol-retry-btn'),
            historyList: document.getElementById('scol-history-list'),
            // Back buttons
            backBtn: document.getElementById('scoliosis-back-btn'),
            guideBackBtn: document.getElementById('scol-guide-back-btn'),
            resultBackBtn: document.getElementById('scol-result-back-btn'),
            historyBackBtn: document.getElementById('scol-history-back-btn'),
        };

        this._bindEvents();
    }

    /**
     * 傳入共用的 camera 和 detector
     */
    setSharedModules(camera, detector) {
        this.camera = camera;
        this.detector = detector;
    }

    _bindEvents() {
        // 主選單
        this.ui.cameraBtn.addEventListener('click', () => this._showGuide());
        this.ui.uploadBtn.addEventListener('click', () => this.ui.fileInput.click());
        this.ui.fileInput.addEventListener('change', (e) => this._handleFileUpload(e));
        this.ui.historyBtn.addEventListener('click', () => this._showHistory());

        // 拍照
        this.ui.captureBtn.addEventListener('click', () => this._startCapture());

        // 結果頁
        this.ui.saveBtn.addEventListener('click', () => this._saveResult());
        this.ui.retryBtn.addEventListener('click', () => this._showGuide());

        // 返回按鈕
        this.ui.guideBackBtn.addEventListener('click', () => this.showStart());
        this.ui.historyBackBtn.addEventListener('click', () => this.showStart());
    }

    // ============ 螢幕管理 ============

    showStart() {
        this._hideAll();
        this.screens.start.classList.add('active');
    }

    async _showGuide() {
        // 確保攝影機已啟動
        if (this.camera && !this.camera.isRunning) {
            try {
                await this.camera.start();
            } catch (err) {
                alert('無法開啟攝影機：' + err.message + '\n\n請改用「從相簿選取」功能。');
                return;
            }
        }
        this._hideAll();
        this.screens.guide.classList.add('active');
    }

    _showAnalyzing() {
        this._hideAll();
        this.screens.analyzing.classList.add('active');
        this.ui.progress.style.width = '0%';
    }

    _showResult() {
        this._hideAll();
        this.screens.result.classList.add('active');
    }

    _showHistory() {
        this._hideAll();
        this.screens.history.classList.add('active');
        this._renderHistory();
    }

    _hideAll() {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
    }

    // ============ 拍照流程 ============

    async _startCapture() {
        if (!this.camera || !this.camera.isRunning) {
            alert('攝影機尚未啟動');
            return;
        }

        // 3 秒倒數
        this.ui.captureBtn.style.display = 'none';
        this.ui.countdown.style.display = 'flex';

        for (let i = 3; i >= 1; i--) {
            this.ui.countdown.textContent = i;
            await this._delay(1000);
        }
        this.ui.countdown.textContent = '📸';
        await this._delay(300);
        this.ui.countdown.style.display = 'none';
        this.ui.captureBtn.style.display = '';

        // 擷取畫面
        const video = document.getElementById('camera-video');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const ctx = tempCanvas.getContext('2d');
        // 鏡像翻轉
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -tempCanvas.width, 0, tempCanvas.width, tempCanvas.height);
        ctx.restore();
        this.capturedImage = tempCanvas.toDataURL('image/jpeg', 0.85);

        // 偵測姿勢並分析
        await this._analyzeFromVideo(video);
    }

    // ============ 從相簿上傳 ============

    async _handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.ui.fileInput.value = ''; // reset

        // 讀取圖片
        const img = await this._loadImage(file);
        this.capturedImage = this._imageToBase64(img);

        // 偵測姿勢
        await this._analyzeFromImage(img);
    }

    _loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    _imageToBase64(img) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/jpeg', 0.85);
    }

    // ============ AI 分析 ============

    async _analyzeFromVideo(video) {
        this._showAnalyzing();
        this.ui.progress.style.width = '30%';

        try {
            // 確保偵測器就緒
            if (!this.detector.isReady) {
                await this.detector.init();
            }
            this.ui.progress.style.width = '50%';

            // 偵測姿勢
            const pose = await this.detector.detect(video);
            this.ui.progress.style.width = '70%';

            if (!pose) {
                alert('未偵測到人體，請確保全身在畫面中，再試一次。');
                this._showGuide();
                return;
            }

            // 分析
            this.currentResult = this.analyzer.analyze(pose.keypoints);
            this.ui.progress.style.width = '100%';

            await this._delay(500);

            if (!this.currentResult.success) {
                alert(this.currentResult.error + '\n\n請確保拍到肩膀和骨盆，再試一次。');
                this._showGuide();
                return;
            }

            this._renderResult();
            this._showResult();

        } catch (err) {
            console.error('分析錯誤:', err);
            alert('分析過程發生錯誤，請重試。');
            this.showStart();
        }
    }

    async _analyzeFromImage(img) {
        this._showAnalyzing();
        this.ui.progress.style.width = '20%';

        try {
            if (!this.detector) {
                this.detector = new PoseDetector();
            }
            if (!this.detector.isReady) {
                await this.detector.init();
            }
            this.ui.progress.style.width = '50%';

            // 從圖片偵測姿勢
            const pose = await this.detector.detect(img);
            this.ui.progress.style.width = '70%';

            if (!pose) {
                alert('無法從照片偵測到人體。\n請確保照片中有清晰的正面或背面站立姿勢。');
                this.showStart();
                return;
            }

            this.currentResult = this.analyzer.analyze(pose.keypoints);
            this.ui.progress.style.width = '100%';
            await this._delay(500);

            if (!this.currentResult.success) {
                alert(this.currentResult.error + '\n\n請使用肩膀到骨盆清楚可見的照片。');
                this.showStart();
                return;
            }

            this._renderResult();
            this._showResult();

        } catch (err) {
            console.error('圖片分析錯誤:', err);
            alert('分析過程發生錯誤，請重試。');
            this.showStart();
        }
    }

    // ============ 結果呈現 ============

    _renderResult() {
        const r = this.currentResult;
        if (!r || !r.success) return;

        // 分數圓圈
        this.ui.scoreNum.textContent = r.totalScore;
        this.ui.scoreCircle.style.borderColor = r.severityColor;
        this.ui.scoreCircle.querySelector('.scol-score-num').style.color = r.severityColor;

        // 嚴重程度
        this.ui.severity.textContent = r.severity;
        this.ui.severity.style.color = r.severityColor;

        // 建議
        this.ui.advice.textContent = r.advice;

        // 細項
        const detailKeys = ['shoulder', 'hip', 'spine', 'trunk'];
        let html = '';
        detailKeys.forEach(key => {
            const d = r.details[key];
            const barColor = d.score >= 80 ? '#00ff88' : d.score >= 60 ? '#ffaa00' : '#ff4444';
            html += `
                <div class="scol-detail-row">
                    <span class="scol-detail-label">${d.label}</span>
                    <div class="scol-detail-bar-track">
                        <div class="scol-detail-bar" style="width:${d.score}%;background:${barColor}"></div>
                    </div>
                    <span class="scol-detail-score">${d.score}%</span>
                    <span class="scol-detail-info">${d.direction}</span>
                </div>`;
        });
        this.ui.details.innerHTML = html;

        // 結果照片 + 分析線疊加
        this._drawResultCanvas();
    }

    _drawResultCanvas() {
        const canvas = this.ui.resultCanvas;
        const ctx = canvas.getContext('2d');

        if (!this.capturedImage) return;

        const img = new Image();
        img.onload = () => {
            // 設定 canvas 尺寸（限制最大寬度）
            const maxW = Math.min(360, window.innerWidth - 40);
            const scale = maxW / img.naturalWidth;
            canvas.width = maxW;
            canvas.height = img.naturalHeight * scale;

            // 繪製照片
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 半透明背景讓分析線更清楚
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 疊加分析線
            this.analyzer.drawOverlay(ctx, this.currentResult, canvas.width, canvas.height);
        };
        img.src = this.capturedImage;
    }

    // ============ 儲存紀錄 ============

    _saveResult() {
        if (!this.currentResult || !this.currentResult.success) return;

        // 產生小縮圖
        let thumbnail = null;
        try {
            const c = document.createElement('canvas');
            c.width = 80;
            c.height = 80;
            const ctx = c.getContext('2d');
            const src = this.ui.resultCanvas;
            ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, 80, 80);
            thumbnail = c.toDataURL('image/jpeg', 0.5);
        } catch (e) { /* ignore */ }

        this.history.save(this.currentResult, thumbnail);
        this.ui.saveBtn.textContent = '✅ 已儲存';
        this.ui.saveBtn.disabled = true;
        setTimeout(() => {
            this.ui.saveBtn.innerHTML = '<span>💾</span> 儲存紀錄';
            this.ui.saveBtn.disabled = false;
        }, 2000);
    }

    // ============ 歷史紀錄 ============

    _renderHistory() {
        const records = this.history.getAll();
        if (records.length === 0) {
            this.ui.historyList.innerHTML = '<p class="scol-empty-msg">尚無紀錄<br>完成一次脊椎辨識後即可查看</p>';
            return;
        }

        let html = '';
        records.forEach(r => {
            const severityColor = r.totalScore >= 85 ? '#00ff88' : r.totalScore >= 65 ? '#ffaa00' : '#ff4444';
            html += `
                <div class="scol-history-card">
                    <div class="scol-history-left">
                        ${r.thumbnail ? `<img src="${r.thumbnail}" class="scol-history-thumb">` : '<div class="scol-history-thumb-placeholder">📷</div>'}
                    </div>
                    <div class="scol-history-right">
                        <span class="scol-history-date">${r.date} ${r.time}</span>
                        <span class="scol-history-score" style="color:${severityColor}">
                            ${r.totalScore} 分 ${r.severity}
                        </span>
                    </div>
                </div>`;
        });
        this.ui.historyList.innerHTML = html;
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
