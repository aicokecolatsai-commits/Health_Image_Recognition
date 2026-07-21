import cv2
import numpy as np
from camera.camera_interface import CameraInterface


class WebcamProvider(CameraInterface):
    def __init__(self, camera_id: int = 0):
        self._camera_id = camera_id
        self._cap: cv2.VideoCapture | None = None
        self._fps = 30
        self._width = 640
        self._height = 480

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self._camera_id)
        if not self._cap.isOpened():
            self._cap = None
            return False
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._height)
        self._fps = self._cap.get(cv2.CAP_PROP_FPS) or 30
        self._width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        return True

    def close(self):
        if self._cap:
            self._cap.release()
            self._cap = None

    def read_frame(self) -> np.ndarray | None:
        if self._cap is None:
            return None
        ret, frame = self._cap.read()
        return frame if ret else None

    def camera_info(self) -> dict:
        return {
            "type": self.camera_type(),
            "fps": self._fps,
            "width": self._width,
            "height": self._height,
            "device_id": self._camera_id,
        }

    @staticmethod
    def camera_type() -> str:
        return "webcam"

    def is_opened(self) -> bool:
        return self._cap is not None and self._cap.isOpened()