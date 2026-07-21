/**
 * MoveAge Eye 2.0 - 主入口
 * 管理首頁 Landing、遊戲模組 (A)、脊椎辨識模組 (B) 的切換
 */
import { Camera } from './camera.js';
import { PoseDetector } from './poseDetector.js';
import { ScoliosisModule } from './scoliosis.js';

// 動態載入遊戲模組
let GameModule = null;

class App {
    constructor() {
        this.video = document.getElementById('camera-video');
        this.camera = new Camera(this.video);
        this.detector = new PoseDetector();
        this.scoliosis = new ScoliosisModule();

        this.currentModule = null; // 'game' | 'scoliosis' | null
        this.cameraReady = false;
        this.modelReady = false;

        // Landing 按鈕
        this.enterGameBtn = document.getElementById('enter-game-btn');
        this.enterScoliosisBtn = document.getElementById('enter-scoliosis-btn');

        // 各模組返回首頁按鈕
        this.categoryBackBtn = document.getElementById('category-back-btn');
        this.resultBackBtn = document.getElementById('result-back-btn');
        this.scolBackBtn = document.getElementById('scoliosis-back-btn');
        this.scolResultBackBtn = document.getElementById('scol-result-back-btn');

        this._bindEvents();
        this._showLanding();
    }

    _bindEvents() {
        this.enterGameBtn.addEventListener('click', () => this._enterGame());
        this.enterScoliosisBtn.addEventListener('click', () => this._enterScoliosis());

        // 返回首頁
        this.categoryBackBtn.addEventListener('click', () => this._showLanding());
        this.resultBackBtn.addEventListener('click', () => this._showLanding());
        this.scolBackBtn.addEventListener('click', () => this._showLanding());
        this.scolResultBackBtn.addEventListener('click', () => this._showLanding());
    }

    // ======== 螢幕管理 ========

    _hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    _showLanding() {
        this._hideAllScreens();
        document.getElementById('landing-screen').classList.add('active');
        this.currentModule = null;
    }

    _showScreen(id) {
        this._hideAllScreens();
        document.getElementById(id).classList.add('active');
    }

    // ======== A. 遊戲模組入口 ========

    async _enterGame() {
        this._showScreen('loading-screen');
        document.getElementById('loading-text').textContent = '正在載入 AI 模型...';
        document.getElementById('loading-progress').style.width = '20%';

        try {
            // 載入模型
            if (!this.modelReady) {
                await this.detector.init();
                this.modelReady = true;
            }
            document.getElementById('loading-progress').style.width = '50%';
            document.getElementById('loading-text').textContent = '正在啟動攝影機...';

            // 啟動攝影機
            if (!this.cameraReady) {
                const dims = await this.camera.start();
                this.cameraReady = true;
                // 延遲載入遊戲模組
                if (!GameModule) {
                    const module = await import('./app.js');
                    GameModule = module.Game;
                }
            }
            document.getElementById('loading-progress').style.width = '100%';
            document.getElementById('loading-text').textContent = '準備就緒！';

            await this._delay(500);

            // 初始化或顯示遊戲
            if (!this._gameInstance) {
                this._gameInstance = new GameModule(this.camera, this.detector);
            }
            this.currentModule = 'game';
            this._showScreen('category-screen');

        } catch (err) {
            console.error('遊戲載入失敗:', err);
            document.getElementById('loading-text').innerHTML = `❌ ${err.message}`;
            document.getElementById('loading-progress').style.width = '0%';
        }
    }

    // ======== B. 脊椎辨識入口 ========

    async _enterScoliosis() {
        this._showScreen('loading-screen');
        document.getElementById('loading-text').textContent = '正在載入 AI 模型...';
        document.getElementById('loading-progress').style.width = '20%';

        try {
            // 載入模型
            if (!this.modelReady) {
                await this.detector.init();
                this.modelReady = true;
            }
            document.getElementById('loading-progress').style.width = '50%';
            document.getElementById('loading-text').textContent = '正在啟動攝影機...';

            // 啟動攝影機
            if (!this.cameraReady) {
                try {
                    await this.camera.start();
                    this.cameraReady = true;
                } catch (camErr) {
                    // 脊椎辨識可以用相簿，攝影機非必要
                    console.warn('攝影機無法啟動，但仍可使用相簿上傳:', camErr.message);
                }
            }
            document.getElementById('loading-progress').style.width = '100%';

            // 傳入共用模組
            this.scoliosis.setSharedModules(this.camera, this.detector);

            await this._delay(300);
            this.currentModule = 'scoliosis';
            this.scoliosis.showStart();

        } catch (err) {
            console.error('脊椎辨識載入失敗:', err);
            document.getElementById('loading-text').innerHTML = `❌ ${err.message}`;
        }
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
