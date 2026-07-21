import threading
import time
import numpy as np

from camera.camera_interface import CameraInterface
from camera.webcam_provider import WebcamProvider
from camera.depth_camera_stub import DepthCameraStub
from skeleton.skeleton_tracker import SkeletonTracker
from skeleton.skeleton_data import SkeletonData
from analysis.simple_analyzer import SimpleGaitAnalyzer
from analysis.gait_analyzer import GaitResult
from app.state_machine import StateMachine, AppState
from app.data_manager import DataManager


class AppController:
    def __init__(self):
        self.state_machine = StateMachine()
        self.data_manager = DataManager()
        self._camera: CameraInterface | None = None
        self._tracker: SkeletonTracker | None = None
        self._analyzer: SimpleGaitAnalyzer | None = None
        self._running = False
        self._recording = False
        self._frame_callback = None
        self._skeleton_callback = None
        self._result_callback = None
        self._thread: threading.Thread | None = None
        self._camera_module = "webcam"
        self._height_cm = 170.0
        self._last_result: GaitResult | None = None

    @property
    def camera_module(self) -> str:
        return self._camera_module

    @camera_module.setter
    def camera_module(self, value: str):
        self._camera_module = value

    @property
    def height_cm(self) -> float:
        return self._height_cm

    @height_cm.setter
    def height_cm(self, value: float):
        self._height_cm = value
        if self._analyzer:
            self._analyzer._height_cm = value

    @property
    def last_result(self) -> GaitResult | None:
        return self._last_result

    def set_frame_callback(self, cb):
        self._frame_callback = cb

    def set_skeleton_callback(self, cb):
        self._skeleton_callback = cb

    def set_result_callback(self, cb):
        self._result_callback = cb

    def start_camera(self) -> bool:
        if self._camera_module == "webcam":
            self._camera = WebcamProvider()
        else:
            self._camera = DepthCameraStub()
        if not self._camera.open():
            self._camera = None
            return False
        self._tracker = SkeletonTracker()
        self._analyzer = SimpleGaitAnalyzer(height_cm=self._height_cm)
        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        self.state_machine.transition(AppState.CAMERA_READY)
        return True

    def stop_camera(self):
        self._running = False
        self._recording = False
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        if self._camera:
            self._camera.close()
            self._camera = None
        if self._tracker:
            self._tracker.close()
            self._tracker = None
        self.state_machine.transition(AppState.IDLE)

    def start_recording(self):
        if self._state() != AppState.CAMERA_READY:
            return
        self._analyzer.reset()
        self._recording = True
        self.state_machine.transition(AppState.RECORDING)

    def stop_recording(self):
        if not self._recording:
            return
        self._recording = False
        self.state_machine.transition(AppState.ANALYZING)
        result = self._analyzer.analyze()
        self._last_result = result
        if result.valid:
            self.data_manager.save_result(result)
            self.state_machine.transition(AppState.RESULT)
        else:
            self.state_machine.transition(AppState.CAMERA_READY)
        if self._result_callback:
            self._result_callback(result)

    def _state(self) -> AppState:
        return self.state_machine.state

    def _capture_loop(self):
        while self._running:
            frame = self._camera.read_frame()
            if frame is None:
                time.sleep(0.01)
                continue
            skeleton = self._tracker.process(frame)
            if skeleton and self._recording:
                self._analyzer.feed_skeleton(skeleton)
            if skeleton and self._skeleton_callback:
                self._skeleton_callback(skeleton)
            if self._frame_callback:
                display = frame
                if skeleton:
                    display = self._tracker.draw_landmarks(frame.copy(), skeleton)
                self._frame_callback(display)
            time.sleep(0.01)