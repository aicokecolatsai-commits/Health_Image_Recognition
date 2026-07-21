import json
import os
import sys


def _get_base_dir():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(__file__)


_LOCALE_DIR = os.path.join(_get_base_dir(), "assets", "locales")

class CameraType:
    WEBCAM = "webcam"
    DEPTH_KINECT = "depth_kinect"
    DEPTH_ORBBEC = "depth_orbbec"
    MOBILE = "mobile"

    @classmethod
    def choices(cls):
        return [cls.WEBCAM, cls.DEPTH_KINECT, cls.DEPTH_ORBBEC, cls.MOBILE]

    @classmethod
    def label(cls, t: str) -> str:
        return {
            cls.WEBCAM: "一般 Webcam",
            cls.DEPTH_KINECT: "Kinect v2 深度鏡頭",
            cls.DEPTH_ORBBEC: "Orbbec 深度鏡頭",
            cls.MOBILE: "手機鏡頭 (IP Webcam)",
        }.get(t, t)


class GaitAxis:
    SIDE = "side"
    FRONT = "front"

    @classmethod
    def choices(cls):
        return [cls.SIDE, cls.FRONT]


class Config:
    APP_NAME = "healthIR"
    APP_VERSION = "2.0.0"
    DEFAULT_FPS = 30
    DEFAULT_CAMERA_ID = 0
    DEFAULT_CAMERA_TYPE = CameraType.WEBCAM
    CAMERA_WIDTH = 640
    CAMERA_HEIGHT = 480
    MAX_RECORD_SECONDS = 30
    CALIBRATION_HEIGHT_CM = 170
    DEFAULT_GAIT_AXIS = GaitAxis.SIDE

    LINE_CHANNEL_ID = ""
    LINE_CHANNEL_SECRET = ""
    LINE_REDIRECT_URI = ""

    FIREBASE_PROJECT_ID = ""
    FIREBASE_CRED_PATH = ""
    FIREBASE_API_KEY = ""
    FIREBASE_FUNCTION_URL = ""

    @classmethod
    def load_from_env(cls, env_path: str = ""):
        path = env_path or os.path.join(_get_base_dir(), ".env")
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip("\"'")
                if key == "LINE_CHANNEL_ID":
                    cls.LINE_CHANNEL_ID = val
                elif key == "LINE_CHANNEL_SECRET":
                    cls.LINE_CHANNEL_SECRET = val
                elif key == "LINE_REDIRECT_URI":
                    cls.LINE_REDIRECT_URI = val
                elif key == "FIREBASE_PROJECT_ID":
                    cls.FIREBASE_PROJECT_ID = val
                elif key == "FIREBASE_CRED_PATH":
                    cls.FIREBASE_CRED_PATH = val
                elif key == "FIREBASE_API_KEY":
                    cls.FIREBASE_API_KEY = val
                elif key == "FIREBASE_FUNCTION_URL":
                    cls.FIREBASE_FUNCTION_URL = val

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
