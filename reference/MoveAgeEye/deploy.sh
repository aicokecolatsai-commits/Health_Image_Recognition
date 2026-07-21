#!/bin/bash
# =====================================================
# MoveAge Eye - GCP Cloud Run 一鍵部署腳本
# 在 Google Cloud Shell 中執行
# =====================================================

set -e

PROJECT_ID="localcare-web"
REGION="asia-east1"
SERVICE_NAME="moveageeye"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo ""
echo "🚀 MoveAge Eye 部署腳本"
echo "========================"

# ---- 設定專案 ----
echo "📦 設定 GCP 專案..."
gcloud config set project $PROJECT_ID 2>/dev/null
echo "   ✅ 專案：$PROJECT_ID"

# ---- 建置映像 ----
echo ""
echo "🐳 在雲端建置 Docker 映像（約 1~2 分鐘）..."
gcloud builds submit --tag $IMAGE_NAME .
echo "   ✅ 映像建置完成"

# ---- 部署到 Cloud Run ----
echo ""
echo "☁️  部署到 Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 128Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 2
echo "   ✅ 部署完成"

# ---- 取得網址 ----
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
echo "==========================================="
echo "🎮 測試網址：${SERVICE_URL}/moveageeye/"
echo "==========================================="
echo ""
echo "📋 下一步：綁定自訂網域"
echo "   gcloud beta run domain-mappings create \\"
echo "       --service $SERVICE_NAME \\"
echo "       --domain localcare.com.tw \\"
echo "       --region $REGION"
echo ""
