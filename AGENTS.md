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
GaitAnalysis/                  # 主應用程式 (Python 原始碼)
├── config.py                  # 全域設定、i18n 載入
├── main.py                    # 程式進入點
├── requirements.txt           # Python 依賴
├── analysis/                  # 步態演算法
│   ├── gait_analyzer.py       # 步態週期分析
│   ├── simple_analyzer.py     # 簡易分析器 (主力)
│   ├── risk_calculator.py     # 跌倒風險計算
│   └── math_utils.py          # 數學工具函式
├── app/                       # 應用邏輯
│   ├── app_controller.py      # MVC Controller
│   ├── data_manager.py        # CSV/JSON 匯出
│   └── state_machine.py       # 狀態機
├── camera/                    # 攝影機抽象層
│   ├── camera_interface.py    # 介面定義
│   ├── webcam_provider.py     # Webcam 實作
│   └── depth_camera_stub.py   # 深度攝影機 Stub
├── skeleton/                  # 骨架追蹤
│   ├── skeleton_tracker.py    # MediaPipe 封裝
│   └── skeleton_data.py       # 骨架資料模型
├── ui/                        # 使用者介面
│   ├── main_window.py         # 主視窗
│   ├── camera_panel.py        # 攝影機畫面
│   ├── gait_panel.py          # 步態測量面板
│   └── result_panel.py        # 結果顯示面板
└── assets/locales/
    └── zh_TW.json             # 繁體中文語系

LG/                            # 廠商原始資料
├── GaitBEST_Analysis.pdf      # 產品說明書 / 分析報告
└── Data(原始檔)/               # 安裝程式與驅動
    ├── GaitBEST/               # GaitBEST 1.02.02 步態分析程式
    │   ├── GaitBEST.exe       # Unity 步態分析程式
    │   ├── _Setting/          # 設定檔 (gait.ini, happygogoparam.ini)
    │   └── ...
    ├── Noraxon/               # Noraxon MR 3.18 (肌電/步態)
    ├── Zebris/                # Zebris FDM 壓力板 1.18.44
    │   ├── Driver/            # USB 驅動
    │   └── Software/          # 分析軟體
    └── software/              # 公用工具 (7-Zip, XnView, WinRAR...)
```

## 分析模組說明

| 模組 | 功能 |
|------|------|
| `simple_analyzer.py` | 主力分析器：計算步長、步頻、站立/擺動期、對稱性、穩定度 |
| `gait_analyzer.py` | 進步步態週期分析 (Heel Strike / Toe Off 偵測) |
| `risk_calculator.py` | 根據步態參數計算跌倒風險分數 |
| `math_utils.py` | 角度計算、濾波、統計工具 |

## 開發指令

```bash
# 安裝依賴
pip install -r GaitAnalysis/requirements.txt

# 執行開發版本
python GaitAnalysis/main.py

# 打包成 exe
pyinstaller --onefile --windowed GaitAnalysis/main.py
```

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
- [ ] 連接遠端仓库 (已完成)
