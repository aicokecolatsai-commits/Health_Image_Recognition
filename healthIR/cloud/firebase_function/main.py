import functions_framework
import json
import os

from google.cloud import firestore


PROJECT_ID = os.environ.get("GCP_PROJECT", "")
db = firestore.Client(project=PROJECT_ID)


@functions_framework.http
def line_auth_callback(request):
    code = request.args.get("code", "")
    state = request.args.get("state", "")
    error = request.args.get("error", "")

    if error:
        db.collection("authStates").document(state).set({
            "status": "error",
            "error": error,
        })
        return "LINE 登入失敗，請重試。", 400

    if not code or not state:
        return "缺少必要參數 (code, state)", 400

    db.collection("authStates").document(state).set({
        "code": code,
        "status": "completed",
    })

    html = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>登入成功</title>
<style>
body { font-family: sans-serif; text-align: center; padding: 80px 20px; background: #1a1a2e; color: #fff; }
.box { max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; background: #16213e; }
.check { font-size: 64px; color: #2ecc71; }
h1 { font-size: 24px; margin: 20px 0 10px; }
p { color: #aaa; }
</style></head><body>
<div class="box">
<div class="check">&#10004;</div>
<h1>LINE 登入成功</h1>
<p>已成功驗證您的 LINE 帳號，請關閉此視窗返回桌面應用程式繼續操作。</p>
</div></body></html>"""

    return html, 200, {"Content-Type": "text/html; charset=utf-8"}
