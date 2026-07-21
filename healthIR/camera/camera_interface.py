from abc import ABC, abstractmethod
import numpy as np


class CameraInterface(ABC):
    @abstractmethod
    def open(self) -> bool:
        ...

    @abstractmethod
    def close(self):
        ...

    @abstractmethod
    def read_frame(self) -> np.ndarray | None:
        ...

    def read_depth_frame(self) -> np.ndarray | None:
        return None

    def get_3d_joint(self, joint_index: int) -> tuple | None:
        return None

    @abstractmethod
    def camera_info(self) -> dict:
        ...

    @staticmethod
    @abstractmethod
    def camera_type() -> str:
        ...

    @abstractmethod
    def is_opened(self) -> bool:
        ...

    def has_depth(self) -> bool:
        return False
