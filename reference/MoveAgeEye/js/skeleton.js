/**
 * Skeleton Renderer - 骨架繪製模組
 * 在 Canvas 上繪製霓虹風格的骨架
 */

// 骨架連線定義
const SKELETON_CONNECTIONS = [
    // 頭部
    ['left_ear', 'left_eye'],
    ['left_eye', 'nose'],
    ['nose', 'right_eye'],
    ['right_eye', 'right_ear'],
    // 軀幹
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    // 左臂
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    // 右臂
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    // 左腿
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    // 右腿
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle']
];

// 關節顏色映射 (霓虹配色)
const JOINT_COLORS = {
    face: '#00ffff',      // 青色 - 臉部
    arm_left: '#ff00ff',  // 洋紅 - 左臂
    arm_right: '#ffff00', // 黃色 - 右臂
    torso: '#00ff88',     // 綠色 - 軀幹
    leg_left: '#ff6600',  // 橙色 - 左腿
    leg_right: '#6666ff'  // 紫色 - 右腿
};

function getJointGroup(name) {
    if (['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(name)) return 'face';
    if (['left_shoulder', 'left_elbow', 'left_wrist'].includes(name)) return 'arm_left';
    if (['right_shoulder', 'right_elbow', 'right_wrist'].includes(name)) return 'arm_right';
    if (['left_hip', 'right_hip'].includes(name)) return 'torso';
    if (['left_knee', 'left_ankle'].includes(name)) return 'leg_left';
    if (['right_knee', 'right_ankle'].includes(name)) return 'leg_right';
    return 'torso';
}

function getConnectionColor(name1, name2) {
    const g1 = getJointGroup(name1);
    const g2 = getJointGroup(name2);
    // 軀幹連線
    if ((g1 === 'torso' || g2 === 'torso') ||
        (g1.startsWith('arm') && g2.startsWith('arm')) ||
        (g1.startsWith('leg') && g2.startsWith('leg'))) {
        return JOINT_COLORS[g1] || JOINT_COLORS.torso;
    }
    return JOINT_COLORS.torso;
}

export class SkeletonRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minConfidence = 0.3;
    }

    /**
     * 設定 Canvas 大小
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * 清除畫面
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 繪製完整骨架
     * @param {Object} pose - 標準化的姿勢資料
     * @param {boolean} mirror - 是否鏡像
     */
    draw(pose, mirror = true) {
        if (!pose || !pose.keypoints) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.clear();

        // 建立關鍵點查找表
        const kpMap = {};
        pose.keypoints.forEach(kp => {
            kpMap[kp.name] = {
                x: mirror ? (1 - kp.x) * w : kp.x * w,
                y: kp.y * h,
                score: kp.score
            };
        });

        // 繪製連線（跳過臉部連線）
        const FACE_KP = new Set(['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear']);
        SKELETON_CONNECTIONS.forEach(([from, to]) => {
            const p1 = kpMap[from];
            const p2 = kpMap[to];
            if (!p1 || !p2) return;
            if (p1.score < this.minConfidence || p2.score < this.minConfidence) return;
            if (FACE_KP.has(from) && FACE_KP.has(to)) return; // 跳過臉部連線

            const color = getConnectionColor(from, to);
            const alpha = Math.min(p1.score, p2.score);

            ctx.save();
            ctx.globalAlpha = Math.max(0.4, alpha);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
        });

        // 繪製關節點（跳過臉部，避免遮擋人臉）
        const FACE_POINTS = ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'];
        pose.keypoints.forEach(kp => {
            if (kp.score < this.minConfidence) return;
            if (FACE_POINTS.includes(kp.name)) return; // 隱藏臉部綠點

            const x = mirror ? (1 - kp.x) * w : kp.x * w;
            const y = kp.y * h;
            const group = getJointGroup(kp.name);
            const color = JOINT_COLORS[group];

            ctx.save();
            ctx.globalAlpha = Math.max(0.5, kp.score);

            // 外圈發光
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();

            // 內圈白點
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.restore();
        });
    }

    /**
     * 繪製目標姿勢輪廓（半透明參考線）
     * @param {Array} targetKeypoints - 目標姿勢的關鍵點
     */
    drawTarget(targetKeypoints, mirror = true) {
        if (!targetKeypoints) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const kpMap = {};
        targetKeypoints.forEach(kp => {
            kpMap[kp.name] = {
                x: mirror ? (1 - kp.x) * w : kp.x * w,
                y: kp.y * h
            };
        });

        // 繪製虛線連線
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);

        SKELETON_CONNECTIONS.forEach(([from, to]) => {
            const p1 = kpMap[from];
            const p2 = kpMap[to];
            if (!p1 || !p2) return;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });

        // 繪製關節圓圈
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;

        targetKeypoints.forEach(kp => {
            const x = mirror ? (1 - kp.x) * w : kp.x * w;
            const y = kp.y * h;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }
}
