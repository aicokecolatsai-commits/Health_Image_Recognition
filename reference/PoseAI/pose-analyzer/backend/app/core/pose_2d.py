import logging
from pathlib import Path

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# MediaPipe Pose landmark indices
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
]

# Skeleton connections for visualization
SKELETON_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10), (11, 12),
    (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (27, 29), (29, 31),
    (24, 26), (26, 28), (28, 30), (30, 32),
]


class PoseDetector2D:
    """MediaPipe Pose Landmarker wrapper with GPU/CPU toggle."""

    def __init__(self):
        self._model = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load_model(self):
        if self._model is not None:
            return

        compute_mode = self._resolve_compute_mode()
        logger.info("Loading MediaPipe Pose model (delegate=%s)...", compute_mode)

        try:
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions
        except ImportError:
            raise ImportError("mediapipe not installed. Run: pip install mediapipe")

        model_path = self._ensure_model_downloaded()
        delegate = self._map_delegate(compute_mode)

        options = PoseLandmarkerOptions(
            base_options=python.BaseOptions(
                model_asset_path=str(model_path),
                delegate=delegate,
            ),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        self._model = PoseLandmarker.create_from_options(options)
        logger.info("MediaPipe Pose model loaded (%s delegate)", compute_mode)

    def _resolve_compute_mode(self) -> str:
        mode = settings.compute_mode
        if mode == "auto":
            return self._detect_best_delegate()
        return mode

    def _map_delegate(self, mode: str):
        from mediapipe.tasks.python.core.base_options import BaseOptions
        if mode == "gpu":
            return BaseOptions.Delegate.GPU
        return BaseOptions.Delegate.CPU

    def _detect_best_delegate(self) -> str:
        try:
            import torch
            if torch.cuda.is_available():
                return "gpu"
        except ImportError:
            pass
        return "cpu"

    def _ensure_model_downloaded(self) -> Path:
        model_dir = Path(settings.data_dir) / "models"
        model_dir.mkdir(parents=True, exist_ok=True)
        model_path = model_dir / "pose_landmarker_lite.task"

        if not model_path.exists():
            import urllib.request
            url = (
                "https://storage.googleapis.com/mediapipe-models/"
                "pose_landmarker/pose_landmarker_lite/float16/latest/"
                "pose_landmarker_lite.task"
            )
            logger.info("Downloading MediaPipe model from %s ...", url)
            urllib.request.urlretrieve(url, str(model_path))
            logger.info("Model downloaded to %s", model_path)

        return model_path

    def process_video(self, video_path: str, progress_callback=None) -> list[dict]:
        """Process a video file and return 2D landmarks per frame.

        Args:
            video_path: Path to video file.
            progress_callback: Optional fn(frame_idx, total_frames) called after each frame.

        Returns:
            List of dicts: [{frame_idx, timestamp_sec, keypoints: [{id, x, y, visibility}]}]
        """
        if not self._model:
            self.load_model()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info("Processing video: %s (%d frames, %dx%d, %.2f fps)",
                     video_path, total_frames, width, height, fps)

        import mediapipe as mp

        results = []
        frame_idx = 0
        timestamp_ms = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            try:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
                detection = self._model.detect_for_video(mp_image, timestamp_ms)

                keypoints = []
                if detection.pose_landmarks:
                    for kid, lm in enumerate(detection.pose_landmarks[0]):
                        keypoints.append({
                            "id": kid,
                            "x": float(lm.x),
                            "y": float(lm.y),
                            "visibility": float(lm.visibility),
                        })

                results.append({
                    "frame_idx": frame_idx,
                    "timestamp_sec": round(timestamp_ms / 1000, 3),
                    "keypoints": keypoints,
                })

            except Exception as e:
                logger.warning("Frame %d detection error: %s", frame_idx, e)

            frame_idx += 1
            timestamp_ms = int(frame_idx * (1000.0 / fps)) if fps > 0 else 0

            if progress_callback:
                progress_callback(frame_idx, total_frames)

        cap.release()
        logger.info("Processed %d / %d frames", len(results), total_frames)
        return results

    def unload(self):
        if self._model:
            del self._model
            self._model = None
