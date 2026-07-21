from dataclasses import dataclass, field
from typing import Dict


# MediaPipe Pose 關鍵 landmark 索引
class MPJoint:
    NOSE = 0
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


@dataclass
class Landmark:
    x: float
    y: float
    z: float
    visibility: float = 1.0

    def to_dict(self) -> dict:
        return {
            "x": round(self.x, 6),
            "y": round(self.y, 6),
            "z": round(self.z, 6),
            "visibility": round(self.visibility, 6),
        }


@dataclass
class SkeletonData:
    landmarks: Dict[int, Landmark]
    timestamp: float
    frame_width: int = 0
    frame_height: int = 0

    def get_landmark(self, joint_id: int) -> Landmark | None:
        return self.landmarks.get(joint_id)

    def pixel_coord(self, joint_id: int) -> tuple[float, float] | None:
        lm = self.get_landmark(joint_id)
        if lm is None:
            return None
        return (lm.x * self.frame_width, lm.y * self.frame_height)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "landmarks": {str(k): v.to_dict() for k, v in self.landmarks.items()},
        }

    @staticmethod
    def from_dict(data: dict):
        landmarks = {
            int(k): Landmark(**v) for k, v in data.get("landmarks", {}).items()
        }
        return SkeletonData(
            landmarks=landmarks,
            timestamp=data.get("timestamp", 0.0),
        )