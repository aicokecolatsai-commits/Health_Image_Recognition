import json
import os
import sys


def _get_base_dir():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(__file__)


_LOCALE_DIR = os.path.join(_get_base_dir(), "assets", "locales")

class Config:
    APP_NAME = "GaitAnalysis"
    APP_VERSION = "1.0.0"
    DEFAULT_FPS = 30
    DEFAULT_CAMERA_ID = 0
    CAMERA_WIDTH = 640
    CAMERA_HEIGHT = 480
    MAX_RECORD_SECONDS = 30

    CALIBRATION_HEIGHT_CM = 170

    _locale_data = {}

    @classmethod
    def load_locale(cls, lang="zh_TW"):
        path = os.path.join(_LOCALE_DIR, f"{lang}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                cls._locale_data = json.load(f)

    @classmethod
    def lang(cls, key: str, default: str = "") -> str:
        parts = key.split(".")
        data = cls._locale_data
        for p in parts:
            if isinstance(data, dict):
                data = data.get(p)
            else:
                return default
        return data if isinstance(data, str) else default