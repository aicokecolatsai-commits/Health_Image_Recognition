/**
 * Scoring Module - 姿勢比對與評分
 * 使用角度比對和加權評分系統
 */

/**
 * 計算三個點之間的角度 (度數)
 */
function angleBetween(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * 定義要比較的角度組合及其權重
 */
const ANGLE_DEFINITIONS = [
    // 左臂
    { name: 'left_elbow', points: ['left_shoulder', 'left_elbow', 'left_wrist'], weight: 1.5 },
    { name: 'left_shoulder_angle', points: ['left_hip', 'left_shoulder', 'left_elbow'], weight: 1.5 },
    // 右臂
    { name: 'right_elbow', points: ['right_shoulder', 'right_elbow', 'right_wrist'], weight: 1.5 },
    { name: 'right_shoulder_angle', points: ['right_hip', 'right_shoulder', 'right_elbow'], weight: 1.5 },
    // 左腿
    { name: 'left_knee', points: ['left_hip', 'left_knee', 'left_ankle'], weight: 1.2 },
    { name: 'left_hip_angle', points: ['left_shoulder', 'left_hip', 'left_knee'], weight: 1.0 },
    // 右腿
    { name: 'right_knee', points: ['right_hip', 'right_knee', 'right_ankle'], weight: 1.2 },
    { name: 'right_hip_angle', points: ['right_shoulder', 'right_hip', 'right_knee'], weight: 1.0 },
    // 軀幹
    { name: 'torso_lean', points: ['left_shoulder', 'left_hip', 'left_knee'], weight: 0.8 },
    { name: 'shoulder_tilt', points: ['left_elbow', 'left_shoulder', 'right_shoulder'], weight: 0.8 },
];

export class PoseScorer {
    constructor() {
        this.angleDefinitions = ANGLE_DEFINITIONS;
        this.maxAngleDiff = 45; // 最大可接受角度差異 (度)
        this.category = null;   // 'upper' | 'lower' | 'full' | null
    }

    /**
     * 設定分類，調整角度權重
     * @param {'upper'|'lower'|'full'|null} category
     */
    setCategory(category) {
        this.category = category;
    }

    /**
     * 取得依分類調整後的權重
     */
    _getWeight(def) {
        const base = def.weight;
        if (!this.category || this.category === 'full') return base;

        const isArm = ['left_elbow', 'left_shoulder_angle', 'right_elbow', 'right_shoulder_angle', 'shoulder_tilt'].includes(def.name);
        const isLeg = ['left_knee', 'left_hip_angle', 'right_knee', 'right_hip_angle', 'torso_lean'].includes(def.name);

        if (this.category === 'upper') {
            // 上半身：手臂權重加倍，腿部歸零
            return isArm ? base * 1.5 : (isLeg ? 0 : base * 0.3);
        }
        if (this.category === 'lower') {
            // 下半身：腿部權重加倍，手臂減輕
            return isLeg ? base * 1.5 : (isArm ? base * 0.3 : base * 0.5);
        }
        return base;
    }

    /**
     * 計算姿勢的角度向量
     */
    _computeAngles(keypoints) {
        const kpMap = {};
        keypoints.forEach(kp => {
            kpMap[kp.name] = kp;
        });

        const angles = [];
        for (const def of this.angleDefinitions) {
            const [n1, n2, n3] = def.points;
            const p1 = kpMap[n1];
            const p2 = kpMap[n2];
            const p3 = kpMap[n3];

            if (!p1 || !p2 || !p3) {
                angles.push(null);
                continue;
            }

            // 檢查信心分數
            const minScore = Math.min(
                p1.score !== undefined ? p1.score : 1,
                p2.score !== undefined ? p2.score : 1,
                p3.score !== undefined ? p3.score : 1
            );

            if (minScore < 0.3) {
                angles.push(null);
                continue;
            }

            angles.push(angleBetween(p1, p2, p3));
        }

        return angles;
    }

    /**
     * 比較兩個姿勢的相似度
     * @param {Object} detectedPose - 偵測到的姿勢
     * @param {Object} targetPose - 目標姿勢
     * @returns {Object} { score: 0-100, details: [...] }
     */
    compare(detectedPose, targetPose) {
        if (!detectedPose || !targetPose) {
            return { score: 0, details: [], feedback: '未偵測到姿勢' };
        }

        // 鏡像處理：因為攝影機是鏡像的，需要交換左右
        const mirroredKeypoints = this._mirrorKeypoints(detectedPose.keypoints);

        const detectedAngles = this._computeAngles(mirroredKeypoints);
        const targetAngles = this._computeAngles(targetPose.keypoints);

        let totalWeightedScore = 0;
        let totalWeight = 0;
        const details = [];

        for (let i = 0; i < this.angleDefinitions.length; i++) {
            const def = this.angleDefinitions[i];
            const detected = detectedAngles[i];
            const target = targetAngles[i];

            if (detected === null || target === null) continue;

            const weight = this._getWeight(def);
            if (weight === 0) continue; // 此分類不評分的角度

            const diff = Math.abs(detected - target);
            const angleScore = Math.max(0, 1 - diff / this.maxAngleDiff);

            totalWeightedScore += angleScore * weight;
            totalWeight += weight;

            details.push({
                name: def.name,
                detected: Math.round(detected),
                target: Math.round(target),
                diff: Math.round(diff),
                score: Math.round(angleScore * 100)
            });
        }

        const rawScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

        // 非線性映射讓分數更有區分度
        const finalScore = Math.round(this._curveScore(rawScore) * 100);

        return {
            score: finalScore,
            details,
            feedback: this._getFeedback(finalScore),
            stars: this._getStars(finalScore)
        };
    }

    /**
     * 鏡像關鍵點 (交換左右)
     */
    _mirrorKeypoints(keypoints) {
        return keypoints.map(kp => {
            let newName = kp.name;
            if (kp.name.startsWith('left_')) {
                newName = kp.name.replace('left_', 'right_');
            } else if (kp.name.startsWith('right_')) {
                newName = kp.name.replace('right_', 'left_');
            }
            return { ...kp, name: newName };
        });
    }

    /**
     * 分數曲線 - 讓中間分數更有區分度
     */
    _curveScore(raw) {
        // S 型曲線
        if (raw < 0.3) return raw * 0.5;
        if (raw > 0.85) return 0.85 + (raw - 0.85) * (0.15 / 0.15);
        return 0.15 + (raw - 0.3) * (0.7 / 0.55);
    }

    /**
     * 評語回饋
     */
    _getFeedback(score) {
        if (score >= 90) return '🌟 完美！太厲害了！';
        if (score >= 75) return '🎉 很棒！幾乎一模一樣！';
        if (score >= 60) return '👍 不錯！再調整一下更好！';
        if (score >= 40) return '💪 加油！再試試看！';
        return '🤔 好像不太對，再來一次！';
    }

    /**
     * 星級評價
     */
    _getStars(score) {
        if (score >= 90) return 3;
        if (score >= 65) return 2;
        if (score >= 40) return 1;
        return 0;
    }
}
