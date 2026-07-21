import io
import threading
import tkinter as tk
import customtkinter as ctk
from PIL import Image
from config import Config
from cloud.line_login import LineLogin
from cloud.cloud_service import CloudService
from cloud.sync_manager import SyncManager


class LoginPanel(ctk.CTkFrame):
    def __init__(self, master, line_login: LineLogin, cloud: CloudService, sync_mgr: SyncManager, **kwargs):
        super().__init__(master, **kwargs)
        self._line = line_login
        self._cloud = cloud
        self._sync = sync_mgr
        self._build_ui()

    def _build_ui(self):
        self._frame = ctk.CTkFrame(self)
        self._frame.pack(expand=True, fill="both", padx=20, pady=20)

        self._title = ctk.CTkLabel(
            self._frame, text="登入系統",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        self._title.pack(pady=(20, 10))

        self._login_btn = ctk.CTkButton(
            self._frame,
            text="LINE 掃碼登入",
            command=self._line_login_async,
            width=200,
            height=50,
            font=ctk.CTkFont(size=16),
            fg_color="#06C755",
            hover_color="#05a84a",
        )
        self._login_btn.pack(pady=10)

        self._qr_label = ctk.CTkLabel(self._frame, text="", width=200, height=200)
        self._status_label = ctk.CTkLabel(
            self._frame, text="", font=ctk.CTkFont(size=12), text_color="gray"
        )
        self._status_label.pack(pady=5)

        sep = ctk.CTkFrame(self._frame, height=2, fg_color="gray")
        sep.pack(fill="x", padx=40, pady=10)

        ctk.CTkLabel(self._frame, text="或使用帳密登入", font=ctk.CTkFont(size=12), text_color="gray").pack()

        self._email_entry = ctk.CTkEntry(self._frame, placeholder_text="Email", width=250)
        self._email_entry.pack(pady=3)

        self._pass_entry = ctk.CTkEntry(self._frame, placeholder_text="密碼", width=250, show="*")
        self._pass_entry.pack(pady=3)

        self._pwd_login_btn = ctk.CTkButton(
            self._frame, text="登入", command=self._password_login, width=150,
        )
        self._pwd_login_btn.pack(pady=5)

        self._user_info = ctk.CTkLabel(
            self._frame, text="", font=ctk.CTkFont(size=14)
        )
        self._logout_btn = ctk.CTkButton(
            self._frame, text="登出", command=self._logout, width=100,
            fg_color="#a32a2a", hover_color="#7a1f1f",
        )

    def _line_login_async(self):
        self._login_btn.configure(state="disabled", text="正在產生 QR Code...")
        self._qr_label.configure(text="")
        self._status_label.configure(text="")
        threading.Thread(target=self._do_line_login, daemon=True).start()

    def _do_line_login(self):
        try:
            url, state = self._line.generate_qr_data()
            import qrcode
            qr = qrcode.QRCode(box_size=6, border=2)
            qr.add_data(url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            bio = io.BytesIO()
            img.save(bio, format="PNG")
            bio.seek(0)
            pil_img = Image.open(bio)

            ctimg = ctk.CTkImage(pil_img, size=(200, 200))
            self._qr_label.configure(image=ctimg, text="")
            self._qr_label.image = ctimg
            self._status_label.configure(
                text="請使用 LINE 掃描 QR Code 登入",
                text_color="#06C755"
            )
            self._login_btn.configure(text="等待掃碼中...")

            if not self._cloud.is_ready:
                self._status_label.configure(text="Firebase 未連線", text_color="red")
                self._login_btn.configure(state="normal", text="LINE 掃碼登入")
                return

            code = self._line.poll_firestore_for_code(self._cloud.db, state)
            if code:
                ok = self._line.exchange_code(code)
                if ok:
                    self._on_login_success()
                else:
                    self._status_label.configure(text="Token 交換失敗", text_color="red")
            else:
                self._status_label.configure(text="登入超時，請重試", text_color="red")

        except ImportError:
            self._status_label.configure(
                text="缺少 qrcode 套件，請安裝：pip install qrcode[pil]",
                text_color="red",
            )
        finally:
            self._login_btn.configure(state="normal")

    def _on_login_success(self):
        self._sync.save_login_profile()
        self._qr_label.configure(image="", text="")
        self._login_btn.pack_forget()
        self._qr_label.pack_forget()
        self._status_label.pack_forget()
        self._user_info.configure(
            text=f"已登入：{self._line.profile.display_name} (LINE)",
            text_color="#2ecc71",
        )
        self._user_info.pack(pady=5)
        self._logout_btn.pack(pady=5)

    def _password_login(self):
        email = self._email_entry.get().strip()
        pwd = self._pass_entry.get()
        if not email or not pwd:
            self._status_label.configure(text="請輸入 Email 和密碼", text_color="red")
            return
        if not self._cloud.is_ready:
            self._status_label.configure(text="Firebase 未連線", text_color="red")
            return
        threading.Thread(target=self._do_password_login, args=(email, pwd), daemon=True).start()

    def _do_password_login(self, email: str, pwd: str):
        try:
            import requests
            api_key = Config.FIREBASE_API_KEY
            if not api_key:
                self._status_label.configure(text="未設定 FIREBASE_API_KEY", text_color="red")
                return
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
            resp = requests.post(url, json={"email": email, "password": pwd, "returnSecureToken": True}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self._line._profile = type("obj", (), {
                    "user_id": data.get("localId", ""),
                    "display_name": email.split("@")[0],
                    "picture_url": "",
                })()
                self._line._access_token = data.get("idToken", "")
                self._on_login_success()
            else:
                err = resp.json().get("error", {}).get("message", "登入失敗")
                self._status_label.configure(text=f"登入錯誤：{err}", text_color="red")
        except requests.RequestException as e:
            self._status_label.configure(text=f"網路錯誤：{str(e)}", text_color="red")

    def _logout(self):
        self._line.logout()
        self._user_info.pack_forget()
        self._logout_btn.pack_forget()
        self._login_btn.pack(pady=10)
        self._qr_label.pack_forget()
        self._status_label.configure(text="", text_color="gray")
        self._status_label.pack(pady=5)
        self._login_btn.configure(state="normal", text="LINE 掃碼登入")
