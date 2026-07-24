# GaitAnalysis — 步態分析系統

## 專案概述
基於電腦視覺的步態分析桌面應用程式，使用 Webcam / 深度攝影機捕捉人體骨架，進行步態參數分析與跌倒風險評估。

## 技術棧
- **語言**: Python 3.12
- **GUI**: customtkinter
- **視覺**: OpenCV, MediaPipe (骨架追蹤)
- **分析**: NumPy, Matplotlib
- **打包**: PyInstaller → GaitAnalysis.exe

## 目錄結構

```
healthIR/                      # 主要開發目錄 (v2.0 重寫)
├── config.py                  # 全域設定、i18n 載入、CameraType 列舉
├── main.py                    # 程式進入點
├── requirements.txt           # Python 依賴
├── analysis/                  # 步態演算法
│   ├── gait_analyzer.py       # 資料模型 + 抽象基底 (GaitLength, GaitResult...)
│   ├── simple_analyzer.py     # 主力分析器 (GaitBEST 演算法重寫)
│   │   ├── HS/TO 偵測         # 腳踝 AP 軌跡 + Savitzky-Golay + 波峰/波谷
│   │   ├── CalWaterFall       # 瀑布式左右腳比對校正
│   │   └── 真實站立/擺動期    # 從 HS/TO 事件計算，取代硬編碼
│   ├── risk_calculator.py     # 跌倒風險計算
│   └── math_utils.py          # 數學工具函式 (含 cal_waterfall)
├── cloud/                     # 雲端整合
│   ├── line_login.py          # LINE OAuth 2.0 登入 (QR code + token 交換)
│   ├── cloud_service.py       # Firebase Admin SDK (Firestore CRUD)
│   ├── sync_manager.py        # 本地↔雲端同步協調器
│   └── firebase_function/     # Cloud Function (LINE callback 中繼)
│       ├── main.py            #   HTTP trigger: LINE auth → Firestore
│       ├── requirements.txt   #   Python 依賴
│       └── package.json       #   部署腳本
├── app/                       # 應用邏輯
│   ├── app_controller.py      # MVC Controller
│   ├── data_manager.py        # CSV/JSON 匯出
│   ├── patient_manager.py     # 病人 CRUD (JSON 儲存)
│   ├── pdf_generator.py       # PDF 報表產生 (reportlab)
│   └── state_machine.py       # 狀態機
├── camera/                    # 攝影機抽象層 (支援切換)
│   ├── camera_interface.py    # 介面定義 (含 depth 方法)
│   ├── webcam_provider.py     # Webcam 實作
│   └── depth_camera_provider.py # 深度攝影機 (Kinect v2 / Orbbec)
├── skeleton/                  # 骨架追蹤
│   ├── skeleton_tracker.py    # MediaPipe 封裝
│   └── skeleton_data.py       # 骨架資料模型
├── ui/                        # 使用者介面
│   ├── main_window.py         # 主視窗
│   ├── camera_panel.py        # 鏡頭設定 + 方向選擇
│   ├── gait_panel.py          # 步態測量面板
│   └── result_panel.py        # 結果顯示面板
└── assets/locales/
    └── zh_TW.json             # 繁體中文語系

GaitAnalysis/                  # v1.0 原始碼 (保留備份, 不再修改)
LG/                            # 廠商原始資料 (唯讀參考)
├── GaitBEST_Analysis.pdf      # GaitBEST 反編譯分析文件
└── Data(原始檔)/               # 安裝程式與驅動
    ├── GaitBEST/              # GaitBEST 1.02.02 (Unity)
    ├── Noraxon/               # Noraxon MR 3.18
    ├── Zebris/                # Zebris FDM 壓力板
    └── software/              # 公用工具

reference/                     # 參考專案
├── PoseAI/                    # MediaPipe + FastAPI 姿勢分析
└── MoveAgeEye/                # TensorFlow.js MoveNet 平台
```

## 分析模組說明

| 模組 | 功能 | 狀態 |
|------|------|------|
| `simple_analyzer.py` | 主力分析器：HS/TO 偵測、CalWaterFall 校正、步長/步頻/站立期/擺動期/支撐期/ROM/風險 | ✅ v2.0 重寫 |
| `gait_analyzer.py` | 資料模型 (GaitLength, GaitTimes, GaitSupport, GROM, GaitRisk, GaitResult) | ✅ 完整 |
| `risk_calculator.py` | 根據 strideLength/height 計算跌倒/功能喪失/失能三項風險 | ✅ 完整 |
| `math_utils.py` | Savitzky-Golay、峰值/波谷、CalWaterFall、角度、CV、標準差 | ✅ 強化 |
| `patient_manager.py` | 病人 CRUD 管理 (JSON 檔案儲存) | ✅ 完整 |
| `pdf_generator.py` | PDF 報表產生 (reportlab，含五項參數表格) | ✅ 完整 |
| `chart_widget.py` | Matplotlib 六面板圖表 (空間/風險/ROM/支撐期/對稱性/摘要) | ✅ 完整 |
| `line_login.py` | LINE OAuth 2.0 登入 (QR code + token 交換) | ✅ 完整 |
| `cloud_service.py` | Firebase Firestore CRUD (病人/評估記錄) | ✅ 完整 |
| `sync_manager.py` | 本地↔雲端同步協調器 | ✅ 完整 |

## 開發指令

```bash
# 安裝依賴
pip install -r healthIR/requirements.txt

# 執行開發版本
python healthIR/main.py

# 打包成 exe
pyinstaller --onefile --windowed healthIR/main.py
```

## 鏡頭支援

| 類型 | 狀態 | 說明 |
|------|------|------|
| 一般 Webcam | ✅ 可運作 | OpenCV VideoCapture |
| 手機 IP Webcam | ✅ 可運作 | 同 Webcam，選 camera_id |
| Kinect v2 | 🚧 架構就緒 | 需 pykinect2 驅動 |
| Orbbec Astra | 🚧 架構就緒 | 需 openni 驅動 |

## 參考專案 (reference/)

| 目錄 | 來源 | 技術 | 亮點 |
|------|------|------|------|
| `PoseAI/` | 20260707姿態POSEAI | MediaPipe Pose 33點 + FastAPI | 姿勢角度演算法、校正系統、SQLite 後端 |
| `MoveAgeEye/` | 20260501MOVE_關節骨架 | TensorFlow.js MoveNet 17點 | 脊椎側彎偵測、復健評分遊戲 |

### PoseAI 摘要
瀏覽器 + FastAPI 後端的人體姿勢分析系統。使用 MediaPipe PoseLandmarker Lite 模型進行 2D 骨架追蹤，支援正面/側面/深蹲三種視角的生物力學指標計算（頭部傾斜、肩膀水平、膝蓋角度等）。具備個人基準線校正與 SQLite 資料庫儲存。

### MoveAgeEye 摘要
純前端 AI 人體動作偵測平台（MoveNet Lightning），含兩大模組：
- **動作擺拍遊戲**：長者復健—比對使用者與目標姿勢的 10 個關節角度，加權評分
- **脊椎側彎辨識**：分析肩膀對稱性、髖部對稱性、脊椎中線偏移、軀幹傾斜，輸出 0-100 風險分數

## 狀態
- [x] Git 初始化 (2026-07-21)
- [x] 第一次完整 Commit (0ff70c9)
- [x] 推送至 GitHub (Health_Image_Recognition)
- [x] v2.0 開發目錄 healthIR/ 建立 (2026-07-21)
- [x] Phase 1 演算法重寫 (HS/TO, CalWaterFall, 真實站立/擺動/支撐期)
- [x] 鏡頭切換架構 (4 種鏡頭類型 + 步態方向選擇)
- [x] 雲端整合: LINE Login + Firebase Firestore (29b3fc1)
- [x] 桌面端功能補強: 病人管理 + 圖表 + PDF 報表 (86e318d)
