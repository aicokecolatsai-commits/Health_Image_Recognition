import numpy as np
from typing import List, Tuple
from dataclasses import dataclass, field

from analysis.gait_analyzer import (
    GaitAnalyzerBase, GaitResult, GaitLength,
    GaitTimes, GaitSupport, GROM, GaitRisk,
)
from analysis.math_utils import (
    find_peaks, joint_angle,
    coefficient_variation,
)
from analysis.risk_calculator import RiskCalculator
from skeleton.skeleton_data import SkeletonData, MPJoint


@dataclass
class _GaitCycle:
    left_heel_strike: float = 0.0
    right_heel_strike: float = 0.0
    left_toe_off: float = 0.0
    right_toe_off: float = 0.0
    start_time: float = 0.0
    end_time: float = 0.0


class SimpleGaitAnalyzer(GaitAnalyzerBase):
    def __init__(self, height_cm: float = 170.0, fps: float = 30.0):
        self._height_cm = height_cm
        self._fps = fps
        self._skeletons: List[SkeletonData] = []
        self._result: GaitResult | None = None

    def feed_skeleton(self, skeleton) -> None:
        self._skeletons.append(skeleton)

    def reset(self):
        self._skeletons.clear()
        self._result = None

    def buffer_size(self) -> int:
        return len(self._skeletons)

    def analyze(self) -> GaitResult:
        if len(self._skeletons) < 10:
            return GaitResult(valid=False)

        result = GaitResult(valid=True)
        result.total_duration = self._skeletons[-1].timestamp - self._skeletons[0].timestamp
        result.total_duration = max(result.total_duration, 0.1)

        left_ankle_y = self._extract_joint_series(MPJoint.LEFT_ANKLE, "y")
        right_ankle_y = self._extract_joint_series(MPJoint.RIGHT_ANKLE, "y")
        left_ankle_x = self._extract_joint_series(MPJoint.LEFT_ANKLE, "x")
        right_ankle_x = self._extract_joint_series(MPJoint.RIGHT_ANKLE, "x")

        hip_mid_x = self._extract_hip_mid_x()
        times = self._extract_times()

        if len(left_ankle_y) < 10 or len(right_ankle_y) < 10:
            return GaitResult(valid=False)

        left_signal = np.array(left_ankle_y)
        right_signal = np.array(right_ankle_y)

        left_peaks_idx = find_peaks(left_signal, min_distance=5)
        right_peaks_idx = find_peaks(right_signal, min_distance=5)

        pixel_per_cm = self._estimate_scale()

        cycles = self._build_cycles(left_peaks_idx, right_peaks_idx, hip_mid_x, times, pixel_per_cm)

        if len(cycles) < 2:
            return GaitResult(valid=False)

        result.num_cycles = len(cycles)

        self._calc_spatial(cycles, result, pixel_per_cm)
        self._calc_temporal(cycles, result)
        self._calc_support(cycles, result)
        self._calc_joint_angles(result)
        self._calc_risk(result)

        self._result = result
        return result

    def _extract_joint_series(self, joint_id: int, coord: str) -> List[float]:
        values = []
        for sk in self._skeletons:
            lm = sk.get_landmark(joint_id)
            if lm is not None and lm.visibility > 0.3:
                values.append(getattr(lm, coord))
            else:
                values.append(values[-1] if values else 0.0)
        return values

    def _extract_times(self) -> List[float]:
        return [sk.timestamp for sk in self._skeletons]

    def _extract_hip_mid_x(self) -> List[float]:
        values = []
        for sk in self._skeletons:
            lh = sk.get_landmark(MPJoint.LEFT_HIP)
            rh = sk.get_landmark(MPJoint.RIGHT_HIP)
            if lh and rh and lh.visibility > 0.3 and rh.visibility > 0.3:
                values.append((lh.x + rh.x) / 2.0)
            else:
                values.append(values[-1] if values else 0.5)
        return values

    def _estimate_scale(self) -> float:
        heights = []
        for sk in self._skeletons:
            nose = sk.get_landmark(MPJoint.NOSE)
            lf = sk.get_landmark(MPJoint.LEFT_FOOT_INDEX)
            rf = sk.get_landmark(MPJoint.RIGHT_FOOT_INDEX)
            if nose and lf and nose.visibility > 0.5 and lf.visibility > 0.3:
                pixel_h = abs(nose.y - lf.y) * sk.frame_height
                heights.append(pixel_h)
            elif nose and rf and nose.visibility > 0.5 and rf.visibility > 0.3:
                pixel_h = abs(nose.y - rf.y) * sk.frame_height
                heights.append(pixel_h)
        if not heights:
            return 1.0
        avg_pixel_h = np.mean(heights)
        if avg_pixel_h < 1:
            return 1.0
        return avg_pixel_h / self._height_cm

    def _build_cycles(
        self, left_peaks: List[int], right_peaks: List[int],
        hip_mid_x: List[float], times: List[float],
        scale: float,
    ) -> List[_GaitCycle]:
        all_events = []
        for idx in left_peaks:
            if idx < len(times):
                all_events.append((times[idx], "L", idx))
        for idx in right_peaks:
            if idx < len(times):
                all_events.append((times[idx], "R", idx))
        all_events.sort(key=lambda x: x[0])

        cycles = []
        for i in range(len(all_events) - 1):
            ev = all_events[i]
            ev_next = all_events[i + 1]
            if ev[1] != ev_next[1]:
                cycle = _GaitCycle()
                cycle.start_time = ev[0]
                cycle.end_time = ev_next[0]
                if ev[1] == "L":
                    cycle.left_heel_strike = ev[0]
                    cycle.right_heel_strike = ev_next[0]
                else:
                    cycle.right_heel_strike = ev[0]
                    cycle.left_heel_strike = ev_next[0]
                cycles.append(cycle)
        return cycles

    def _calc_spatial(self, cycles: List[_GaitCycle], result: GaitResult, scale: float):
        left_steps = []
        right_steps = []

        for cycle in cycles:
            duration = cycle.end_time - cycle.start_time
            if duration <= 0:
                continue
            stride_m = 0.5 * self._height_cm / 100.0
            cycle_speed = stride_m / duration if duration > 0 else 0
            if cycle.left_heel_strike > 0 and cycle.right_heel_strike > 0:
                left_steps.append(stride_m * 0.5)
                right_steps.append(stride_m * 0.5)

        all_steps = left_steps + right_steps
        if not all_steps:
            return

        s = result.spatial
        s.step_length = float(np.mean(all_steps)) * 100
        s.left_step_length = float(np.mean(left_steps)) * 100 if left_steps else 0
        s.right_step_length = float(np.mean(right_steps)) * 100 if right_steps else 0
        s.stride_length = s.step_length * 2.0
        s.cadence = 60.0 / float(np.mean([c.end_time - c.start_time for c in cycles])) if cycles else 0

        total_dur = result.total_duration
        if total_dur > 0:
            total_steps = len(cycles) * 2
            s.speed = (total_steps * s.step_length / 100.0) / total_dur

        if left_steps and right_steps:
            l_mean = float(np.mean(left_steps))
            r_mean = float(np.mean(right_steps))
            avg = (l_mean + r_mean) / 2.0
            if avg > 0:
                s.step_length_asymmetry = abs(l_mean - r_mean) / avg * 100.0

        if len(all_steps) >= 3:
            s.step_length_variability = coefficient_variation(all_steps)

    def _calc_temporal(self, cycles: List[_GaitCycle], result: GaitResult):
        durations = [c.end_time - c.start_time for c in cycles if c.end_time > c.start_time]
        if not durations:
            return
        avg_cycle = float(np.mean(durations))
        result.temporal.cycle_time = avg_cycle
        result.temporal.stance_time = avg_cycle * 0.6
        result.temporal.swing_time = avg_cycle * 0.4

    def _calc_support(self, cycles: List[_GaitCycle], result: GaitResult):
        if not cycles:
            return
        sup = result.support
        sup.double_support = 20.0
        sup.single_support = 40.0
        sup.left_single_support = 40.0
        sup.right_single_support = 40.0
        sup.pre_swing = 10.0
        sup.loading_response = 10.0

    def _calc_joint_angles(self, result: GaitResult):
        left_knee_angles = []
        right_knee_angles = []
        left_hip_angles = []
        right_hip_angles = []

        for sk in self._skeletons:
            lh = sk.get_landmark(MPJoint.LEFT_HIP)
            lk = sk.get_landmark(MPJoint.LEFT_KNEE)
            la = sk.get_landmark(MPJoint.LEFT_ANKLE)
            rh = sk.get_landmark(MPJoint.RIGHT_HIP)
            rk = sk.get_landmark(MPJoint.RIGHT_KNEE)
            ra = sk.get_landmark(MPJoint.RIGHT_ANKLE)
            ls = sk.get_landmark(MPJoint.LEFT_SHOULDER)
            rs = sk.get_landmark(MPJoint.RIGHT_SHOULDER)

            if lh and lk and la and all(x.visibility > 0.3 for x in (lh, lk, la)):
                a = np.array([lh.x, lh.y, lh.z])
                b = np.array([lk.x, lk.y, lk.z])
                c = np.array([la.x, la.y, la.z])
                left_knee_angles.append(joint_angle(a, b, c))

            if rh and rk and ra and all(x.visibility > 0.3 for x in (rh, rk, ra)):
                a = np.array([rh.x, rh.y, rh.z])
                b = np.array([rk.x, rk.y, rk.z])
                c = np.array([ra.x, ra.y, ra.z])
                right_knee_angles.append(joint_angle(a, b, c))

            if ls and lh and lk and all(x.visibility > 0.3 for x in (ls, lh, lk)):
                a = np.array([ls.x, ls.y, ls.z])
                b = np.array([lh.x, lh.y, lh.z])
                c = np.array([lk.x, lk.y, lk.z])
                left_hip_angles.append(joint_angle(a, b, c))

            if rs and rh and rk and all(x.visibility > 0.3 for x in (rs, rh, rk)):
                a = np.array([rs.x, rs.y, rs.z])
                b = np.array([rh.x, rh.y, rh.z])
                c = np.array([rk.x, rk.y, rk.z])
                right_hip_angles.append(joint_angle(a, b, c))

        def _make_grom(angles: List[float]) -> GROM:
            if not angles:
                return GROM()
            g = GROM()
            g.max_angle = float(np.max(angles))
            g.min_angle = float(np.min(angles))
            g.mean_angle = float(np.mean(angles))
            g.rom = g.max_angle - g.min_angle
            return g

        result.left_knee = _make_grom(left_knee_angles)
        result.right_knee = _make_grom(right_knee_angles)
        result.left_hip = _make_grom(left_hip_angles)
        result.right_hip = _make_grom(right_hip_angles)

    def _calc_risk(self, result: GaitResult):
        stride_m = result.spatial.stride_length / 100.0
        height_m = self._height_cm / 100.0
        result.risk = RiskCalculator.calculate_all(stride_m, height_m)