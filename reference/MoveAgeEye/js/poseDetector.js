/**
 * Pose Detector Module - 姿勢偵測
 * 使用 TensorFlow.js MoveNet 偵測 17 個骨架關鍵點
 * 針對低階手機優化：使用 Lightning 模型，可動態降低偵測頻率
 */
export class PoseDetector {
    constructor() {
        this.detector = null;
        this.isReady = false;
        this.lastPose = null;
        this._detecting = false;
        // 效能控制
        this.skipFrames = 0;       // 跳過幀數（低階手機可調高）
        this._frameCount = 0;
    }

    /**
     * 載入 MoveNet Lightning 模型
     */
    async init() {
        try {
            // 等待 TensorFlow.js 就緒
            await tf.ready();

            // 偏好使用 WebGL，回退到 WASM 或 CPU
            const backends = ['webgl', 'wasm', 'cpu'];
            let backendSet = false;
            for (const backend of backends) {
                try {
                    await tf.setBackend(backend);
                    backendSet = true;
                    console.log(`使用後端: ${backend}`);
                    break;
                } catch (e) {
                    console.warn(`${backend} 後端不可用，嘗試下一個...`);
                }
            }

            // 建立 MoveNet 偵測器 (Lightning = 最快)
            this.detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                    enableSmoothing: true,
                    minPoseScore: 0.25
                }
            );

            this.isReady = true;
            console.log('MoveNet 模型載入完成');
            return true;
        } catch (err) {
            console.error('模型載入失敗:', err);
            throw new Error('AI 模型載入失敗，請重新整理頁面');
        }
    }

    /**
     * 偵測單幀姿勢
     * @param {HTMLVideoElement} video
     * @returns {Object|null} 姿勢資料
     */
    async detect(video) {
        if (!this.isReady || !this.detector || this._detecting) return this.lastPose;

        // 跳幀控制以降低 CPU 負載
        this._frameCount++;
        if (this._frameCount % (this.skipFrames + 1) !== 0) {
            return this.lastPose;
        }

        this._detecting = true;
        try {
            const poses = await this.detector.estimatePoses(video, {
                maxPoses: 1,
                flipHorizontal: false
            });

            if (poses && poses.length > 0) {
                this.lastPose = this._normalizePose(poses[0], video.videoWidth, video.videoHeight);
            } else {
                this.lastPose = null;
            }
        } catch (err) {
            console.warn('偵測錯誤:', err);
        }
        this._detecting = false;
        return this.lastPose;
    }

    /**
     * 標準化姿勢資料
     */
    _normalizePose(pose, videoWidth, videoHeight) {
        const keypoints = pose.keypoints.map(kp => ({
            name: kp.name,
            x: kp.x / videoWidth,
            y: kp.y / videoHeight,
            score: kp.score
        }));

        return {
            keypoints,
            score: pose.score || keypoints.reduce((s, k) => s + k.score, 0) / keypoints.length
        };
    }

    /**
     * 自動效能調整
     * 如果 FPS 太低，增加跳幀數
     */
    adjustPerformance(fps) {
        if (fps < 15 && this.skipFrames < 3) {
            this.skipFrames++;
            console.log(`效能調整：跳幀數增加到 ${this.skipFrames}`);
        } else if (fps > 25 && this.skipFrames > 0) {
            this.skipFrames--;
            console.log(`效能調整：跳幀數降低到 ${this.skipFrames}`);
        }
    }

    dispose() {
        if (this.detector) {
            this.detector.dispose();
            this.detector = null;
            this.isReady = false;
        }
    }
}

/**
 * MoveNet 17 個關鍵點名稱
 */
export const KEYPOINT_NAMES = [
    'nose',
    'left_eye', 'right_eye',
    'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
];
