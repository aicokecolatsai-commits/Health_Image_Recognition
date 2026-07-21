import numpy as np
from camera.camera_interface import CameraInterface


class DepthCameraStub(CameraInterface):
    def open(self) -> bool:
        return False

    def close(self):
        pass

    def read_frame(self) -> np.ndarray | None:
        return None

    def camera_info(self) -> dict:
        return {
            "type": self.camera_type(),
            "fps": 0,
            "width": 0,
            "height": 0,
            "note": "深度鏡頭模組尚未實作，預計支援 Kinect / Orbbec / Nuitrack",
        }

    @staticmethod
    def camera_type() -> str:
        return "depth"

    def is_opened(self) -> bool:
        return False