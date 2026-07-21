/**
 * SpineAnalyzer - 脊椎分析核心模組
 * 從 MoveNet keypoints 計算肩膀差、骨盆差、中線偏移、對稱評分
 */
export class SpineAnalyzer {
    constructor() {
        // 需要的關鍵點名稱
        this.requiredPoints = [
            'left_shoulder', 'right_shoulder',
            'left_hip', 'right_hip',
            'nose'
        ];
    }

    /**
     * 分析姿勢的脊椎對稱性
     * @param {Array} keypoints - MoveNet 偵測到的關鍵點
     * @returns {Object} 分析結果
     */
    analyze(keypoints) {
        const kp = {};
        keypoints.forEach(p => { kp[p.name] = p; });

        // 檢查必要關鍵點是否可見
        const missing = this.requiredPoints.filter(
            name => !kp[name] || kp[name].score < 0.3
        );
        if (missing.length > 0) {
            return {
                success: false,
                error: `無法偵測到：${missing.map(n => this._nameZh(n)).join('、')}`,
                missingPoints: missing
            };
        }

        const ls = kp['left_shoulder'];
        const rs = kp['right_shoulder'];
        const lh = kp['left_hip'];
        const rh = kp['right_hip'];
        const nose = kp['nose'];

        // ---- 1. 肩膀高度差 ----
        const shoulderDiffPx = ls.y - rs.y; // 正值 = 左肩較低
        const shoulderMidX = (ls.x + rs.x) / 2;
        const shoulderMidY = (ls.y + rs.y) / 2;
        const shoulderWidth = Math.abs(rs.x - ls.x);
        // 以肩寬為基準計算比例
        const shoulderDiffRatio = shoulderWidth > 0 ? Math.abs(shoulderDiffPx) / shoulderWidth : 0;
        const shoulderAngle = Math.atan2(rs.y - ls.y, rs.x - ls.x) * (180 / Math.PI);

        // ---- 2. 骨盆高度差 ----
        const hipDiffPx = lh.y - rh.y;
        const hipMidX = (lh.x + rh.x) / 2;
        const hipMidY = (lh.y + rh.y) / 2;
        const hipWidth = Math.abs(rh.x - lh.x);
        const hipDiffRatio = hipWidth > 0 ? Math.abs(hipDiffPx) / hipWidth : 0;
        const hipAngle = Math.atan2(rh.y - lh.y, rh.x - lh.x) * (180 / Math.PI);

        // ---- 3. 脊椎中線偏移 ----
        // 理想中線：鼻子 → 肩膀中點 → 骨盆中點 應為垂直
        const spineTopX = nose.x;
        const spineMidX = shoulderMidX;
        const spineBottomX = hipMidX;
        // 偏移量（以肩寬為基準）
        const topMidOffset = shoulderWidth > 0 ? Math.abs(spineTopX - spineMidX) / shoulderWidth : 0;
        const midBottomOffset = shoulderWidth > 0 ? Math.abs(spineMidX - spineBottomX) / shoulderWidth : 0;
        const totalOffset = (topMidOffset + midBottomOffset) / 2;

        // ---- 4. 軀幹傾斜角度 ----
        const trunkAngle = Math.atan2(
            hipMidX - shoulderMidX,
            hipMidY - shoulderMidY
        ) * (180 / Math.PI);

        // ---- 5. 綜合對稱性評分 ----
        // 各項目滿分 100，加權平均
        const shoulderScore = Math.max(0, 100 - shoulderDiffRatio * 500);
        const hipScore = Math.max(0, 100 - hipDiffRatio * 500);
        const offsetScore = Math.max(0, 100 - totalOffset * 400);
        const trunkScore = Math.max(0, 100 - Math.abs(trunkAngle) * 10);

        const totalScore = Math.round(
            shoulderScore * 0.30 +
            hipScore * 0.25 +
            offsetScore * 0.25 +
            trunkScore * 0.20
        );

        // ---- 6. 嚴重程度分級 ----
        let severity, severityColor, advice;
        if (totalScore >= 85) {
            severity = '✅ 正常';
            severityColor = '#00ff88';
            advice = '您的身體對稱性良好！建議維持正確姿勢，定期自我檢查。';
        } else if (totalScore >= 65) {
            severity = '⚠️ 輕微不對稱';
            severityColor = '#ffaa00';
            advice = '偵測到輕微的身體不對稱。建議注意日常姿勢，適度做伸展運動。若持續不適，可諮詢物理治療師。';
        } else {
            severity = '🔴 建議就醫';
            severityColor = '#ff4444';
            advice = '偵測到較明顯的身體不對稱。建議儘早至醫療機構進行專業檢查，以排除脊椎側彎或其他問題。';
        }

        return {
            success: true,
            timestamp: Date.now(),
            // 主要指標
            totalScore,
            severity,
            severityColor,
            advice,
            // 細項分數
            details: {
                shoulder: {
                    label: '肩膀對稱',
                    score: Math.round(shoulderScore),
                    angle: +shoulderAngle.toFixed(1),
                    diffRatio: +(shoulderDiffRatio * 100).toFixed(1),
                    direction: shoulderDiffPx > 0 ? '左肩較低' : shoulderDiffPx < 0 ? '右肩較低' : '對稱',
                },
                hip: {
                    label: '骨盆對稱',
                    score: Math.round(hipScore),
                    angle: +hipAngle.toFixed(1),
                    diffRatio: +(hipDiffRatio * 100).toFixed(1),
                    direction: hipDiffPx > 0 ? '左側較低' : hipDiffPx < 0 ? '右側較低' : '對稱',
                },
                spine: {
                    label: '脊椎中線',
                    score: Math.round(offsetScore),
                    offset: +(totalOffset * 100).toFixed(1),
                    direction: spineMidX > spineBottomX ? '偏左' : spineMidX < spineBottomX ? '偏右' : '居中',
                },
                trunk: {
                    label: '軀幹傾斜',
                    score: Math.round(trunkScore),
                    angle: +trunkAngle.toFixed(1),
                    direction: trunkAngle > 1 ? '偏右傾' : trunkAngle < -1 ? '偏左傾' : '垂直',
                }
            },
            // 繪圖用的座標
            landmarks: {
                leftShoulder: ls,
                rightShoulder: rs,
                leftHip: lh,
                rightHip: rh,
                nose,
                shoulderMid: { x: shoulderMidX, y: shoulderMidY },
                hipMid: { x: hipMidX, y: hipMidY },
            }
        };
    }

    /**
     * 在 Canvas 上繪製分析線
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} result - analyze() 的結果
     * @param {number} w - canvas 寬
     * @param {number} h - canvas 高
     */
    drawOverlay(ctx, result, w, h) {
        if (!result.success) return;
        const lm = result.landmarks;

        const toX = (p) => p.x * w;
        const toY = (p) => p.y * h;

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // --- 肩膀線 (cyan) ---
        ctx.strokeStyle = result.details.shoulder.score >= 80 ? '#00ff88' : '#ff4444';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(toX(lm.leftShoulder), toY(lm.leftShoulder));
        ctx.lineTo(toX(lm.rightShoulder), toY(lm.rightShoulder));
        ctx.stroke();

        // --- 骨盆線 (pink) ---
        ctx.strokeStyle = result.details.hip.score >= 80 ? '#00ff88' : '#ff4444';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(toX(lm.leftHip), toY(lm.leftHip));
        ctx.lineTo(toX(lm.rightHip), toY(lm.rightHip));
        ctx.stroke();

        // --- 中線 (yellow dashed) ---
        ctx.strokeStyle = '#ffdd00';
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 6;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(toX(lm.nose), toY(lm.nose));
        ctx.lineTo(toX(lm.shoulderMid), toY(lm.shoulderMid));
        ctx.lineTo(toX(lm.hipMid), toY(lm.hipMid));
        ctx.stroke();
        ctx.setLineDash([]);

        // --- 理想垂直中線 (dim white) ---
        const idealX = toX(lm.shoulderMid);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 0;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(idealX, toY(lm.nose) - 20);
        ctx.lineTo(idealX, toY(lm.hipMid) + 40);
        ctx.stroke();
        ctx.setLineDash([]);

        // --- 關節點 ---
        ctx.shadowBlur = 0;
        [lm.leftShoulder, lm.rightShoulder, lm.leftHip, lm.rightHip, lm.shoulderMid, lm.hipMid].forEach(p => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(toX(p), toY(p), 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- 角度標記文字 ---
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        // 肩膀角度
        const sAngle = result.details.shoulder.angle;
        ctx.fillText(
            `${Math.abs(sAngle).toFixed(1)}°`,
            toX(lm.shoulderMid) + 10,
            toY(lm.shoulderMid) - 8
        );
        // 骨盆角度
        const hAngle = result.details.hip.angle;
        ctx.fillText(
            `${Math.abs(hAngle).toFixed(1)}°`,
            toX(lm.hipMid) + 10,
            toY(lm.hipMid) - 8
        );
    }

    _nameZh(name) {
        const map = {
            'left_shoulder': '左肩膀',
            'right_shoulder': '右肩膀',
            'left_hip': '左髖部',
            'right_hip': '右髖部',
            'nose': '頭部'
        };
        return map[name] || name;
    }
}
