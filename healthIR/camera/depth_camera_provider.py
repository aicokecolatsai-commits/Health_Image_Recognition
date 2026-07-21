import numpy as np
from camera.camera_interface import CameraInterface


class DepthCameraProvider(CameraInterface):
    def __init__(self, camera_id: int = 0):
        self._camera_id = camera_id
        self._opened = False

    def open(self) -> bool:
        return False

    def close(self):
        self._opened = False

    def read_frame(self) -> np.ndarray | None:
        return None

    def read_depth_frame(self) -> np.ndarray | None:
        return None

    def get_3d_joint(self, joint_index: int) -> tuple | None:
        return None

    def camera_info(self) -> dict:
        return {
            "type": self.camera_type(),
            "fps": 30,
            "width": 640,
            "height": 480,
            "device_id": self._camera_id,
        }

    @staticmethod
    def camera_type() -> str:
        return "depth"

    def is_opened(self) -> bool:
        return self._opened

    def has_depth(self) -> bool:
        return True


class KinectV2Provider(DepthCameraProvider):
    def open(self) -> bool:
        try:
            import pykinect2
            return True
        except ImportError:
            return False

    @staticmethod
    def camera_type() -> str:
        return "depth_kinect"

    def camera_info(self) -> dict:
        info = super().camera_info()
        info["note"] = "Kinect v2 — 25 joints, 30fps, 1080p RGB + 512x424 Depth"
        return info


class OrbbecProvider(DepthCameraProvider):
    def open(self) -> bool:
        try:
            import openni
            return True
        except ImportError:
            return False

    @staticmethod
    def camera_type() -> str:
        return "depth_orbbec"

    def camera_info(self) -> dict:
        info = super().camera_info()
        info["note"] = "Orbbec Astra — OpenNI2 middleware"
        return info
