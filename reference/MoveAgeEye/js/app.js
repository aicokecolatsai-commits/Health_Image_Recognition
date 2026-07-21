/**
 * MoveAge Eye - 動作擺拍遊戲模組
 * 由 main.js 動態載入，接收共用的 Camera & PoseDetector
 */
import { SkeletonRenderer } from './skeleton.js';
import { PoseScorer } from './scoring.js';
import { getRandomPoses, drawPoseIcon, CATEGORIES } from './poses.js';

/** 角度名稱中文對照 */
const ANGLE_NAME_MAP = {
    'left_elbow': '左手肘',
    'left_shoulder_angle': '左肩膀',
    'right_elbow': '右手肘',
    'right_shoulder_angle': '右肩膀',
    'left_knee': '左膝蓋',
    'left_hip_angle': '左髖部',
    'right_knee': '右膝蓋',
    'right_hip_angle': '右髖部',
    'torso_lean': '軀幹傾斜',
    'shoulder_tilt': '肩膀角度'
};

export class Game {
    constructor(camera, detector) {
        // DOM 元素
        this.video = document.getElementById('camera-video');
        this.canvas = document.getElementById('skeleton-canvas');
        this.poseCanvas = document.getElementById('pose-icon-canvas');

        // 畫面
        this.screens = {
            category: document.getElementById('category-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen')
        };

        // 遊戲 UI 元素
        this.ui = {
            poseName: document.getElementById('pose-name'),
            poseEmoji: document.getElementById('pose-emoji'),
            poseDesc: document.getElementById('pose-description'),
            countdown: document.getElementById('countdown'),
            countdownNum: document.getElementById('countdown-num'),
            roundInfo: document.getElementById('round-info'),
            liveScore: document.getElementById('live-score'),
            liveScoreBar: document.getElementById('live-score-bar'),
            feedback: document.getElementById('feedback-text'),
            roundScore: document.getElementById('round-score'),
            roundStars: document.getElementById('round-stars'),
            totalScore: document.getElementById('total-score'),
            resultStars: document.getElementById('result-stars'),
            resultGrade: document.getElementById('result-grade'),
            resultDetails: document.getElementById('result-details'),
            playAgainBtn: document.getElementById('play-again-btn'),
            posePreview: document.getElementById('pose-preview'),
            captureFlash: document.getElementById('capture-flash'),
            scorePopup: document.getElementById('score-popup'),
            fpsCounter: document.getElementById('fps-counter'),
            // 比對詳情
            popupSnapshot: document.getElementById('popup-snapshot'),
            popupDetails: document.getElementById('popup-angle-details'),
            popupTargetIcon: document.getElementById('popup-target-icon')
        };

        // 核心模組（由 main.js 傳入共用的 camera & detector）
        this.camera = camera;
        this.detector = detector;
        this.skeleton = new SkeletonRenderer(this.canvas);
        this.scorer = new PoseScorer();

        // 遊戲狀態
        this.state = 'idle';
        this.selectedCategory = null;
        this.rounds = 5;
        this.currentRound = 0;
        this.poses = [];
        this.scores = [];
        this.roundData = [];
        this.bestScoreThisRound = 0;
        this.bestResultThisRound = null;
        this.bestSnapshotThisRound = null;
        this.animFrameId = null;

        // FPS 監控
        this._fpsFrames = 0;
        this._fpsLast = performance.now();
        this._fps = 0;

        // Resize skeleton canvas
        this.skeleton.resize(this.video.videoWidth || 640, this.video.videoHeight || 480);

        this._bindEvents();
        this._startDetectionLoop();
    }

    _bindEvents() {
        this.ui.playAgainBtn.addEventListener('click', () => this.resetGame());

        // 分類選擇按鈕
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const cat = card.dataset.category;
                if (cat) this.selectCategory(cat);
            });
        });
    }

    /**
     * 選擇分類後開始遊戲
     */
    selectCategory(category) {
        this.selectedCategory = category;
        this.scorer.setCategory(category);
        this.startGame();
    }

    // init() 已移至 main.js，此模組只負責遊戲邏輯

    /**
     * 開始遊戲
     */
    async startGame() {
        this.state = 'ready';
        this.currentRound = 0;
        this.scores = [];
        this.roundData = [];
        this.poses = getRandomPoses(this.rounds, this.selectedCategory);

        this._showScreen('game');
        await this._delay(500);
        this._nextRound();
    }

    /**
     * 下一輪
     */
    async _nextRound() {
        if (this.currentRound >= this.rounds) {
            this._showResults();
            return;
        }

        const pose = this.poses[this.currentRound];
        this.bestScoreThisRound = 0;
        this.bestResultThisRound = null;
        this.bestSnapshotThisRound = null;

        // 更新 UI
        this.ui.roundInfo.textContent = `第 ${this.currentRound + 1} / ${this.rounds} 輪`;
        this.ui.poseName.textContent = pose.name;
        this.ui.poseEmoji.textContent = pose.emoji;
        this.ui.poseDesc.textContent = pose.description;
        this.ui.liveScore.textContent = '0';
        this.ui.liveScoreBar.style.width = '0%';

        // 繪製姿勢圖示預覽
        this._drawPosePreview(pose);

        // 顯示姿勢預覽
        this.state = 'preview';
        this.ui.posePreview.classList.add('show');
        this.ui.countdown.classList.remove('show');
        this.ui.scorePopup.classList.remove('show');

        await this._delay(3000);

        // 隱藏預覽，開始倒數
        this.ui.posePreview.classList.remove('show');
        await this._delay(300);

        // 倒數 3-2-1
        this.state = 'countdown';
        this.ui.countdown.classList.add('show');

        for (let i = 3; i >= 1; i--) {
            this.ui.countdownNum.textContent = i;
            this.ui.countdownNum.classList.remove('pulse');
            void this.ui.countdownNum.offsetWidth; // force reflow
            this.ui.countdownNum.classList.add('pulse');
            await this._delay(1000);
        }

        this.ui.countdownNum.textContent = 'GO!';
        this.ui.countdownNum.classList.remove('pulse');
        void this.ui.countdownNum.offsetWidth;
        this.ui.countdownNum.classList.add('pulse');
        await this._delay(600);
        this.ui.countdown.classList.remove('show');

        // 開始偵測 (持續 4 秒，取最高分)
        this.state = 'detecting';
        this.bestScoreThisRound = 0;

        const detectStart = Date.now();
        const detectDuration = 4000;

        await new Promise(resolve => {
            const checkEnd = () => {
                if (Date.now() - detectStart >= detectDuration) {
                    resolve();
                } else {
                    requestAnimationFrame(checkEnd);
                }
            };
            checkEnd();
        });

        // 擷取拍照閃光
        this.state = 'scoring';
        this.ui.captureFlash.classList.add('flash');
        setTimeout(() => this.ui.captureFlash.classList.remove('flash'), 400);

        // 儲存本輪資料
        const roundResult = this.bestScoreThisRound;
        this.scores.push(roundResult);
        this.roundData.push({
            pose,
            score: roundResult,
            result: this.bestResultThisRound,
            snapshot: this.bestSnapshotThisRound
        });

        // 顯示本輪分數 + 比對詳情
        this._showRoundPopup(roundResult, this.bestResultThisRound, this.bestSnapshotThisRound, pose);

        await this._delay(4500); // 多給時間看比對詳情
        this.ui.scorePopup.classList.remove('show');
        await this._delay(300);

        this.currentRound++;
        this._nextRound();
    }

    /**
     * 顯示本輪得分彈窗（含比對詳情）
     */
    _showRoundPopup(score, result, snapshot, pose) {
        this.ui.scorePopup.classList.add('show');
        this.ui.roundScore.textContent = score;
        this.ui.roundStars.textContent = this._starsText(this.scorer._getStars(score));
        this.ui.feedback.textContent = this.scorer._getFeedback(score);

        // 顯示截圖
        if (snapshot && this.ui.popupSnapshot) {
            this.ui.popupSnapshot.src = snapshot;
            this.ui.popupSnapshot.style.display = 'block';
        } else if (this.ui.popupSnapshot) {
            this.ui.popupSnapshot.style.display = 'none';
        }

        // 目標姿勢小圖示
        if (this.ui.popupTargetIcon) {
            const tCanvas = this.ui.popupTargetIcon;
            tCanvas.width = 80;
            tCanvas.height = 80;
            const tCtx = tCanvas.getContext('2d');
            tCtx.clearRect(0, 0, 80, 80);
            drawPoseIcon(tCtx, pose, 80, 80, 'rgba(255,255,255,0.6)');
        }

        // 顯示角度比對詳情
        if (result && result.details && this.ui.popupDetails) {
            let html = '';
            result.details.forEach(d => {
                const label = ANGLE_NAME_MAP[d.name] || d.name;
                const barWidth = d.score;
                const barColor = d.score >= 80 ? '#00ff88' : d.score >= 50 ? '#ffaa00' : '#ff4444';
                html += `
                    <div class="angle-detail-row">
                        <span class="angle-label">${label}</span>
                        <div class="angle-bar-track">
                            <div class="angle-bar" style="width:${barWidth}%; background:${barColor}"></div>
                        </div>
                        <span class="angle-score">${d.score}%</span>
                    </div>`;
            });
            this.ui.popupDetails.innerHTML = html;
        }
    }

    /**
     * 顯示最終結果
     */
    _showResults() {
        this.state = 'done';
        const total = this.scores.reduce((a, b) => a + b, 0);
        const avg = Math.round(total / this.scores.length);
        const maxPossible = this.rounds * 100;

        this.ui.totalScore.textContent = `${total} / ${maxPossible}`;
        this.ui.resultStars.textContent = this._starsText(this._getOverallStars(avg));
        this.ui.resultGrade.textContent = this._getGrade(avg);

        // 詳細分數 (含截圖和角度比對)
        let detailsHtml = '';
        this.roundData.forEach((rd, i) => {
            const angleHtml = (rd.result && rd.result.details)
                ? rd.result.details.map(d => {
                    const label = ANGLE_NAME_MAP[d.name] || d.name;
                    const barColor = d.score >= 80 ? '#00ff88' : d.score >= 50 ? '#ffaa00' : '#ff4444';
                    return `
                        <div class="angle-detail-row small">
                            <span class="angle-label">${label}</span>
                            <div class="angle-bar-track">
                                <div class="angle-bar" style="width:${d.score}%; background:${barColor}"></div>
                            </div>
                            <span class="angle-score">${d.score}%</span>
                        </div>`;
                }).join('')
                : '';

            detailsHtml += `
                <div class="result-card">
                    <div class="result-card-header">
                        <span class="result-pose-name">${rd.pose.emoji} ${rd.pose.name}</span>
                        <span class="result-pose-score">${rd.score} 分 ${this._starsText(this.scorer._getStars(rd.score))}</span>
                    </div>
                    ${rd.snapshot ? `
                        <div class="result-card-compare">
                            <div class="result-card-snapshot">
                                <img src="${rd.snapshot}" alt="第 ${i + 1} 輪截圖" class="snapshot-img">
                                <span class="compare-label">你的擺拍</span>
                            </div>
                            <div class="result-card-target">
                                <canvas class="result-target-canvas" data-pose-index="${i}" width="120" height="160"></canvas>
                                <span class="compare-label">目標姿勢</span>
                            </div>
                        </div>
                    ` : ''}
                    ${angleHtml ? `<div class="result-card-angles">${angleHtml}</div>` : ''}
                </div>
            `;
        });
        this.ui.resultDetails.innerHTML = detailsHtml;

        // 繪製每張結果卡的目標姿勢骨架
        document.querySelectorAll('.result-target-canvas').forEach(canvas => {
            const idx = parseInt(canvas.dataset.poseIndex);
            const pose = this.roundData[idx]?.pose;
            if (pose) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawPoseIcon(ctx, pose, canvas.width, canvas.height, '#00ffcc');
            }
        });

        this._showScreen('result');
    }

    /**
     * 重新開始
     */
    resetGame() {
        this.roundData = [];
        this._showScreen('category');
        this.state = 'idle';
    }

    /**
     * 偵測迴圈 - 持續運行
     */
    _startDetectionLoop() {
        const loop = async () => {
            this.animFrameId = requestAnimationFrame(loop);

            // FPS 計算
            this._fpsFrames++;
            const now = performance.now();
            if (now - this._fpsLast >= 1000) {
                this._fps = this._fpsFrames;
                this._fpsFrames = 0;
                this._fpsLast = now;
                if (this.ui.fpsCounter) {
                    this.ui.fpsCounter.textContent = `${this._fps} FPS`;
                }
                // 自動調整效能
                this.detector.adjustPerformance(this._fps);
            }

            // 偵測姿勢
            if (!this.camera.isRunning || !this.detector.isReady) return;

            const pose = await this.detector.detect(this.video);

            // 繪製骨架
            this.skeleton.clear();

            if (this.state === 'detecting' && this.currentRound < this.poses.length) {
                // 遊戲中：繪製目標姿勢疊影 + 即時骨架
                const targetPose = this.poses[this.currentRound];
                this.skeleton.drawTarget(targetPose.keypoints, true);
            }

            if (pose) {
                this.skeleton.draw(pose, true);

                // 在偵測狀態下計算分數
                if (this.state === 'detecting' && this.currentRound < this.poses.length) {
                    const targetPose = this.poses[this.currentRound];
                    const result = this.scorer.compare(pose, targetPose);

                    // 更新即時分數 + 保存最佳結果
                    if (result.score > this.bestScoreThisRound) {
                        this.bestScoreThisRound = result.score;
                        this.bestResultThisRound = result;
                        // 擷取當前畫面截圖（含骨架）
                        try {
                            this.bestSnapshotThisRound = this.camera.captureFrame(this.canvas);
                        } catch (e) {
                            console.warn('截圖失敗:', e);
                        }
                    }

                    this.ui.liveScore.textContent = this.bestScoreThisRound;
                    this.ui.liveScoreBar.style.width = `${this.bestScoreThisRound}%`;

                    // 分數條顏色
                    if (this.bestScoreThisRound >= 75) {
                        this.ui.liveScoreBar.style.background = 'linear-gradient(90deg, #00ff88, #00ffcc)';
                    } else if (this.bestScoreThisRound >= 50) {
                        this.ui.liveScoreBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd00)';
                    } else {
                        this.ui.liveScoreBar.style.background = 'linear-gradient(90deg, #ff4444, #ff8844)';
                    }
                }
            }
        };

        loop();
    }

    /**
     * 繪製姿勢預覽圖示
     */
    _drawPosePreview(pose) {
        const canvas = this.poseCanvas;
        const size = Math.min(200, window.innerWidth * 0.4);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        drawPoseIcon(ctx, pose, size, size, '#00ffcc');
    }

    /**
     * 畫面切換
     */
    _showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    _starsText(count) {
        return '⭐'.repeat(count) + '☆'.repeat(3 - count);
    }

    _getOverallStars(avg) {
        if (avg >= 85) return 3;
        if (avg >= 60) return 2;
        if (avg >= 35) return 1;
        return 0;
    }

    _getGrade(avg) {
        if (avg >= 90) return 'S 級大師！';
        if (avg >= 80) return 'A 級高手！';
        if (avg >= 65) return 'B 級不錯！';
        if (avg >= 50) return 'C 級加油！';
        return 'D 級繼續練習！';
    }
}

// Game 類別由 main.js 動態 import 並實例化
