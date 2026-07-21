/* ================================================
   AI 姿態分析工具 v2.1
   引擎: @mediapipe/pose (經典版, CDN 穩定)
   功能: 33節點骨架 + 角度分析 + 校正 + 信心度 + 報告
   ================================================ */

const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/';

const NOSE=0, L_EAR=7, R_EAR=8, L_SHOULDER=11, R_SHOULDER=12,
  L_HIP=23, R_HIP=24, L_KNEE=25, R_KNEE=26, L_ANKLE=27, R_ANKLE=28,
  L_FOOT=31, R_FOOT=32;

const SKELETON = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],
  [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],
  [18,20],[11,23],[12,24],[23,24],[23,25],[25,27],
  [27,29],[29,31],[24,26],[26,28],[28,30],[30,32],
  [27,28],[29,30]
];

const PARTS = {
  head:[0,1,2,3,4,5,6,7,8,9,10], shoulders:[11,12],
  arms:[13,14,15,16,17,18,19,20,21,22], hips:[23,24],
  legs:[25,26,27,28,29,30,31,32]
};

// ─── DOM ────────────────────────────────────────
const video   = document.getElementById('video');
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const guideOverlay = document.getElementById('guideOverlay');
const modelStatus  = document.getElementById('modelStatus');
const calibStatus  = document.getElementById('calibStatus');
const fpsCounter   = document.getElementById('fpsCounter');

const btnCamera    = document.getElementById('btnCamera');
const btnDetect    = document.getElementById('btnDetect');
const btnSnap     = document.getElementById('btnSnap');
const btnVideo    = document.getElementById('btnVideo');
const btnCalibrate = document.getElementById('btnCalibrate');
const btnReport    = document.getElementById('btnReport');
const btnScreenshot= document.getElementById('btnScreenshot');

const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNum     = document.getElementById('countdownNum');
const captureOverlay   = document.getElementById('captureOverlay');
const captureBody      = document.getElementById('captureBody');

const chkLabels = document.getElementById('chkLabels');
const chkAngles = document.getElementById('chkAngles');
const chkGrid   = document.getElementById('chkGrid');
const chkConf   = document.getElementById('chkConf');
const viewBtns  = document.querySelectorAll('.view-btn');

const coverageFill = document.getElementById('coverageFill');
const coverageText = document.getElementById('coverageText');

const METRIC_DEFS = [
  { id:'headLateralTilt',  views:'front squat',   label:'頭部側偏',  unit:'°', wThresh:8,  wMax:20 },
  { id:'headRotation',     views:'front squat',   label:'頭部旋轉',  unit:'°', wThresh:10, wMax:25 },
  { id:'headTilt',         views:'side',           label:'頭部前傾',  unit:'°', wThresh:15, wMax:30 },
  { id:'shoulderLevel',    views:'front squat',   label:'肩膀水平',  unit:'°', wThresh:8,  wMax:15 },
  { id:'shoulderProtraction', views:'side',        label:'肩膀前突',  unit:'°', wThresh:10, wMax:20 },
  { id:'trunkLean',        views:'side squat',     label:'軀幹前傾',  unit:'°', wThresh:10, wMax:20 },
  { id:'pelvicTilt',       views:'front side squat',label:'骨盆傾斜',  unit:'°', wThresh:10, wMax:20 },
  { id:'kneeVarusValgus',  views:'front squat',   label:'膝內外翻',  unit:'°', wThresh:8,  wMax:15 },
  { id:'kneeAngle',        views:'side',           label:'膝關節角度',unit:'°', wThresh:10, wMax:20, isKnee:true },
  { id:'ankleAngle',       views:'side',           label:'踝關節角度',unit:'°', wThresh:5,  wMax:15 },
  { id:'kneeTracking',     views:'squat',          label:'膝蓋軌跡',  unit:'%', wThresh:10, wMax:20 },
  { id:'spineCurve',       views:'front side squat',label:'脊椎彎曲',  unit:'°', wThresh:15, wMax:30 },
  { id:'cogShift',         views:'front side squat',label:'重心偏移',  unit:'%', wThresh:5,  wMax:10 },
];

const metricIDs = METRIC_DEFS.map(d => d.id);
const metrics = {};
metricIDs.forEach(id => {
  metrics[id] = {
    def: METRIC_DEFS.find(d => d.id === id),
    val:    document.getElementById(`val-${id}`),
    bar:    document.getElementById(`bar-${id}`),
    status: document.getElementById(`status-${id}`),
    delta:  document.getElementById(`delta-${id}`),
    conf:   document.getElementById(`conf-${id}`),
  };
});

// ─── State ─────────────────────────────────────
let pose = null;
let stream = null;
let detecting = false;
let cameraActive = false;
let currentView = 'front';
let animFrameId = null;
let lastLandmarks = null;
let reportHistory = [];
let calFps = 0, calFrameCount = 0;
let loadingPromise = null;

// Calibration
let calibrated = false;
let calibBaseline = null;
let calibFrames = [];
const CALIB_NEEDED = 45;
let calibMode = 'quick';
let plumbPoints = [];
let verticalOffset = 0;
let plumbCalibActive = false;

// Snapshot
let snapActive = false;
let recordingPaused = false;
let capturedData = null;

// Video recording
let mediaRecorder = null;
let recordedChunks = [];
let videoRecording = false;

// ─── 1. Init Pose Engine ───────────────────────
async function initPose() {
  setModelStatus('下載 WASM 引擎...', 'loading');

  try {
    pose = new Pose({ locateFile: f => POSE_CDN + f });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Listen for results
    pose.onResults(onPoseResults);

    // Force initialize (downloads the .binarypb model from CDN)
    setModelStatus('下載模型 (~7MB)...', 'loading');
    const start = Date.now();
    await pose.initialize();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    setModelStatus(`模型已就緒 (${elapsed}s)`, 'ready');
    btnCamera.disabled = false;
  } catch (e) {
    console.error('Pose init error:', e);
    setModelStatus('載入失敗', 'error');
    showHelp(e);
  }
}

function showHelp(err) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #f44336;border-radius:12px;padding:16px 24px;max-width:520px;z-index:999;color:#ccc;font-size:13px;';
  div.innerHTML = `
    <strong style="color:#f44336">&#9888; 載入失敗</strong><br>
    ${err ? '<span style="color:#888;font-size:12px">' + err.message + '</span><br>' : ''}
    <ul style="margin:8px 0 0 16px">
      <li>請使用 Chrome / Edge 最新版</li>
      <li>確認網路可連線 cdn.jsdelivr.net</li>
      <li>公司/學校網路可能封鎖 CDN，請切換網路</li>
      <li>或執行 <code>download-models.ps1</code> 下載離線模型</li>
    </ul>
    <button onclick="this.parentElement.remove()" style="margin-top:8px;padding:4px 16px;background:#2a2a4a;border:none;border-radius:6px;color:#ccc;cursor:pointer">關閉</button>`;
  document.body.appendChild(div);
}

function setModelStatus(text, cls) {
  modelStatus.textContent = text;
  modelStatus.className = 'status-badge ' + (cls || '');
}

// ─── 2. Pose Results Callback ──────────────────
function onPoseResults(results) {
  if (!detecting || !cameraActive) return;

  if (recordingPaused) return;

  if (results.poseLandmarks && results.poseLandmarks.length > 0) {
    lastLandmarks = results.poseLandmarks;
    drawFrame(results.poseLandmarks);
    updateMetrics(results.poseLandmarks);
    updateCoverage(results.poseLandmarks);
    hideGuide();
  } else {
    lastLandmarks = null;
    drawNoPerson();
    resetMetrics();
    showGuide();
  }
}

// ─── 3. Camera ─────────────────────────────────
async function toggleCamera() {
  if (cameraActive) { stopCamera(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });
    video.srcObject = stream;
    await video.play();
    cameraActive = true;
    btnCamera.innerHTML = '<span class="ctrl-icon">&#9632;</span> 關閉相機';
    btnCamera.classList.add('danger');
    btnDetect.disabled = false;
    btnCalibrate.disabled = false;
    placeholder.style.display = 'none';
    video.style.display = 'block';
    canvas.style.display = 'block';
    resizeCanvas();
    showGuide();
    startRenderLoop();
  } catch (e) {
    alert('無法開啟相機:\n' + e.message + '\n\n請確認已允許相機權限');
  }
}

function stopCamera() {
  cameraActive = false;
  detecting = false;
  snapActive = false;
  recordingPaused = false;
  if (videoRecording) stopVideoRecording();
  countdownOverlay.classList.add('hidden');
  captureOverlay.classList.add('hidden');
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  resetButtons();
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  video.style.display = 'none';
  canvas.style.display = 'none';
  placeholder.style.display = 'flex';
  guideOverlay.classList.add('hidden');
  resetMetrics();
}

function resetButtons() {
  btnCamera.innerHTML = '<span class="ctrl-icon">&#9654;</span> 開啟相機';
  btnCamera.classList.remove('danger');
  btnDetect.disabled = true; btnDetect.textContent = '偵測';
  btnDetect.classList.remove('success','danger');
  btnSnap.disabled = true; btnSnap.innerHTML = '<span class="ctrl-icon">&#9679;</span> 快拍';
  btnVideo.disabled = true; btnVideo.innerHTML = '<span class="ctrl-icon">&#128249;</span> 錄影';
  btnVideo.classList.remove('danger');
  btnCalibrate.disabled = true;
  btnReport.disabled = true; btnScreenshot.disabled = true;
}

function resizeCanvas() {
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = r.width; canvas.height = r.height;
}

// ─── 4. Render Loop ────────────────────────────
function startRenderLoop() {
  calFrameCount = 0; calFps = performance.now();
  renderLoop(performance.now());
}

async function renderLoop(timestamp) {
  if (!cameraActive) return;

  if (recordingPaused) {
    calFrameCount++;
    if (timestamp - calFps > 1000) {
      fpsCounter.textContent = `${calFrameCount} FPS`;
      calFrameCount = 0; calFps = timestamp;
    }
    animFrameId = requestAnimationFrame(renderLoop);
    return;
  }

  if (detecting && pose && video.readyState >= 2) {
    try { await pose.send({ image: video }); } catch (e) {}
  } else if (!detecting && video.readyState >= 2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(-1,1); ctx.translate(-canvas.width,0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  calFrameCount++;
  if (timestamp - calFps > 1000) {
    fpsCounter.textContent = `${calFrameCount} FPS`;
    calFrameCount = 0; calFps = timestamp;
  }

  animFrameId = requestAnimationFrame(renderLoop);
}

// ─── 5. Guide Overlay ─────────────────────────
function showGuide() {
  guideOverlay.classList.remove('hidden');
}
function hideGuide() {
  guideOverlay.classList.add('hidden');
}
function updateGuide(landmarks) {
  const els = [
    document.getElementById('guidePos1'),
    document.getElementById('guidePos2'),
    document.getElementById('guidePos3'),
    document.getElementById('guidePos4'),
  ];
  const h = landmarks.length >= 25;
  const h2 = landmarks[NOSE] && landmarks[NOSE].visibility > 0.3 &&
             (landmarks[L_FOOT]||landmarks[R_FOOT])?.visibility > 0.3;
  const avg = landmarks.reduce((s,l) => s + l.visibility, 0) / landmarks.length;
  const h3 = avg > 0.6;

  let h4 = false;
  if (landmarks[NOSE] && landmarks[L_FOOT]) {
    const bh = Math.abs(Math.max(landmarks[L_FOOT]?.y,landmarks[R_FOOT]?.y||0) - landmarks[NOSE].y);
    h4 = bh > 0.4 && bh < 0.85;
  }

  const states = [h, h2, h3, h4];
  const texts = [
    `全身完整入鏡 (${landmarks.length}/33)`,
    `頭腳皆可見`,
    `平均信心度 ${(avg*100).toFixed(0)}%`,
    `距離適中`,
  ];
  els.forEach((el, i) => {
    el.className = states[i] ? 'done' : '';
    el.innerHTML = (states[i] ? '&#10003;' : '&#10007;') + ' ' + texts[i];
  });
}

// ─── 6. Drawing ────────────────────────────────
function drawFrame(landmarks) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save(); ctx.scale(-1,1); ctx.translate(-w,0);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const pts = landmarks.map(l => ({
    x: (1 - l.x) * w, y: l.y * h, z: l.z * 100, v: l.visibility
  }));

  if (chkGrid.checked) drawGrid(pts, w, h);
  drawSkeleton(pts, w, h);
  drawLandmarks(pts, w, h);
  if (chkLabels.checked) drawLabels(pts, w, h);
  if (chkAngles.checked) drawAngles(pts, w, h);
  if (chkAngles.checked) drawMetricsHUD(pts, w, h);
  if (calibrated && calibBaseline) drawBaseline(pts, w, h);
  drawPlumbLine(w, h);
}

function drawSkeleton(pts, w, h) {
  SKELETON.forEach(([i, j]) => {
    if (pts[i].v < 0.3 || pts[j].v < 0.3) return;
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[j].x, pts[j].y);
    ctx.strokeStyle = `rgba(79, 195, 247, ${0.3 + pts[i].v * 0.4})`;
    ctx.lineWidth = 2; ctx.stroke();
  });
}

function drawLandmarks(pts, w, h) {
  pts.forEach((p, i) => {
    if (p.v < 0.3) return;
    const r = 2 + p.v * 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    if (chkConf.checked) {
      ctx.fillStyle = p.v > 0.7 ? '#4caf50' : p.v > 0.5 ? '#ff9800' : '#f44336';
    } else {
      ctx.fillStyle = i < 11 ? '#ffab40' : '#4fc3f7';
    }
    ctx.fill();
    if (p.v > 0.8) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(76,175,80,0.12)'; ctx.fill();
    }
  });
}

function drawLabels(pts, w, h) {
  ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
  pts.forEach((p, i) => {
    if (p.v < 0.4) return;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(i, p.x, p.y - 7);
  });
}

function drawGrid(pts, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.setLineDash([4,4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke();
  ctx.setLineDash([]);
  if (pts.length > 0) {
    const sX = (pts[L_SHOULDER].x + pts[R_SHOULDER].x) / 2;
    const hX = (pts[L_HIP].x + pts[R_HIP].x) / 2;
    ctx.strokeStyle = 'rgba(255,200,0,0.1)';
    ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(sX, pts[L_SHOULDER].y); ctx.lineTo(sX, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hX, pts[L_HIP].y); ctx.lineTo(hX, h); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawAngles(pts, w, h) {
  const side = currentView === 'side';
  const sq = currentView === 'squat';
  ctx.font = 'bold 11px sans-serif';
  if (side) {
    const ht = calcHeadTilt(pts);
    if (ht !== null) {
      const ear = pts[R_EAR]||pts[L_EAR], sh = pts[R_SHOULDER]||pts[L_SHOULDER];
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 22, Math.atan2((sh.y-40)-sh.y,sh.x-sh.x), Math.atan2(ear.y-sh.y,ear.x-sh.x));
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffab40'; ctx.fillText(`H:${ht.toFixed(1)}°`, ear.x + 25, ear.y - 5);
    }
    const ka = calcKneeAngle(pts,'R')||calcKneeAngle(pts,'L');
    if (ka !== null) {
      const kn = pts[R_KNEE]||pts[L_KNEE];
      const hp = pts[R_HIP]||pts[L_HIP], an = pts[R_ANKLE]||pts[L_ANKLE];
      ctx.beginPath(); ctx.arc(kn.x, kn.y, 22, Math.atan2(hp.y-kn.y,hp.x-kn.x), Math.atan2(an.y-kn.y,an.x-kn.x));
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#a5d6a7'; ctx.fillText(`K:${ka.toFixed(1)}°`, kn.x + 20, kn.y);
    }
  } else {
    const sl = calcShoulderLevel(pts);
    if (sl !== null) {
      const mx = (pts[L_SHOULDER].x+pts[R_SHOULDER].x)/2;
      const my = (pts[L_SHOULDER].y+pts[R_SHOULDER].y)/2;
      ctx.fillStyle = '#ce93d8'; ctx.fillText(`S:${sl.toFixed(1)}°`, mx, my - 18);
    }
  }
}

function drawPlumbLine(w, h) {
  const drawAlways = (plumbCalibActive || plumbPoints.length > 0);
  if (!drawAlways && verticalOffset === 0) return;

  const cx = w / 2;
  const len = h * 0.7;
  const y0 = (h - len) / 2;

  if (verticalOffset !== 0) {
    // Draw corrected vertical line
    const rad = verticalOffset * Math.PI / 180;
    const endX = cx + Math.sin(rad) * len;
    const endY = y0 + Math.cos(rad) * len;
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
    ctx.lineWidth = 2; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.6)';
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`校正垂直線 ${verticalOffset.toFixed(1)}°`, cx + 8, y0 + 14);
  } else if (plumbCalibActive || plumbPoints.length > 0) {
    // Draw virtual plumb line
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.7)';
    ctx.lineWidth = 2; ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y0 + len); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(79, 195, 247, 0.7)';
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('鉛垂線', cx, y0 - 6);
  }

  // Draw marker points
  plumbPoints.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? '#ff9800' : '#4fc3f7';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i === 0 ? 'A' : 'B', p.x, p.y + 3);
  });
}

function drawMetricsHUD(pts, w, h) {
  const side = currentView === 'side';
  const sq = currentView === 'squat';
  const vals = analyzePose(pts);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';

  const x0 = 10, y0 = 16;
  const lineH = 18;
  let row = 0;

  METRIC_DEFS.forEach(def => {
    if (!def.views.split(' ').includes(currentView)) return;
    const v = vals[def.id];
    if (v === null || v === undefined) return;

    let color;
    if (def.isKnee) {
      if (v >= 170 && v <= 190) color = '#4caf50';
      else if (v >= 160 && v <= 200) color = '#ff9800';
      else color = '#f44336';
    } else {
      if (v <= 3) color = '#4caf50';
      else if (v <= def.wThresh) color = '#ff9800';
      else color = '#f44336';
    }

    const label = def.label.substring(0, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x0 - 4, y0 + row * lineH - 10, 160, lineH);
    ctx.fillStyle = color;
    ctx.fillText(`${label} ${v.toFixed(1)}${def.unit}`, x0, y0 + row * lineH);
    row++;
  });

  ctx.restore();
}

function drawBaseline(pts, w, h) {
  if (!calibBaseline || currentView !== 'side' || calibBaseline.headTilt === null) return;
  const ear = pts[R_EAR]||pts[L_EAR], sh = pts[R_SHOULDER]||pts[L_SHOULDER];
  if (!ear || !sh || ear.v < 0.3 || sh.v < 0.3) return;
  const rad = calibBaseline.headTilt * Math.PI / 180;
  ctx.strokeStyle = 'rgba(255,200,0,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(sh.x, sh.y);
  ctx.lineTo(sh.x - Math.sin(rad) * 60, sh.y - Math.cos(rad) * 60);
  ctx.stroke(); ctx.setLineDash([]);
}

function drawNoPerson() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#555'; ctx.textAlign = 'center';
  ctx.font = '18px sans-serif'; ctx.fillText('未偵測到人物', w/2, h/2);
  ctx.font = '12px sans-serif'; ctx.fillText('請站在鏡頭前，保持良好光線', w/2, h/2 + 28);
}

// ─── 7. Angle Calculations ─────────────────────
function calcAngleBetween(a, b, c) {
  if (!a||!b||!c) return null;
  const v1={x:a.x-b.x,y:a.y-b.y}, v2={x:c.x-b.x,y:c.y-b.y};
  const d=v1.x*v2.x+v1.y*v2.y;
  const m1=Math.sqrt(v1.x*v1.x+v1.y*v1.y), m2=Math.sqrt(v2.x*v2.x+v2.y*v2.y);
  if (m1<.001||m2<.001) return null;
  return Math.acos(Math.max(-1,Math.min(1,d/(m1*m2))))*180/Math.PI;
}

function angleFromVertical(a, b) {
  if (!a||!b) return null;
  const dx=a.x-b.x, dy=a.y-b.y;
  const m=Math.sqrt(dx*dx+dy*dy);
  if (m<.001) return null;
  const raw = Math.acos(Math.abs(dy)/m)*180/Math.PI * (dx>0?1:-1);
  return raw - (verticalOffset || 0);
}

function calcHeadTilt(pts) {
  const e=pts[R_EAR]||pts[L_EAR], s=pts[R_SHOULDER]||pts[L_SHOULDER];
  return e&&s&&e.v>.3&&s.v>.3 ? angleFromVertical(e,s) : null;
}
function calcShoulderLevel(pts) {
  const l=pts[L_SHOULDER], r=pts[R_SHOULDER];
  return l&&r&&l.v>.3&&r.v>.3 ? Math.atan2(l.y-r.y,l.x-r.x)*180/Math.PI : null;
}
function calcPelvicTilt(pts) {
  if (currentView==='side') {
    const s=pts[R_SHOULDER]||pts[L_SHOULDER], h=pts[R_HIP]||pts[L_HIP];
    return s&&h&&s.v>.3&&h.v>.3 ? angleFromVertical(h,s) : null;
  } else {
    const l=pts[L_HIP], r=pts[R_HIP];
    return l&&r&&l.v>.3&&r.v>.3 ? Math.atan2(l.y-r.y,l.x-r.x)*180/Math.PI : null;
  }
}
function calcKneeAngle(pts, s) {
  const h=s==='L'?pts[L_HIP]:pts[R_HIP], k=s==='L'?pts[L_KNEE]:pts[R_KNEE], a=s==='L'?pts[L_ANKLE]:pts[R_ANKLE];
  return h&&k&&a&&h.v>.3&&k.v>.3&&a.v>.3 ? calcAngleBetween(h,k,a) : null;
}
function calcSpineCurve(pts) {
  const n=pts[NOSE];
  const sM={x:(pts[L_SHOULDER].x+pts[R_SHOULDER].x)/2,y:(pts[L_SHOULDER].y+pts[R_SHOULDER].y)/2,v:(pts[L_SHOULDER].v+pts[R_SHOULDER].v)/2};
  const hM={x:(pts[L_HIP].x+pts[R_HIP].x)/2,y:(pts[L_HIP].y+pts[R_HIP].y)/2,v:(pts[L_HIP].v+pts[R_HIP].v)/2};
  if (!n||n.v<.3||sM.v<.3||hM.v<.3) return null;
  const a=calcAngleBetween(n,sM,hM);
  return a!==null?Math.abs(a-180):null;
}
function calcCOGShift(pts) {
  const hM={x:(pts[L_HIP].x+pts[R_HIP].x)/2};
  let a;
  if (currentView==='side') a=pts[R_ANKLE]||pts[L_ANKLE];
  else {
    const l=pts[L_ANKLE],r=pts[R_ANKLE];
    if(l&&r) a={x:(l.x+r.x)/2}; else a=l||r;
  }
  return a?((hM.x-a.x)/canvas.width)*100:null;
}

// ─── New Metric Calculations ──────────────────
function calcHeadLateralTilt(pts) {
  const n=pts[NOSE], ls=pts[L_SHOULDER], rs=pts[R_SHOULDER];
  if (!n||!ls||!rs||n.v<.3||ls.v<.3||rs.v<.3) return null;
  const sMidX = (ls.x + rs.x) / 2;
  const dx = n.x - sMidX;
  const h = Math.abs(n.y - (ls.y+rs.y)/2);
  if (h < 0.01) return null;
  return (Math.atan2(Math.abs(dx), h) * 180 / Math.PI * (dx > 0 ? 1 : -1)) - (verticalOffset || 0);
}

function calcHeadRotation(pts) {
  const n=pts[NOSE], le=pts[L_EAR], re=pts[R_EAR];
  if (!n||!le||!re||n.v<.3||le.v<.3||re.v<.3) return null;
  const dL = Math.abs(n.x - le.x);
  const dR = Math.abs(re.x - n.x);
  const sum = dL + dR;
  if (sum < 1) return null;
  return ((dL - dR) / sum) * 90;
}

function calcShoulderProtraction(pts) {
  const ear = pts[R_EAR]||pts[L_EAR];
  const sh = pts[R_SHOULDER]||pts[L_SHOULDER];
  if (!ear||!sh||ear.v<.3||sh.v<.3) return null;
  return (sh.x - ear.x) / canvas.width * 100;
}

function calcTrunkLean(pts) {
  const side = currentView === 'side';
  if (side) {
    const sh = pts[R_SHOULDER]||pts[L_SHOULDER];
    const hp = pts[R_HIP]||pts[L_HIP];
    if (!sh||!hp||sh.v<.3||hp.v<.3) return null;
    return angleFromVertical(hp, sh);
  } else {
    const sM={x:(pts[L_SHOULDER].x+pts[R_SHOULDER].x)/2,y:(pts[L_SHOULDER].y+pts[R_SHOULDER].y)/2};
    const hM={x:(pts[L_HIP].x+pts[R_HIP].x)/2,y:(pts[L_HIP].y+pts[R_HIP].y)/2};
    if (sM.y<.01||hM.y<.01) return null;
    const dx = sM.x - hM.x;
    const dy = sM.y - hM.y;
    if (Math.abs(dy)<.001) return null;
    return Math.atan2(dx, dy) * 180 / Math.PI;
  }
}

function calcKneeVarusValgus(pts) {
  const lh=pts[L_HIP], rh=pts[R_HIP];
  const lk=pts[L_KNEE], rk=pts[R_KNEE];
  const la=pts[L_ANKLE], ra=pts[R_ANKLE];
  if (!lk||!rk) return null;
  let angleL = null, angleR = null;
  if (lh&&lk&&la&&lh.v>.3&&lk.v>.3&&la.v>.3) {
    angleL = calcAngleBetween(lh, lk, la);
  }
  if (rh&&rk&&ra&&rh.v>.3&&rk.v>.3&&ra.v>.3) {
    angleR = calcAngleBetween(rh, rk, ra);
  }
  const best = angleL !== null && angleR !== null ? (angleL+angleR)/2 : angleL||angleR;
  if (best === null) return null;
  return Math.abs(best - 180);
}

function calcAnkleAngle(pts) {
  const kn = pts[R_KNEE]||pts[L_KNEE];
  const an = pts[R_ANKLE]||pts[L_ANKLE];
  const ft = pts[R_FOOT_INDEX]||pts[L_FOOT_INDEX];
  if (!kn||!an||!ft||kn.v<.3||an.v<.3||ft.v<.3) return null;
  return calcAngleBetween(kn, an, ft);
}
const R_FOOT_INDEX=32, L_FOOT_INDEX=31;

function calcKneeTracking(pts) {
  const kn = pts[R_KNEE]||pts[L_KNEE];
  const ft = pts[R_FOOT_INDEX]||pts[L_FOOT_INDEX];
  if (!kn||!ft||kn.v<.3||ft.v<.3) return null;
  return (ft.x - kn.x) / canvas.width * 100;
}

function calcConfidence(landmarks) {
  const get = (idxs) => {
    let s=0, n=0;
    idxs.forEach(i => { if (landmarks[i]) { s+=landmarks[i].v||0; n++; } });
    return n>0 ? s/n : 0;
  };
  return {
    headLateralTilt:     get([NOSE,L_SHOULDER,R_SHOULDER]),
    headRotation:        get([NOSE,L_EAR,R_EAR]),
    headTilt:            get([R_EAR||L_EAR, R_SHOULDER||L_SHOULDER].filter(i=>i!==undefined)),
    shoulderLevel:       get([L_SHOULDER,R_SHOULDER]),
    shoulderProtraction: get([R_EAR||L_EAR, R_SHOULDER||L_SHOULDER].filter(i=>i!==undefined)),
    trunkLean:           get([R_SHOULDER||L_SHOULDER, R_HIP||L_HIP].filter(i=>i!==undefined)),
    pelvicTilt:          get([R_SHOULDER||L_SHOULDER, R_HIP||L_HIP].filter(i=>i!==undefined)),
    kneeVarusValgus:     get([L_HIP,R_HIP,L_KNEE,R_KNEE,L_ANKLE,R_ANKLE]),
    kneeAngle:           get([R_HIP||L_HIP, R_KNEE||L_KNEE, R_ANKLE||L_ANKLE].filter(i=>i!==undefined)),
    ankleAngle:          get([R_KNEE||L_KNEE, R_ANKLE||L_ANKLE, R_FOOT_INDEX||L_FOOT_INDEX].filter(i=>i!==undefined)),
    kneeTracking:        get([R_KNEE||L_KNEE, R_FOOT_INDEX||L_FOOT_INDEX].filter(i=>i!==undefined)),
    spineCurve:          get([NOSE,L_SHOULDER,R_SHOULDER,L_HIP,R_HIP]),
    cogShift:            get([L_HIP,R_HIP,L_ANKLE,R_ANKLE]),
  };
}

function calcOverallConfidence(lm) {
  const vis = lm.filter(l => l.visibility > 0.1);
  if (vis.length === 0) return 0;
  return Math.round(vis.reduce((s,l)=>s+l.visibility,0)/vis.length*100);
}

// ─── 8. Metrics ────────────────────────────────
function analyzePose(pts) {
  const v = currentView;
  const s = v === 'side';
  const sq = v === 'squat';
  return {
    headLateralTilt:  (!s) ? calcHeadLateralTilt(pts) : null,
    headRotation:     (!s) ? calcHeadRotation(pts) : null,
    headTilt:         s ? calcHeadTilt(pts) : null,
    shoulderLevel:    (!s) ? Math.abs(calcShoulderLevel(pts)) : null,
    shoulderProtraction: s ? calcShoulderProtraction(pts) : null,
    trunkLean:        (s||sq) ? calcTrunkLean(pts) : null,
    pelvicTilt:       Math.abs(calcPelvicTilt(pts)),
    kneeVarusValgus:  (!s) ? calcKneeVarusValgus(pts) : null,
    kneeAngle:        s ? (calcKneeAngle(pts,'R')||calcKneeAngle(pts,'L')) : null,
    ankleAngle:       s ? calcAnkleAngle(pts) : null,
    kneeTracking:     sq ? calcKneeTracking(pts) : null,
    spineCurve:       calcSpineCurve(pts),
    cogShift:         calcCOGShift(pts) !== null ? Math.abs(calcCOGShift(pts)) : null,
  };
}

function updateMetrics(landmarks) {
  const pts = landmarks.map(l => ({
    x: (1 - l.x) * canvas.width, y: l.y * canvas.height, v: l.visibility
  }));
  const vals = analyzePose(pts);
  const conf = calcConfidence(landmarks);

  metricIDs.forEach(id => setMetric(id, vals[id], conf[id]));
}

function setMetric(id, value, confidence) {
  const m = metrics[id];
  if (!m) return;
  const def = m.def;
  const unit = def.unit;

  if (value === null || value === undefined) {
    if (m.val.textContent !== '未施測') {
      m.val.textContent = '未施測';
      m.bar.style.width = '0%'; m.bar.className = 'bar-fill';
      m.status.textContent = '未施測'; m.status.style.color = '#666';
      m.delta.textContent = ''; m.delta.className = 'metric-delta';
      m.conf.textContent = ''; m.conf.className = 'metric-conf';
    }
    return;
  }

  m.val.textContent = value.toFixed(1) + unit;

  if (confidence > 0.7) { m.conf.textContent='高'; m.conf.className='metric-conf high'; }
  else if (confidence > 0.5) { m.conf.textContent='中'; m.conf.className='metric-conf med'; }
  else { m.conf.textContent='低'; m.conf.className='metric-conf low'; }

  if (calibrated && calibBaseline && calibBaseline[id] !== null) {
    const d = value - calibBaseline[id];
    m.delta.textContent = (d>=0?'+':'') + d.toFixed(1) + unit;
    m.delta.className = 'metric-delta ' + (Math.abs(d)<3?'neutral':d>0?'positive':'negative');
  } else {
    m.delta.textContent = '';
    m.delta.className = 'metric-delta';
  }

  let pct, cls, txt;
  const wThresh = def.wThresh;
  const wMax = def.wMax;
  if (def.isKnee) {
    if (value>=170&&value<=190) { pct=100-Math.abs(value-180)*5; cls='good'; txt='正常'; }
    else if (value>=160&&value<=200) { pct=50; cls='warn'; txt='注意'; }
    else { pct=25; cls='bad'; txt='異常'; }
  } else {
    if (value<=3) { pct=5; cls='good'; txt='正常'; }
    else if (value<=wThresh) { pct=(value/wThresh)*50; cls='warn'; txt='輕微'; }
    else { pct=Math.min(100,50+(value-wThresh)/(wMax-wThresh)*50); cls='bad'; txt='明顯'; }
  }
  m.bar.style.width = Math.min(100,Math.max(5,pct))+'%';
  m.bar.className = 'bar-fill '+cls;
  m.status.textContent = txt;
  m.status.style.color = cls==='good'?'#4caf50':cls==='warn'?'#ff9800':'#f44336';
}

function resetMetrics() {
  metricIDs.forEach(id => {
    const m=metrics[id];
    const card = document.querySelector(`.metric-card [id^="val-${id}"]`);
    const parentCard = m.val?.closest?.('.metric-card');
    if (parentCard && parentCard.classList.contains('hidden-card')) return;
    m.val.textContent='未施測'; m.bar.style.width='0%'; m.bar.className='bar-fill';
    m.status.textContent='未施測'; m.status.style.color='';
    m.delta.textContent=''; m.delta.className='metric-delta';
    m.conf.textContent='';
  });
  coverageFill.style.width='0%'; coverageText.textContent='0%';
}

function updateCoverage(lm) {
  const p = calcOverallConfidence(lm);
  coverageFill.style.width = p+'%'; coverageText.textContent = p+'%';
}

// ─── 9. Calibration ────────────────────────────
function startCalibration() {
  if (!detecting) {
    detecting = true;
    btnDetect.textContent = '偵測中'; btnDetect.classList.add('danger'); btnDetect.classList.remove('success');
  }
  calibMode = 'quick';
  plumbPoints = [];
  verticalOffset = 0;
  plumbCalibActive = false;
  document.getElementById('calibModeQuick').classList.add('active');
  document.getElementById('calibModePlumb').classList.remove('active');
  document.getElementById('calibQuickInfo').style.display = 'block';
  document.getElementById('calibPlumbInfo').style.display = 'none';
  document.getElementById('btnCalibStart').disabled = false;
  document.getElementById('calibModal').classList.remove('hidden');
  document.getElementById('calibStep1').style.display='block';
  document.getElementById('calibStep2').style.display='none';
  document.getElementById('calibStep3').style.display='none';
  calibFrames = [];
}

// Calibration mode switching
document.getElementById('calibModeQuick').addEventListener('click', () => {
  document.getElementById('calibModeQuick').classList.add('active');
  document.getElementById('calibModePlumb').classList.remove('active');
  calibMode = 'quick'; plumbPoints = []; verticalOffset = 0; plumbCalibActive = false;
  document.getElementById('calibQuickInfo').style.display = 'block';
  document.getElementById('calibPlumbInfo').style.display = 'none';
  document.getElementById('btnCalibStart').disabled = false;
});

document.getElementById('calibModePlumb').addEventListener('click', () => {
  document.getElementById('calibModePlumb').classList.add('active');
  document.getElementById('calibModeQuick').classList.remove('active');
  calibMode = 'plumb'; plumbPoints = []; verticalOffset = 0; plumbCalibActive = true;
  document.getElementById('calibQuickInfo').style.display = 'none';
  document.getElementById('calibPlumbInfo').style.display = 'block';
  document.getElementById('btnCalibStart').disabled = true;
  document.getElementById('plumbStatus').textContent = '請在影片上點擊上、下兩個點來標記垂直參考線';
  document.getElementById('plumbStatus').style.color = '#ff9800';
});

// Canvas click for plumb line marking
canvas.addEventListener('click', (e) => {
  if (!plumbCalibActive || plumbPoints.length >= 2) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Convert to mirrored canvas coordinates
  const canvasX = (x / rect.width) * canvas.width;
  const canvasY = (y / rect.height) * canvas.height;
  plumbPoints.push({ x: canvasX, y: canvasY });
  if (plumbPoints.length === 2) {
    const p1 = plumbPoints[0], p2 = plumbPoints[1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    if (Math.abs(dy) > 5) {
      verticalOffset = Math.atan2(dx, dy) * 180 / Math.PI;
    }
    document.getElementById('plumbStatus').innerHTML = `
      &#10003; 已標記！垂直偏差角: <b>${verticalOffset.toFixed(1)}°</b><br>
      <span style="color:#888">系統將自動補償相機傾斜</span>`;
    document.getElementById('plumbStatus').style.color = '#4caf50';
    document.getElementById('btnCalibStart').disabled = false;
    plumbCalibActive = false;
  } else {
    document.getElementById('plumbStatus').textContent = `已標記第 1 點，請點擊第 2 點（垂直方向的下方）`;
    document.getElementById('plumbStatus').style.color = '#4fc3f7';
  }
});

document.getElementById('btnCalibStart').addEventListener('click', () => {
  document.getElementById('calibStep1').style.display='none';
  document.getElementById('calibStep2').style.display='block';
  calibFrames = [];
  plumbCalibActive = false;
  collectCalib();
});

function collectCalib() {
  if (calibFrames.length >= CALIB_NEEDED) { finishCalib(); return; }
  const pct = Math.round(calibFrames.length/CALIB_NEEDED*100);
  document.getElementById('calibProgress').textContent = `請維持不動... ${calibFrames.length}/${CALIB_NEEDED}`;
  document.getElementById('calibProgressFill').style.width = pct+'%';
  if (lastLandmarks && lastLandmarks.length > 0) {
    const pts = lastLandmarks.map(l => ({x:(1-l.x)*canvas.width,y:l.y*canvas.height,v:l.visibility}));
    calibFrames.push(analyzePose(pts));
  }
  setTimeout(collectCalib, 66);
}

function finishCalib() {
  const valid = calibFrames.filter(f=>f);
  if (valid.length < 10) {
    alert('校正失敗：偵測資訊不足，請確認光線與位置');
    document.getElementById('calibStep2').style.display='none';
    document.getElementById('calibStep1').style.display='block';
    return;
  }
  const avg = {};
  Object.keys(valid[0]).forEach(k => {
    const vals = valid.map(f=>f[k]).filter(v=>v!==null);
    avg[k] = vals.length>0 ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  });
  calibBaseline = avg;
  calibrated = true;

  document.getElementById('calibStep2').style.display='none';
  document.getElementById('calibStep3').style.display='block';

  const labels = Object.fromEntries(METRIC_DEFS.map(d => [d.id, d.label]));
  const units = Object.fromEntries(METRIC_DEFS.map(d => [d.id, d.unit]));
  let html = '';
  if (verticalOffset !== 0) {
    html += `<div class="calib-result-row" style="border-color:#4fc3f7">
      <span class="calib-result-label">&#128207; 垂直校正</span>
      <span><span class="calib-result-value">${verticalOffset.toFixed(1)}°</span> <span style="color:#888;font-size:11px">相機傾斜補償</span></span>
    </div>`;
  }
  html += '<h3>你的自然姿勢基準線</h3>';
  Object.keys(avg).forEach(k => {
    if (avg[k]!==null) {
      html += `<div class="calib-result-row"><span class="calib-result-label">${labels[k]||k}</span><span><span class="calib-result-value">${avg[k].toFixed(1)}${units[k]||'°'}</span></span></div>`;
    }
  });
  document.getElementById('calibResults').innerHTML = html;
  calibStatus.textContent = '已校正'; calibStatus.style.display = 'inline';
  calibStatus.className = 'status-badge calibrated';
  btnCalibrate.textContent = '重校';
}

document.getElementById('btnCalibAccept').addEventListener('click', () => {
  document.getElementById('calibModal').classList.add('hidden');
});
document.getElementById('btnCalibRetry').addEventListener('click', () => {
  document.getElementById('calibStep3').style.display='none';
  document.getElementById('calibStep1').style.display='block';
  calibFrames=[]; calibrated=false; calibBaseline=null; verticalOffset=0;
  plumbPoints=[];
  calibStatus.style.display='none'; btnCalibrate.textContent='校正';
});

// ─── 10. Report ────────────────────────────────
function genReport() {
  if (!lastLandmarks) return null;
  const vals = analyzePose(lastLandmarks.map(l=>({x:(1-l.x)*canvas.width,y:l.y*canvas.height,v:l.visibility})));
  let screenshot = null;
  try { screenshot = canvas.toDataURL('image/png'); } catch(e) {}
  return {
    timestamp: new Date().toISOString(),
    view: currentView, calibrated, baseline: calibBaseline?{...calibBaseline}:null,
    metrics: {...vals}, coverage: calcOverallConfidence(lastLandmarks),
    screenshot,
  };
}

function showReport() {
  const r = genReport();
  if (!r) { alert('無資料'); return; }

  const m = r.metrics;
  const time = new Date(r.timestamp).toLocaleString('zh-TW');
  let html = '';
  if (r.screenshot) {
    html += `<div style="text-align:center;margin-bottom:12px">
      <img src="${r.screenshot}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #2a2a4a" alt="姿勢截圖">
    </div>`;
  }
  html += `<p style="color:#888;font-size:13px">${time} | ${r.view==='side'?'側面':r.view==='squat'?'深蹲':'正面'} ${r.calibrated?'| 已校正':''} | 覆蓋率: ${r.coverage}%</p>
    <table><tr><th>指標</th><th>數值</th><th>範圍</th><th>評估</th></tr>`;

  METRIC_DEFS.forEach(def => {
    const v = m[def.id];
    if (v === null || v === undefined) return;
    if (!def.views.split(' ').includes(r.view)) return;
    const gmax = def.isKnee ? 190 : 3;
    const gmin = def.isKnee ? 170 : 0;
    const wmax = def.wMax;
    const wmin = def.isKnee ? 160 : def.wThresh;
    let cls, rs;
    if (def.isKnee) {
      if (v>=170&&v<=190) { cls='normal'; rs='170°~190°'; }
      else if (v>=160&&v<=200) { cls='warning'; rs='160°~200°'; }
      else { cls='abnormal'; rs='<160°或>200°'; }
    } else {
      if (v<=3) { cls='normal'; rs=`0~3${def.unit}`; }
      else if (v<=def.wThresh) { cls='warning'; rs=`3~${def.wThresh}${def.unit}`; }
      else { cls='abnormal'; rs=`>${def.wThresh}${def.unit}`; }
    }
    html += `<tr><td>${def.label}</td><td>${v.toFixed(1)}${def.unit}</td><td>${rs}</td><td class="${cls}">${cls==='normal'?'正常':cls==='warning'?'需注意':'異常'}</td></tr>`;
  });

  html += '</table><h3>建議</h3><ul style="color:#ccc;font-size:13px;padding-left:20px">';
  if (m.headTilt>15) html += '<li>頭部前傾，調整螢幕高度</li>';
  if (m.shoulderLevel>5) html += '<li>肩膀高低不均，放鬆高側</li>';
  if (m.pelvicTilt>10) html += '<li>骨盆傾斜，強化核心肌群</li>';
  if (m.kneeAngle!==null&&(m.kneeAngle<170||m.kneeAngle>190)) html += '<li>膝關節角度異常</li>';
  if (m.spineCurve>15) html += '<li>脊椎彎曲較大，注意坐姿</li>';
  if (m.cogShift>5) html += '<li>重心偏移，雙腳均勻承重</li>';
  if (m.headLateralTilt>10) html += '<li>頭部側偏，注意是否長期單側用力</li>';
  if (m.kneeVarusValgus>8) html += '<li>膝蓋內外翻角度較大，注意步態與站姿</li>';
  if (m.trunkLean>10) html += '<li>軀幹前傾，注意核心肌群</li>';
  if (!html.includes('<li>')) html += '<li>指標正常</li>';
  html += '</ul>';

  if (r.calibrated && r.baseline) {
    html += '<h3>校正基準</h3><table><tr><th>指標</th><th>基準</th></tr>';
    Object.entries(r.baseline).forEach(([k,v]) => {
      if (v!==null && m[k]!==null) {
        const def = METRIC_DEFS.find(d => d.id === k);
        html += `<tr><td>${def?.label||k}</td><td>${v.toFixed(1)}${def?.unit||'°'}</td></tr>`;
      }
    });
    html += '</table>';
  }

  document.getElementById('reportBody').innerHTML = html;
  document.getElementById('reportModal').classList.remove('hidden');
}

function doExport(fmt) {
  const r = genReport(); if (!r) { alert('無資料'); return; }
  const a = document.createElement('a');
  if (fmt==='csv') {
    let csv = '指標,數值\n';
    Object.entries(r.metrics).forEach(([k,v])=>{if(v!==null)csv+=`${k},${v.toFixed(2)}\n`;});
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `pose-${Date.now()}.csv`;
  } else {
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));
    a.download = `pose-${Date.now()}.json`;
  }
  a.click(); URL.revokeObjectURL(a.href);
}

function takeScreenshot() {
  if (!cameraActive) return;
  const a = document.createElement('a');
  a.download = `pose-${Date.now()}.png`;
  a.href = canvas.toDataURL('image/png'); a.click();
}

// ─── 11. Recording (拍照 + 倒數 + 即時分析) ────
function checkNodesReady(landmarks) {
  if (!landmarks || landmarks.length < 8) return { ok: false, msg: '未偵測到足夠節點' };
  const lsh = landmarks[L_SHOULDER], rsh = landmarks[R_SHOULDER];
  if (!lsh || !rsh || lsh.visibility < 0.3 || rsh.visibility < 0.3) return { ok: false, msg: '肩膀未完整偵測' };
  const avg = landmarks.reduce((s,l) => s + l.visibility, 0) / landmarks.length;
  if (avg < 0.4) return { ok: false, msg: `信心度偏低 (${(avg*100).toFixed(0)}%)` };
  return { ok: true, partial: landmarks.length < 20 };
}

function startSnapshot() {
  if (snapActive || !lastLandmarks) return;

  const check = checkNodesReady(lastLandmarks);
  if (!check.ok) {
    alert('節點不足，無法快拍：' + check.msg);
    return;
  }
  if (check.partial) {
    if (!confirm('未偵測到全身（僅上半身），仍要繼續？')) return;
  }

  snapActive = true;
  btnSnap.disabled = true;
  btnSnap.textContent = '拍攝中';
  countdownOverlay.classList.remove('hidden');
  doCountdown(5);
}

function doCountdown(sec) {
  countdownNum.textContent = sec;
  countdownNum.style.animation = 'none';
  void countdownNum.offsetHeight;
  countdownNum.style.animation = 'pulse 0.6s ease-in-out';

  if (sec <= 0) {
    capturePose();
    return;
  }
  setTimeout(() => doCountdown(sec - 1), 1000);
}

function capturePose() {
  countdownOverlay.classList.add('hidden');
  recordingPaused = true;

  if (!lastLandmarks) {
    recordingPaused = false; snapActive = false;
    btnSnap.disabled = false; btnSnap.innerHTML = '<span class="ctrl-icon">&#9679;</span> 快拍';
    return;
  }

  const screenshot = canvas.toDataURL('image/png');

  const pts = lastLandmarks.map(l => ({
    x: (1 - l.x) * canvas.width, y: l.y * canvas.height, v: l.visibility
  }));
  const vals = analyzePose(pts);
  const conf = calcConfidence(lastLandmarks);
  const coverage = calcOverallConfidence(lastLandmarks);
  const time = new Date();

  capturedData = {
    timestamp: time.toISOString(),
    timeStr: time.toLocaleString('zh-TW'),
    view: currentView,
    screenshot,
    landmarks: lastLandmarks.map(l => ({ x:l.x, y:l.y, z:l.z, v:l.visibility })),
    metrics: { ...vals },
    confidence: conf,
    coverage,
    calibrated,
    baseline: calibBaseline ? { ...calibBaseline } : null,
  };

  showCaptureResults(capturedData);
  snapActive = false;
  btnSnap.disabled = false;
  btnSnap.innerHTML = '<span class="ctrl-icon">&#9679;</span> 快拍';
}

function showCaptureResults(data) {
  const m = data.metrics;
  const c = data.confidence;
  captureOverlay.classList.remove('hidden');

  let html = `<div style="text-align:center;color:#888;font-size:12px;padding-bottom:8px;border-bottom:1px solid #2a2a4a;margin-bottom:8px">
    ${data.timeStr} | ${data.view==='side'?'側面':data.view==='squat'?'深蹲':'正面'} ${data.calibrated?'| 已校正':''}
  </div>`;

  METRIC_DEFS.forEach(def => {
    const v = m[def.id];
    if (v === null || v === undefined) return;
    if (!def.views.split(' ').includes(data.view)) return;

    const valStr = v.toFixed(1) + def.unit;
    const confVal = (c[def.id] || 0);

    let cls, statusText;
    if (def.isKnee) {
      if (v >= 170 && v <= 190) { cls='good'; statusText='正常'; }
      else if (v >= 160 && v <= 200) { cls='warn'; statusText='注意'; }
      else { cls='bad'; statusText='異常'; }
    } else {
      if (v <= 3) { cls='good'; statusText='正常'; }
      else if (v <= def.wThresh) { cls='warn'; statusText='輕微'; }
      else { cls='bad'; statusText='明顯'; }
    }

    let deltaHtml = '';
    if (data.calibrated && data.baseline && data.baseline[def.id] !== null) {
      const d = v - data.baseline[def.id];
      const dCls = Math.abs(d) < 3 ? 'zero' : d > 0 ? 'pos' : 'neg';
      deltaHtml = `<span class="capture-metric-delta ${dCls}">${d>=0?'+':''}${d.toFixed(1)}${def.unit}</span>`;
    } else {
      deltaHtml = `<span class="capture-metric-delta zero">--</span>`;
    }

    const confDot = confVal > 0.7 ? '🟢' : confVal > 0.5 ? '🟡' : '🔴';

    html += `<div class="capture-metric-row ${cls}">
      <span class="capture-metric-name">${confDot} ${def.label}</span>
      <span class="capture-metric-value">${valStr}</span>
      ${deltaHtml}
      <span class="capture-metric-status" style="color:${cls==='good'?'#4caf50':cls==='warn'?'#ff9800':'#f44336'}">${statusText}</span>
    </div>`;
  });

  const covCls = data.coverage > 70 ? 'good' : data.coverage > 50 ? 'warn' : 'bad';
  html += `<div class="capture-metric-row" style="border-left-color:#8888aa;margin-top:4px">
    <span class="capture-metric-name">📊 覆蓋率</span>
    <span class="capture-metric-value">${data.coverage}%</span>
    <span class="capture-metric-delta zero"></span>
    <span class="capture-metric-status" style="color:${covCls==='good'?'#4caf50':covCls==='warn'?'#ff9800':'#f44336'}">
      ${covCls==='good'?'良好':covCls==='warn'?'普通':'不足'}
    </span>
  </div>`;

  captureBody.innerHTML = html;
}

function closeCapture() {
  captureOverlay.classList.add('hidden');
  recordingPaused = false;
}

// ─── 12. Video Recording ──────────────────────
function startVideoRecording() {
  if (videoRecording) { stopVideoRecording(); return; }
  if (!cameraActive) return;

  const stream = canvas.captureStream(30);
  recordedChunks = [];

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch {
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch {
      alert('瀏覽器不支援錄影功能');
      return;
    }
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pose-video-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    recordedChunks = [];
  };

  mediaRecorder.start(1000);
  videoRecording = true;

  btnVideo.innerHTML = '<span class="ctrl-icon">&#9632;</span> 停止錄影';
  btnVideo.classList.add('danger');
  btnSnap.disabled = true;

  btnCamera.disabled = true;
  btnDetect.disabled = true;
}

function stopVideoRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  videoRecording = false;

  btnVideo.innerHTML = '<span class="ctrl-icon">&#128249;</span> 錄影';
  btnVideo.classList.remove('danger');
  btnSnap.disabled = !detecting;

  btnCamera.disabled = false;
  btnDetect.disabled = false;
}

document.getElementById('btnCaptureClose').addEventListener('click', closeCapture);
document.getElementById('btnCaptureSave').addEventListener('click', () => {
  if (capturedData) {
    const a = document.createElement('a');
    a.download = `pose-shot-${Date.now()}.png`;
    a.href = capturedData.screenshot; a.click();
  }
});
document.getElementById('btnCaptureReport').addEventListener('click', () => {
  closeCapture();
  setTimeout(showReport, 100);
});

// ─── 12. Events ────────────────────────────────
btnCamera.addEventListener('click', toggleCamera);

btnDetect.addEventListener('click', () => {
  detecting = !detecting;
  btnDetect.textContent = detecting ? '停止' : '偵測';
  btnDetect.classList.toggle('success', !detecting);
  btnDetect.classList.toggle('danger', detecting);
  btnSnap.disabled = !detecting;
  btnVideo.disabled = !detecting;
  btnCalibrate.disabled = !detecting;
  btnReport.disabled = !detecting;
  btnScreenshot.disabled = !detecting;
  if (!detecting) { resetMetrics(); showGuide(); }
});

btnSnap.addEventListener('click', startSnapshot);
btnVideo.addEventListener('click', startVideoRecording);
btnCalibrate.addEventListener('click', startCalibration);
btnReport.addEventListener('click', showReport);
btnScreenshot.addEventListener('click', takeScreenshot);

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('reportModal').classList.add('hidden');
});
document.getElementById('exportCSV').addEventListener('click', () => doExport('csv'));
document.getElementById('exportJSON').addEventListener('click', () => doExport('json'));
document.getElementById('printReport').addEventListener('click', () => window.print());

viewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    viewBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    // Filter metric cards by data-views attribute
    document.querySelectorAll('.metric-card').forEach(card => {
      const views = (card.dataset.views || '').split(' ');
      if (views.includes(currentView)) {
        card.classList.remove('hidden-card');
      } else {
        card.classList.add('hidden-card');
      }
    });
    resetMetrics();
  });
});

window.addEventListener('resize', () => { if (cameraActive) resizeCanvas(); });

// ─── Start ─────────────────────────────────────
btnCamera.disabled = true;
btnSnap.disabled = true;
btnVideo.disabled = true;
// Filter initial view cards
document.querySelectorAll('.metric-card').forEach(card => {
  const views = (card.dataset.views || '').split(' ');
  if (!views.includes('front')) card.classList.add('hidden-card');
});
initPose();
