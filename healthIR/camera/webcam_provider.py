import cv2
import numpy as np
from camera.camera_interface import CameraInterface


class WebcamProvider(CameraInterface):
    def __init__(self, camera_id: int = 0, width: int = 640, height: int = 480):
        self._camera_id = camera_id
        self._width = width
        self._height = height
        self._cap: cv2.VideoCapture | None = None

    def open(self) -> bool:
        self._cap = cv2.VideoCapture(self._camera_id)
        if not self._cap.isOpened():
            self._cap = None
            return False
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._height)
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
        if self._cap:
            w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = self._cap.get(cv2.CAP_PROP_FPS) or 30
        else:
            w, h, fps = self._width, self._height, 30
        return {
            "type": self.camera_type(),
            "fps": fps,
            "width": w,
            "height": h,
            "device_id": self._camera_id,
        }

    @staticmethod
    def camera_type() -> str:
        return "webcam"

    def is_opened(self) -> bool:
        return self._cap is not None and self._cap.isOpened()
