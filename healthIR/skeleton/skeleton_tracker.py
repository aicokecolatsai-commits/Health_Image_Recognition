import time

import cv2
import mediapipe as mp
import numpy as np

from skeleton.skeleton_data import SkeletonData, Landmark


class SkeletonTracker:
    def __init__(self, min_detection_confidence: float = 0.5, min_tracking_confidence: float = 0.5):
        self._pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

    def process(self, frame: np.ndarray, timestamp: float | None = None) -> SkeletonData | None:
        if timestamp is None:
            timestamp = time.time()
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self._pose.process(rgb)
        if result.pose_landmarks is None:
            return None
        landmarks = {}
        for idx, lm in enumerate(result.pose_landmarks.landmark):
            landmarks[idx] = Landmark(
                x=lm.x,
                y=lm.y,
                z=lm.z,
                visibility=lm.visibility,
            )
        return SkeletonData(
            landmarks=landmarks,
            timestamp=timestamp,
            frame_width=w,
            frame_height=h,
        )

    def draw_landmarks(self, frame: np.ndarray, skeleton: SkeletonData) -> np.ndarray:
        h, w = frame.shape[:2]
        for joint_id, lm in skeleton.landmarks.items():
            if lm.visibility < 0.3:
                continue
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(frame, (cx, cy), 3, (0, 255, 0), -1)
        connections = mp.solutions.pose.POSE_CONNECTIONS
        for a, b in connections:
            la = skeleton.landmarks.get(a)
            lb = skeleton.landmarks.get(b)
            if la is None or lb is None:
                continue
            if la.visibility < 0.3 or lb.visibility < 0.3:
                continue
            x1, y1 = int(la.x * w), int(la.y * h)
            x2, y2 = int(lb.x * w), int(lb.y * h)
            cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        return frame

    def close(self):
        self._pose.close()