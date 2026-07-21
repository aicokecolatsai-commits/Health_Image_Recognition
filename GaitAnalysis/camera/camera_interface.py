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