/**
 * Poses Database - 目標姿勢資料庫
 * 每個姿勢包含 category（upper/lower/full）、17 個關鍵點的標準化座標
 *
 * 分類說明：
 *   upper  = 上半身為主（可坐著玩，適合長輩）
 *   lower  = 下半身為主
 *   full   = 全身活動
 */

// ──────────── 上半身姿勢（適合坐姿/長輩） ────────────

const UPPER_POSES = [
    {
        id: 'hands_up',
        name: '雙手高舉',
        nameEn: 'Hands Up',
        category: 'upper',
        difficulty: 1,
        emoji: '🙌',
        description: '雙手向上伸直高舉',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.18, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.16, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.16, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.17, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.17, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.28, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.28, score: 1 },
            { name: 'left_elbow', x: 0.40, y: 0.16, score: 1 },
            { name: 'right_elbow', x: 0.60, y: 0.16, score: 1 },
            { name: 'left_wrist', x: 0.40, y: 0.05, score: 1 },
            { name: 'right_wrist', x: 0.60, y: 0.05, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.52, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.52, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.70, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.70, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.88, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.88, score: 1 }
        ]
    },
    {
        id: 't_pose',
        name: 'T 字姿勢',
        nameEn: 'T-Pose',
        category: 'upper',
        difficulty: 1,
        emoji: '✝️',
        description: '雙手平舉呈 T 字型',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.28, y: 0.24, score: 1 },
            { name: 'right_elbow', x: 0.72, y: 0.24, score: 1 },
            { name: 'left_wrist', x: 0.14, y: 0.24, score: 1 },
            { name: 'right_wrist', x: 0.86, y: 0.24, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'superhero',
        name: '超人飛行',
        nameEn: 'Superman',
        category: 'upper',
        difficulty: 2,
        emoji: '🦸',
        description: '右手高舉，左手叉腰',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.38, y: 0.36, score: 1 },
            { name: 'right_elbow', x: 0.65, y: 0.12, score: 1 },
            { name: 'left_wrist', x: 0.42, y: 0.42, score: 1 },
            { name: 'right_wrist', x: 0.68, y: 0.03, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'dab',
        name: 'Dab 姿勢',
        nameEn: 'Dab',
        category: 'upper',
        difficulty: 2,
        emoji: '🕺',
        description: '手臂向對角線伸展',
        keypoints: [
            { name: 'nose', x: 0.45, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.43, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.47, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.41, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.49, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.40, y: 0.25, score: 1 },
            { name: 'right_shoulder', x: 0.56, y: 0.25, score: 1 },
            { name: 'left_elbow', x: 0.32, y: 0.18, score: 1 },
            { name: 'right_elbow', x: 0.50, y: 0.20, score: 1 },
            { name: 'left_wrist', x: 0.22, y: 0.10, score: 1 },
            { name: 'right_wrist', x: 0.44, y: 0.14, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.54, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.44, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.54, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.44, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.54, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'victory',
        name: '勝利 V',
        nameEn: 'Victory',
        category: 'upper',
        difficulty: 1,
        emoji: '✌️',
        description: '雙手舉起呈 V 字型',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.25, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.25, score: 1 },
            { name: 'left_elbow', x: 0.34, y: 0.15, score: 1 },
            { name: 'right_elbow', x: 0.66, y: 0.15, score: 1 },
            { name: 'left_wrist', x: 0.26, y: 0.05, score: 1 },
            { name: 'right_wrist', x: 0.74, y: 0.05, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'side_bend',
        name: '側彎伸展',
        nameEn: 'Side Bend',
        category: 'upper',
        difficulty: 2,
        emoji: '🤸',
        description: '身體側彎，一手上舉',
        keypoints: [
            { name: 'nose', x: 0.52, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.50, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.54, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.48, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.56, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.44, y: 0.25, score: 1 },
            { name: 'right_shoulder', x: 0.60, y: 0.25, score: 1 },
            { name: 'left_elbow', x: 0.48, y: 0.14, score: 1 },
            { name: 'right_elbow', x: 0.65, y: 0.38, score: 1 },
            { name: 'left_wrist', x: 0.54, y: 0.05, score: 1 },
            { name: 'right_wrist', x: 0.68, y: 0.48, score: 1 },
            { name: 'left_hip', x: 0.46, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.46, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.56, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.46, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.56, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'arms_crossed',
        name: '雙臂交叉',
        nameEn: 'Arms Crossed',
        category: 'upper',
        difficulty: 1,
        emoji: '🙅',
        description: '雙手交叉於胸前',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.52, y: 0.34, score: 1 },
            { name: 'right_elbow', x: 0.48, y: 0.34, score: 1 },
            { name: 'left_wrist', x: 0.58, y: 0.28, score: 1 },
            { name: 'right_wrist', x: 0.42, y: 0.28, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'right_wave',
        name: '舉手打招呼',
        nameEn: 'Wave',
        category: 'upper',
        difficulty: 1,
        emoji: '👋',
        description: '右手舉起揮手',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.40, y: 0.36, score: 1 },
            { name: 'right_elbow', x: 0.68, y: 0.14, score: 1 },
            { name: 'left_wrist', x: 0.40, y: 0.46, score: 1 },
            { name: 'right_wrist', x: 0.74, y: 0.06, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    }
];

// ──────────── 下半身姿勢 ────────────

const LOWER_POSES = [
    {
        id: 'squat',
        name: '深蹲',
        nameEn: 'Squat',
        category: 'lower',
        difficulty: 2,
        emoji: '🏋️',
        description: '雙手前伸，半蹲姿勢',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.22, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.20, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.20, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.21, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.21, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.32, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.32, score: 1 },
            { name: 'left_elbow', x: 0.35, y: 0.32, score: 1 },
            { name: 'right_elbow', x: 0.65, y: 0.32, score: 1 },
            { name: 'left_wrist', x: 0.28, y: 0.32, score: 1 },
            { name: 'right_wrist', x: 0.72, y: 0.32, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.52, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.52, score: 1 },
            { name: 'left_knee', x: 0.38, y: 0.66, score: 1 },
            { name: 'right_knee', x: 0.62, y: 0.66, score: 1 },
            { name: 'left_ankle', x: 0.42, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.58, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'tree_pose',
        name: '瑜伽樹式',
        nameEn: 'Tree Pose',
        category: 'lower',
        difficulty: 3,
        emoji: '🌳',
        description: '雙手合掌高舉，單腳站立',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.43, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.57, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.44, y: 0.14, score: 1 },
            { name: 'right_elbow', x: 0.56, y: 0.14, score: 1 },
            { name: 'left_wrist', x: 0.48, y: 0.04, score: 1 },
            { name: 'right_wrist', x: 0.52, y: 0.04, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.55, y: 0.60, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.52, y: 0.52, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'lunge_right',
        name: '右弓步',
        nameEn: 'Right Lunge',
        category: 'lower',
        difficulty: 2,
        emoji: '🦵',
        description: '右腳前弓步，雙手叉腰',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.43, y: 0.25, score: 1 },
            { name: 'right_shoulder', x: 0.57, y: 0.25, score: 1 },
            { name: 'left_elbow', x: 0.40, y: 0.36, score: 1 },
            { name: 'right_elbow', x: 0.60, y: 0.36, score: 1 },
            { name: 'left_wrist', x: 0.43, y: 0.42, score: 1 },
            { name: 'right_wrist', x: 0.57, y: 0.42, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.38, y: 0.72, score: 1 },
            { name: 'right_knee', x: 0.60, y: 0.60, score: 1 },
            { name: 'left_ankle', x: 0.35, y: 0.88, score: 1 },
            { name: 'right_ankle', x: 0.62, y: 0.78, score: 1 }
        ]
    },
    {
        id: 'wide_stance',
        name: '寬步站立',
        nameEn: 'Wide Stance',
        category: 'lower',
        difficulty: 1,
        emoji: '🧘',
        description: '雙腳大開站立，雙手叉腰',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.38, y: 0.34, score: 1 },
            { name: 'right_elbow', x: 0.62, y: 0.34, score: 1 },
            { name: 'left_wrist', x: 0.42, y: 0.42, score: 1 },
            { name: 'right_wrist', x: 0.58, y: 0.42, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.32, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.68, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.28, y: 0.86, score: 1 },
            { name: 'right_ankle', x: 0.72, y: 0.86, score: 1 }
        ]
    },
    {
        id: 'single_leg_left',
        name: '左腳單站',
        nameEn: 'Left Leg Stand',
        category: 'lower',
        difficulty: 3,
        emoji: '🦩',
        description: '左腳站立，右腳向後抬起',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.28, y: 0.24, score: 1 },
            { name: 'right_elbow', x: 0.72, y: 0.24, score: 1 },
            { name: 'left_wrist', x: 0.15, y: 0.24, score: 1 },
            { name: 'right_wrist', x: 0.85, y: 0.24, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.60, y: 0.56, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.86, score: 1 },
            { name: 'right_ankle', x: 0.65, y: 0.62, score: 1 }
        ]
    },
    {
        id: 'calf_raise',
        name: '墊腳尖',
        nameEn: 'Calf Raise',
        category: 'lower',
        difficulty: 1,
        emoji: '🩰',
        description: '雙手上舉，踮起腳尖',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.10, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.08, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.08, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.09, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.09, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.20, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.20, score: 1 },
            { name: 'left_elbow', x: 0.40, y: 0.12, score: 1 },
            { name: 'right_elbow', x: 0.60, y: 0.12, score: 1 },
            { name: 'left_wrist', x: 0.44, y: 0.03, score: 1 },
            { name: 'right_wrist', x: 0.56, y: 0.03, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.48, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.48, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.64, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.64, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.78, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.78, score: 1 }
        ]
    }
];

// ──────────── 全身姿勢 ────────────

const FULL_POSES = [
    {
        id: 'standing',
        name: '立正站好',
        nameEn: 'Standing',
        category: 'full',
        difficulty: 1,
        emoji: '🧍',
        description: '雙手自然下垂，站直',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.22, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.22, score: 1 },
            { name: 'left_elbow', x: 0.40, y: 0.36, score: 1 },
            { name: 'right_elbow', x: 0.60, y: 0.36, score: 1 },
            { name: 'left_wrist', x: 0.40, y: 0.48, score: 1 },
            { name: 'right_wrist', x: 0.60, y: 0.48, score: 1 },
            { name: 'left_hip', x: 0.45, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.55, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.45, y: 0.68, score: 1 },
            { name: 'right_knee', x: 0.55, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.45, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.55, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'warrior',
        name: '戰士姿勢',
        nameEn: 'Warrior',
        category: 'full',
        difficulty: 2,
        emoji: '⚔️',
        description: '弓步站立，雙手水平伸展',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.26, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.26, score: 1 },
            { name: 'left_elbow', x: 0.28, y: 0.26, score: 1 },
            { name: 'right_elbow', x: 0.72, y: 0.26, score: 1 },
            { name: 'left_wrist', x: 0.15, y: 0.26, score: 1 },
            { name: 'right_wrist', x: 0.85, y: 0.26, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.35, y: 0.65, score: 1 },
            { name: 'right_knee', x: 0.62, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.28, y: 0.85, score: 1 },
            { name: 'right_ankle', x: 0.65, y: 0.85, score: 1 }
        ]
    },
    {
        id: 'star',
        name: '星星跳',
        nameEn: 'Star Jump',
        category: 'full',
        difficulty: 2,
        emoji: '⭐',
        description: '四肢張開呈星形',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.10, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.08, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.08, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.09, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.09, score: 1 },
            { name: 'left_shoulder', x: 0.40, y: 0.22, score: 1 },
            { name: 'right_shoulder', x: 0.60, y: 0.22, score: 1 },
            { name: 'left_elbow', x: 0.28, y: 0.14, score: 1 },
            { name: 'right_elbow', x: 0.72, y: 0.14, score: 1 },
            { name: 'left_wrist', x: 0.18, y: 0.06, score: 1 },
            { name: 'right_wrist', x: 0.82, y: 0.06, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.48, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.48, score: 1 },
            { name: 'left_knee', x: 0.32, y: 0.65, score: 1 },
            { name: 'right_knee', x: 0.68, y: 0.65, score: 1 },
            { name: 'left_ankle', x: 0.24, y: 0.84, score: 1 },
            { name: 'right_ankle', x: 0.76, y: 0.84, score: 1 }
        ]
    },
    {
        id: 'full_squat_arms',
        name: '深蹲開手',
        nameEn: 'Squat Arms Out',
        category: 'full',
        difficulty: 3,
        emoji: '💪',
        description: '半蹲姿勢搭配雙手水平張開',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.20, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.18, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.18, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.19, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.19, score: 1 },
            { name: 'left_shoulder', x: 0.40, y: 0.30, score: 1 },
            { name: 'right_shoulder', x: 0.60, y: 0.30, score: 1 },
            { name: 'left_elbow', x: 0.26, y: 0.30, score: 1 },
            { name: 'right_elbow', x: 0.74, y: 0.30, score: 1 },
            { name: 'left_wrist', x: 0.14, y: 0.30, score: 1 },
            { name: 'right_wrist', x: 0.86, y: 0.30, score: 1 },
            { name: 'left_hip', x: 0.43, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.57, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.34, y: 0.65, score: 1 },
            { name: 'right_knee', x: 0.66, y: 0.65, score: 1 },
            { name: 'left_ankle', x: 0.38, y: 0.84, score: 1 },
            { name: 'right_ankle', x: 0.62, y: 0.84, score: 1 }
        ]
    },
    {
        id: 'full_victory_lunge',
        name: '勝利弓步',
        nameEn: 'Victory Lunge',
        category: 'full',
        difficulty: 2,
        emoji: '🏅',
        description: '弓步搭配雙手 V 字型',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.12, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.10, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.10, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.11, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.11, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.34, y: 0.14, score: 1 },
            { name: 'right_elbow', x: 0.66, y: 0.14, score: 1 },
            { name: 'left_wrist', x: 0.26, y: 0.04, score: 1 },
            { name: 'right_wrist', x: 0.74, y: 0.04, score: 1 },
            { name: 'left_hip', x: 0.44, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.56, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.36, y: 0.66, score: 1 },
            { name: 'right_knee', x: 0.62, y: 0.62, score: 1 },
            { name: 'left_ankle', x: 0.30, y: 0.86, score: 1 },
            { name: 'right_ankle', x: 0.64, y: 0.80, score: 1 }
        ]
    },
    {
        id: 'full_side_warrior',
        name: '側身戰士',
        nameEn: 'Side Warrior',
        category: 'full',
        difficulty: 3,
        emoji: '🥷',
        description: '側身弓步，雙臂前後伸展',
        keypoints: [
            { name: 'nose', x: 0.5, y: 0.14, score: 1 },
            { name: 'left_eye', x: 0.48, y: 0.12, score: 1 },
            { name: 'right_eye', x: 0.52, y: 0.12, score: 1 },
            { name: 'left_ear', x: 0.46, y: 0.13, score: 1 },
            { name: 'right_ear', x: 0.54, y: 0.13, score: 1 },
            { name: 'left_shoulder', x: 0.42, y: 0.24, score: 1 },
            { name: 'right_shoulder', x: 0.58, y: 0.24, score: 1 },
            { name: 'left_elbow', x: 0.28, y: 0.24, score: 1 },
            { name: 'right_elbow', x: 0.72, y: 0.24, score: 1 },
            { name: 'left_wrist', x: 0.16, y: 0.24, score: 1 },
            { name: 'right_wrist', x: 0.84, y: 0.24, score: 1 },
            { name: 'left_hip', x: 0.42, y: 0.50, score: 1 },
            { name: 'right_hip', x: 0.58, y: 0.50, score: 1 },
            { name: 'left_knee', x: 0.32, y: 0.62, score: 1 },
            { name: 'right_knee', x: 0.65, y: 0.68, score: 1 },
            { name: 'left_ankle', x: 0.25, y: 0.82, score: 1 },
            { name: 'right_ankle', x: 0.68, y: 0.86, score: 1 }
        ]
    }
];

// ──────────── 合併並匯出 ────────────

export const TARGET_POSES = [...UPPER_POSES, ...LOWER_POSES, ...FULL_POSES];

/** 分類資訊 */
export const CATEGORIES = {
    upper: { id: 'upper', name: '上半身', emoji: '💪', description: '手臂與肩膀動作為主\n適合坐著遊玩', color: '#00ffcc' },
    lower: { id: 'lower', name: '下半身', emoji: '🦵', description: '腿部與髖部動作為主\n需要站立遊玩', color: '#ff44aa' },
    full: { id: 'full', name: '全身', emoji: '🏃', description: '手腳並用全身動作\n需要站立遊玩', color: '#ffdd00' }
};

/**
 * 依分類取得隨機不重複姿勢
 * @param {string} category - 'upper' | 'lower' | 'full'
 * @param {number} count
 */
export function getRandomPoses(count = 5, category = null) {
    let pool = TARGET_POSES;
    if (category && category !== 'all') {
        pool = TARGET_POSES.filter(p => p.category === category);
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * 在 Canvas 上繪製姿勢圖示（小棍人）
 */
export function drawPoseIcon(ctx, pose, width, height, color = '#00ffcc') {
    const connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle']
    ];

    const kpMap = {};
    pose.keypoints.forEach(kp => {
        kpMap[kp.name] = { x: kp.x * width, y: kp.y * height };
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    connections.forEach(([from, to]) => {
        const p1 = kpMap[from];
        const p2 = kpMap[to];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    const nose = kpMap['nose'];
    if (nose) {
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, width * 0.06, 0, 2 * Math.PI);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const mainJoints = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    mainJoints.forEach(name => {
        const p = kpMap[name];
        if (!p) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
}
