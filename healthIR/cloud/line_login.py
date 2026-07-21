import json
import os
import secrets
import threading
import time
import webbrowser
from dataclasses import dataclass
from typing import Optional

import requests

from config import Config


LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize"
LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
LINE_PROFILE_URL = "https://api.line.me/v2/profile"
LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"


@dataclass
class LineProfile:
    user_id: str
    display_name: str
    picture_url: str = ""
    status_message: str = ""


class LineLogin:
    def __init__(self):
        self._channel_id = Config.LINE_CHANNEL_ID
        self._channel_secret = Config.LINE_CHANNEL_SECRET
        self._redirect_uri = Config.LINE_REDIRECT_URI
        self._project_id = Config.FIREBASE_PROJECT_ID
        self._access_token: Optional[str] = None
        self._profile: Optional[LineProfile] = None
        self._state: Optional[str] = None

    @property
    def is_logged_in(self) -> bool:
        return self._access_token is not None and self._profile is not None

    @property
    def profile(self) -> Optional[LineProfile]:
        return self._profile

    def get_auth_url(self) -> str:
        self._state = secrets.token_urlsafe(32)
        params = (
            f"response_type=code"
            f"&client_id={self._channel_id}"
            f"&redirect_uri={self._redirect_uri}"
            f"&state={self._state}"
            f"&scope=profile%20openid"
        )
        return f"{LINE_AUTH_URL}?{params}"

    def generate_qr_data(self) -> tuple[str, str]:
        url = self.get_auth_url()
        return url, self._state

    def poll_firestore_for_code(self, firestore_db, state: str, timeout: int = 120) -> Optional[str]:
        doc_ref = firestore_db.collection("authStates").document(state)
        start = time.time()
        while time.time() - start < timeout:
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                if data.get("status") == "completed":
                    return data.get("code")
            time.sleep(1.5)
        return None

    def exchange_code(self, code: str) -> bool:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self._redirect_uri,
            "client_id": self._channel_id,
            "client_secret": self._channel_secret,
        }
        try:
            resp = requests.post(LINE_TOKEN_URL, data=data, timeout=10)
            if resp.status_code != 200:
                return False
            token_data = resp.json()
            self._access_token = token_data.get("access_token")
            return self._fetch_profile()
        except requests.RequestException:
            return False

    def _fetch_profile(self) -> bool:
        if not self._access_token:
            return False
        try:
            headers = {"Authorization": f"Bearer {self._access_token}"}
            resp = requests.get(LINE_PROFILE_URL, headers=headers, timeout=10)
            if resp.status_code != 200:
                return False
            data = resp.json()
            self._profile = LineProfile(
                user_id=data.get("userId", ""),
                display_name=data.get("displayName", ""),
                picture_url=data.get("pictureUrl", ""),
                status_message=data.get("statusMessage", ""),
            )
            return True
        except requests.RequestException:
            return False

    def verify_token(self) -> bool:
        if not self._access_token:
            return False
        try:
            params = {"access_token": self._access_token}
            resp = requests.get(LINE_VERIFY_URL, params=params, timeout=10)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def logout(self):
        self._access_token = None
        self._profile = None
        self._state = None

    def to_dict(self) -> dict:
        if not self._profile:
            return {}
        return {
            "user_id": self._profile.user_id,
            "display_name": self._profile.display_name,
            "picture_url": self._profile.picture_url,
        }
