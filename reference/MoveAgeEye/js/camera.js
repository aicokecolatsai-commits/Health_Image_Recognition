/**
 * Camera Module - 攝影機管理
 * 負責開啟前鏡頭、管理串流、處理錯誤
 * 支援 Android / iOS / 桌機電腦
 */
export class Camera {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
        this.isRunning = false;
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    /**
     * 啟動攝影機
     * 使用漸進式降級策略：先優選前鏡頭，失敗則嘗試任何攝影機
     */
    async start() {
        // 嘗試順序：前鏡頭 → 任何攝影機
        const constraintsList = [
            {
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false
            },
            {
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            },
            {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            },
            {
                video: true,
                audio: false
            }
        ];

        let lastError = null;

        for (const constraints of constraintsList) {
            try {
                console.log('嘗試攝影機設定:', JSON.stringify(constraints.video));
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                break; // 成功就跳出
            } catch (err) {
                console.warn('此設定失敗:', err.name, err.message);
                lastError = err;
            }
        }

        if (!this.stream) {
            throw this._handleError(lastError);
        }

        this.video.srcObject = this.stream;
        // 確保 Android 上 video 能播放
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('muted', '');
        this.video.muted = true;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('攝影機啟動逾時，請重新整理頁面'));
            }, 10000); // 10 秒逾時

            this.video.onloadedmetadata = () => {
                clearTimeout(timeout);
                this.video.play()
                    .then(() => {
                        this.isRunning = true;
                        console.log(`攝影機啟動: ${this.video.videoWidth}x${this.video.videoHeight}`);
                        resolve({
                            width: this.video.videoWidth,
                            height: this.video.videoHeight
                        });
                    })
                    .catch(err => {
                        clearTimeout(timeout);
                        // Android 自動播放被阻擋時的處理
                        console.warn('自動播放失敗，嘗試靜音播放:', err);
                        this.video.muted = true;
                        this.video.play()
                            .then(() => {
                                this.isRunning = true;
                                resolve({
                                    width: this.video.videoWidth,
                                    height: this.video.videoHeight
                                });
                            })
                            .catch(reject);
                    });
            };

            this.video.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error('攝影機影像載入失敗'));
            };
        });
    }

    /**
     * 停止攝影機
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isRunning = false;
        }
    }

    /**
     * 擷取目前畫面截圖 (含骨架)
     * @param {HTMLCanvasElement} skeletonCanvas - 骨架畫布 (可選)
     */
    captureFrame(skeletonCanvas = null) {
        const tempCanvas = document.createElement('canvas');
        const w = this.video.videoWidth;
        const h = this.video.videoHeight;
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');

        // 鏡像翻轉繪製攝影機畫面
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(this.video, -w, 0, w, h);
        ctx.restore();

        // 疊加骨架畫布
        if (skeletonCanvas) {
            ctx.drawImage(skeletonCanvas, 0, 0, w, h);
        }

        return tempCanvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * 錯誤處理
     */
    _handleError(err) {
        if (!err) return new Error('無法開啟攝影機');

        let message = '無法開啟攝影機';
        const name = err.name || '';
        const msg = (err.message || '').toLowerCase();

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            message = '請允許攝影機權限才能進行遊戲\n\n' +
                (this.isMobile
                    ? '📱 請到瀏覽器設定 → 網站設定 → 攝影機 → 允許'
                    : '💻 請點擊網址列旁邊的攝影機圖示允許');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            message = '找不到攝影機裝置';
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
            message = '攝影機已被其他應用程式使用，請關閉其他 App 後重試';
        } else if (name === 'OverconstrainedError') {
            message = '攝影機不支援所需的設定';
        } else if (name === 'TypeError' && msg.includes('mediadevices')) {
            message = '此瀏覽器不支援攝影機功能\n\n請使用 Chrome 或 Safari 瀏覽器，並確保使用 HTTPS 連線';
        } else if (name === 'AbortError') {
            message = '攝影機啟動被中斷，請重新整理頁面';
        }

        return new Error(message);
    }
}
