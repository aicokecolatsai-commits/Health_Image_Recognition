# MoveAge Eye - AI 人體動作偵測平台 🚀

本專案是一個基於網頁前端的 AI 人體動作偵測與姿勢分析平台，主要包含 **動作擺拍遊戲（適合長輩復健/訓練）** 與 **脊椎側彎對稱性辨識** 兩大功能。專案採用純前端架構，無須後端資料庫，透過瀏覽器呼叫本機攝影機或上傳相片，利用 TensorFlow.js MoveNet 模型進行即時骨架偵測與運算。

---

## 📂 目錄結構與檔案盤點

```text
20260501MOVE_關節骨架/
├── css/
│   └── style.css            # 全域與各畫面 UI 樣式（霓虹暗黑科技風格、響應式設計）
├── js/
│   ├── main.js              # 程式主入口，管理首頁及 A/B 模組的生命週期與切換
│   ├── camera.js            # 攝影機管理模組（權限申請、自動防呆降級、畫面擷取）
│   ├── poseDetector.js      # TensorFlow.js MoveNet 骨架偵測器（Lightning 模型與跳幀優化）
│   ├── poses.js             # 擺拍目標姿勢資料庫（上半身/下半身/全身）與 Stick Figure 繪製工具
│   ├── app.js               # 動作擺拍遊戲主邏輯（倒數、比對、即時得分、拍照閃光、結果頁）
│   ├── scoring.js           # 姿勢比對評分演算法（關節夾角計算、分類權重動態調整、S型分數曲線）
│   ├── scoliosis.js         # 脊椎側彎辨識流程控制（引導畫面、拍照/上傳解析、歷史紀錄呈現）
│   ├── spineAnalyzer.js     # 脊椎與軀幹對稱性分析核心（肩膀差、骨盆差、中線偏移、Canvas 標註線繪製）
│   └── historyManager.js    # 歷史紀錄管理（LocalStorage 儲存，上限 50 筆，具容量超限降級保護）
├── index.html               # 專案唯一 HTML 入口，包含所有畫面結構與 TensorFlow.js CDN 引入
├── embed-test.html          # iframe 嵌入測試頁面（用於測試相機授權與跨網域嵌入）
├── server.ps1               # 本地 PowerShell HTTP 開發伺服器腳本
├── Dockerfile               # 專案 Docker 容器化設定（使用 Nginx 映像檔）
├── nginx.conf               # Nginx 伺服器設定（支援 gzip 壓縮、反向代理路由規劃）
├── deploy.sh                # Google Cloud Run 一鍵自動部署腳本（部署至專案 localcare-web）
├── .gitignore               # Git 忽略設定
└── .dockerignore            # Docker 忽略設定
```

---

## 🛠️ 開發與運行環境指引

由於本專案使用 ES6 模組化規格（`type="module"`）及 `navigator.mediaDevices` 攝影機 API，**直接按兩下開啟 `index.html` 會因跨來源限制（CORS）與安全性限制而無法載入 JS 並啟動攝影機**。必須透過本地 HTTP 伺服器執行，且瀏覽器安全規範規定**必須使用 `localhost` 或 `HTTPS` 協議才能授權攝影機**。

### 1. 本地開發伺服器啟動方式

*   **方式 A：PowerShell 啟動（Windows 推薦）**
    1. 在本目錄點擊右鍵選擇「使用 PowerShell 執行」或開啟終端機執行：
       ```powershell
       powershell -File server.ps1
       ```
    2. 開啟瀏覽器訪問：[http://localhost:3000](http://localhost:3000)
*   **方式 B：VS Code Live Server 套件（跨平台推薦）**
    1. 在 VS Code 中安裝 `Live Server` 延伸模組。
    2. 在編輯器右下角點擊 `Go Live`。
*   **方式 C：Node.js 快速啟動**
    ```bash
    npx serve . -p 3000
    ```
*   **方式 D：Python 快速啟動**
    ```bash
    python -m http.server 3000
    ```

---

## 🧠 核心模組技術架構

```mermaid
graph TD
    index.html --> main.js
    main.js --> camera.js[camera.js<br>攝影機控制]
    main.js --> poseDetector.js[poseDetector.js<br>MoveNet Lightning]
    
    subgraph 模組 A：動作擺拍遊戲
        main.js -. 動態匯入 .-> app.js[app.js<br>遊戲流程]
        app.js --> poses.js[poses.js<br>姿勢庫定義]
        app.js --> skeleton.js[skeleton.js<br>骨架渲染器]
        app.js --> scoring.js[scoring.js<br>角度評分]
    end

    subgraph 模組 B：脊椎側彎辨識
        main.js --> scoliosis.js[scoliosis.js<br>側彎主控]
        scoliosis.js --> spineAnalyzer.js[spineAnalyzer.js<br>脊椎對稱分析]
        scoliosis.js --> historyManager.js[historyManager.js<br>LocalStorage]
    end
```

### 1. 骨架偵測器 ([poseDetector.js](file:///e:/SNOOCOLA/AI_Project/02_anti_project/20260501MOVE_%E9%97%9C%E7%AF%80%E9%AA%A8%E6%9E%B6/js/poseDetector.js))
*   **技術**：使用 TensorFlow.js 的 MoveNet (SinglePose-Lightning) 進行 17 個點人體姿態估算。
*   **效能優化**：具備自動效能調整機制（`adjustPerformance`）。若偵測到執行 FPS 低於 15，會自動調高 `skipFrames` 以跳過部分影格分析，減輕 CPU 負擔；FPS 回升後則自動恢復。
*   **資料標準化**：將 MoveNet 座標（像素）除以畫布寬高，轉換為 `0.0 ~ 1.0` 區間的相對坐標，消除解析度差異。

### 2. 姿勢評分機制 ([scoring.js](file:///e:/SNOOCOLA/AI_Project/02_anti_project/20260501MOVE_%E9%97%9C%E7%AF%80%E9%AA%A8%E6%9E%B6/js/scoring.js))
*   **演算法**：針對人體 10 組核心關節夾角進行向量夾角（`Math.acos`）比對，非直接對比坐標絕對值。
*   **分類權重**：
    *   **上半身模式**：偏重左右手肘、左右肩膀、肩膀角度，並將腿部夾角評分關閉（權重設為 0），**支援長輩坐在椅子上玩**。
    *   **下半身模式**：偏重左右膝蓋、左右髖部，手臂權重降低。
    *   **全身模式**：平衡評估所有 10 個夾角。
*   **評分優化**：利用鏡像轉換方法（`_mirrorKeypoints`）處理前置鏡頭的水平翻轉問題，並用 S 型曲線映射（`_curveScore`）優化得分分布。

### 3. 脊椎對稱分析 ([spineAnalyzer.js](file:///e:/SNOOCOLA/AI_Project/02_anti_project/20260501MOVE_%E9%97%9C%E7%AF%80%E9%AA%A8%E6%9E%B6/js/spineAnalyzer.js))
*   **分析原理**：
    1.  **肩膀與骨盆高度差**：計算左右肩膀/髖部的 Y 軸斜率，並以肩寬或骨盆寬為基準進行正規化。
    2.  **脊椎中線偏移**：計算鼻子、肩中心點、骨盆中心點三者構成的折線與垂直線的偏離量。
    3.  **軀幹傾斜角**：計算肩中心點與骨盆中心點連線與垂直方向的夾角。
*   **權重**：肩膀對稱度 (30%) + 骨盆對稱度 (25%) + 中線偏移 (25%) + 軀幹傾斜 (20%)，綜合為 `0~100` 對稱得分。
*   **視覺化疊加**：自動在相片 Canvas 上繪製實體肩膀/骨盆連線、虛線黃色脊椎折線、理想垂直參考線，並在交點上標註偏斜度數（如肩膀傾斜 `1.5°`）。

### 4. 歷史紀錄管理器 ([historyManager.js](file:///e:/SNOOCOLA/AI_Project/02_anti_project/20260501MOVE_%E9%97%9C%E7%AF%80%E9%AA%A8%E6%9E%B6/js/historyManager.js))
*   基於瀏覽器 `LocalStorage` 儲存，上限為 50 筆。
*   **安全降級防護**：由於 `LocalStorage` 有約 5MB 的硬性容量限制，當儲存 base64 縮圖導致容量不足（`QuotaExceededError`）時，系統會自動清空所有紀錄的圖片資料，改採「純文字數據」模式儲存，以確保應用程式不會崩潰。

---

## 🚀 雲端部署與發佈

本專案支援一鍵容器化部署至 **Google Cloud Run**。

### 1. 部署前準備
確保您已在本地或 Google Cloud Shell 中安裝並初始化 `gcloud` CLI 工具。
預設專案 ID 為 `localcare-web`，區域為 `asia-east1`。

### 2. 一鍵部署命令
在終端機中執行：
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Docker 容器化說明
*   Dockerfile 使用 `nginx:1.25-alpine` 輕量化映像檔。
*   預設專案路徑被封裝在 `/moveageeye/` 下。
*   `nginx.conf` 針對靜態資源（CSS, JS, JSON）配置了 Gzip 壓縮，以加快行動裝置下載與載入 AI 模型的速度。

### 4. iframe 嵌入規格 ([embed-test.html](file:///e:/SNOOCOLA/AI_Project/02_anti_project/20260501MOVE_%E9%97%9C%E7%AF%80%E9%AA%A8%E6%9E%B6/embed-test.html))
若要將本應用嵌入至其他整合型系統，請務必開啟 `allow="camera"` 權限：
```html
<iframe src="https://[你的網址]/moveageeye/index.html" width="420" height="740" allow="camera *; microphone *" allowfullscreen></iframe>
```

---

## 📝 後續開發與優化方向 (TODO)

若其他電腦接手繼續開發，以下為建議的改進與擴充方向：

1.  **關鍵點防抖優化（Skeleton Smoothing）**：
    目前 MoveNet 的關節點在高負載或環境雜訊下可能會有輕微震顫（Jittering）。後續可引入 **One Euro Filter** 或 **滑動平均濾波（Moving Average Filter）** 來平滑骨架線條與降低分數浮動。
2.  **多人偵測過濾（Multi-Person Filter）**：
    目前使用 SinglePose Lightning 模型。當畫面中同時出現其他人（例如長輩旁的看護或家人）時，骨架可能會發生跳躍偵測。建議可在取得骨架後，計算目標與前一幀「根關節（如鼻子）」的距離，鎖定最近的人體進行比對，或在畫面上提示「偵測到多人，請維持單人受測」。
3.  **姿勢資料庫擴充**：
    可於 `js/poses.js` 中新增更多復健用動作，甚至提供動態角度（例如偵測「深蹲」需要連續完成蹲下與站起動作），目前僅支援靜態擺拍比對。
4.  **國際化支援 (i18n)**：
    目前專案語系固定為繁體中文（適合台灣在地長輩），架構中已有部分英文預留欄位（如 `nameEn`），後續可實作語系切換模組。
