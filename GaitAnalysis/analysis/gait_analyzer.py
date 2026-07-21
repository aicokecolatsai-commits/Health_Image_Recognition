from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List


@dataclass
class GaitLength:
    cadence: float = 0.0
    speed: float = 0.0
    stride_length: float = 0.0
    step_length: float = 0.0
    right_step_length: float = 0.0
    left_step_length: float = 0.0
    step_length_asymmetry: float = 0.0
    step_length_variability: float = 0.0


@dataclass
class GaitSupport:
    double_support: float = 0.0
    single_support: float = 0.0
    left_single_support: float = 0.0
    right_single_support: float = 0.0
    single_support_asymmetry: float = 0.0
    pre_swing: float = 0.0
    loading_response: float = 0.0


@dataclass
class GROM:
    max_angle: float = 0.0
    min_angle: float = 0.0
    mean_angle: float = 0.0
    rom: float = 0.0


@dataclass
class GaitTimes:
    stance_time: float = 0.0
    swing_time: float = 0.0
    cycle_time: float = 0.0


@dataclass
class GaitRisk:
    falling: float = 0.0
    function_loss: float = 0.0
    disability: float = 0.0


@dataclass
class GaitResult:
    valid: bool = False
    spatial: GaitLength = field(default_factory=GaitLength)
    temporal: GaitTimes = field(default_factory=GaitTimes)
    support: GaitSupport = field(default_factory=GaitSupport)
    left_knee: GROM = field(default_factory=GROM)
    right_knee: GROM = field(default_factory=GROM)
    left_hip: GROM = field(default_factory=GROM)
    right_hip: GROM = field(default_factory=GROM)
    risk: GaitRisk = field(default_factory=GaitRisk)
    num_cycles: int = 0
    total_duration: float = 0.0

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "spatial": {
                "cadence": round(self.spatial.cadence, 2),
                "speed": round(self.spatial.speed, 3),
                "stride_length": round(self.spatial.stride_length, 1),
                "step_length": round(self.spatial.step_length, 1),
                "right_step_length": round(self.spatial.right_step_length, 1),
                "left_step_length": round(self.spatial.left_step_length, 1),
                "step_length_asymmetry": round(self.spatial.step_length_asymmetry, 1),
                "step_length_variability": round(self.spatial.step_length_variability, 1),
            },
            "temporal": {
                "stance_time": round(self.temporal.stance_time, 3),
                "swing_time": round(self.temporal.swing_time, 3),
                "cycle_time": round(self.temporal.cycle_time, 3),
            },
            "support": {
                "double_support": round(self.support.double_support, 1),
                "single_support": round(self.support.single_support, 1),
                "left_single_support": round(self.support.left_single_support, 1),
                "right_single_support": round(self.support.right_single_support, 1),
                "single_support_asymmetry": round(self.support.single_support_asymmetry, 1),
                "pre_swing": round(self.support.pre_swing, 1),
                "loading_response": round(self.support.loading_response, 1),
            },
            "joint": {
                "left_knee": {"max": round(self.left_knee.max_angle, 1), "min": round(self.left_knee.min_angle, 1), "mean": round(self.left_knee.mean_angle, 1), "rom": round(self.left_knee.rom, 1)},
                "right_knee": {"max": round(self.right_knee.max_angle, 1), "min": round(self.right_knee.min_angle, 1), "mean": round(self.right_knee.mean_angle, 1), "rom": round(self.right_knee.rom, 1)},
                "left_hip": {"max": round(self.left_hip.max_angle, 1), "min": round(self.left_hip.min_angle, 1), "mean": round(self.left_hip.mean_angle, 1), "rom": round(self.left_hip.rom, 1)},
                "right_hip": {"max": round(self.right_hip.max_angle, 1), "min": round(self.right_hip.min_angle, 1), "mean": round(self.right_hip.mean_angle, 1), "rom": round(self.right_hip.rom, 1)},
            },
            "risk": {
                "falling": round(self.risk.falling, 2),
                "function_loss": round(self.risk.function_loss, 2),
                "disability": round(self.risk.disability, 2),
            },
            "num_cycles": self.num_cycles,
            "total_duration": round(self.total_duration, 2),
        }


class GaitAnalyzerBase(ABC):
    @abstractmethod
    def feed_skeleton(self, skeleton) -> None:
        ...

    @abstractmethod
    def analyze(self) -> GaitResult:
        ...

    @abstractmethod
    def reset(self):
        ...

    @abstractmethod
    def buffer_size(self) -> int:
        ...