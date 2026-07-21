FROM nginx:1.25-alpine

# 複製靜態檔案到 /moveageeye/ 路徑
COPY index.html /usr/share/nginx/html/moveageeye/index.html
COPY css/ /usr/share/nginx/html/moveageeye/css/
COPY js/ /usr/share/nginx/html/moveageeye/js/

# 複製 nginx 設定模板
COPY nginx.conf /etc/nginx/templates/default.conf.template

# nginx 官方映像會自動用 envsubst 處理 /etc/nginx/templates/ 下的 .template 檔案
# 並輸出到 /etc/nginx/conf.d/，只替換 $PORT
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV PORT=8080

EXPOSE 8080
