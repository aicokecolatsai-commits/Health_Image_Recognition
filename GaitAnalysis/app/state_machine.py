from enum import Enum, auto


class AppState(Enum):
    IDLE = auto()
    CAMERA_READY = auto()
    RECORDING = auto()
    ANALYZING = auto()
    RESULT = auto()
    ERROR = auto()


class StateMachine:
    def __init__(self):
        self._state = AppState.IDLE
        self._listeners = []

    @property
    def state(self) -> AppState:
        return self._state

    def add_listener(self, callback):
        self._listeners.append(callback)

    def _notify(self, old_state: AppState, new_state: AppState):
        for cb in self._listeners:
            cb(old_state, new_state)

    def can_transition(self, target: AppState) -> bool:
        transitions = {
            AppState.IDLE: [AppState.CAMERA_READY],
            AppState.CAMERA_READY: [AppState.IDLE, AppState.RECORDING],
            AppState.RECORDING: [AppState.CAMERA_READY, AppState.ANALYZING, AppState.IDLE],
            AppState.ANALYZING: [AppState.RESULT, AppState.CAMERA_READY, AppState.IDLE],
            AppState.RESULT: [AppState.IDLE, AppState.CAMERA_READY, AppState.RECORDING],
            AppState.ERROR: [AppState.IDLE, AppState.CAMERA_READY],
        }
        return target in transitions.get(self._state, [])

    def transition(self, target: AppState) -> bool:
        if not self.can_transition(target):
            return False
        old = self._state
        self._state = target
        self._notify(old, target)
        return True