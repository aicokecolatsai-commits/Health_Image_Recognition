import numpy as np
from typing import List, Tuple
from dataclasses import dataclass, field

from analysis.gait_analyzer import (
    GaitAnalyzerBase, GaitResult, GaitLength,
    GaitTimes, GaitSupport, GROM, GaitRisk,
)
from analysis.math_utils import (
    find_peak_savitzky, cal_waterfall, joint_angle,
    coefficient_variation, standard_deviation,
    savgol_filter,
)
from analysis.risk_calculator import RiskCalculator
from skeleton.skeleton_data import SkeletonData, MPJoint


@dataclass
class _GaitCycle:
    left_hs: float = 0.0
    right_hs: float = 0.0
    left_to: float = 0.0
    right_to: float = 0.0
    left_hs_idx: int = -1
    right_hs_idx: int = -1
    left_to_idx: int = -1
    right_to_idx: int = -1
    start_time: float = 0.0
    end_time: float = 0.0


@dataclass
class _GaitEvents:
    left_hs: List[int] = field(default_factory=list)
    right_hs: List[int] = field(default_factory=list)
    left_to: List[int] = field(default_factory=list)
    right_to: List[int] = field(default_factory=list)


class SimpleGaitAnalyzer(GaitAnalyzerBase):
    def __init__(self, height_cm: float = 170.0, fps: float = 30.0, gait_axis: str = "side"):
        self._height_cm = height_cm
        self._fps = fps
        self._gait_axis = gait_axis
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
        if len(self._skeletons) < 30:
            return GaitResult(valid=False)

        result = GaitResult(valid=True)
        times = self._extract_times()
        result.total_duration = times[-1] - times[0]
        result.total_duration = max(result.total_duration, 0.1)

        left_ap = self._extract_ap_series(MPJoint.LEFT_ANKLE)
        right_ap = self._extract_ap_series(MPJoint.RIGHT_ANKLE)
        left_ankle_y = self._extract_joint_series(MPJoint.LEFT_ANKLE, "y")
        right_ankle_y = self._extract_joint_series(MPJoint.RIGHT_ANKLE, "y")

        if len(left_ap) < 30 or len(right_ap) < 30:
            return GaitResult(valid=False)

        events = self._detect_events(left_ap, right_ap)
        if len(events.left_hs) < 3 or len(events.right_hs) < 3:
            return GaitResult(valid=False)

        cycles = self._build_cycles(events, times)
        if len(cycles) < 2:
            return GaitResult(valid=False)

        result.num_cycles = len(cycles)
        pixel_per_cm = self._estimate_scale()

        self._calc_spatial(cycles, result, pixel_per_cm)
        self._calc_temporal(cycles, result)
        self._calc_support(cycles, result)
        self._calc_joint_angles(result)
        self._calc_risk(result)

        self._result = result
        return result

    def _ap_coord(self) -> str:
        return "x" if self._gait_axis == "side" else "z"

    def _extract_ap_series(self, joint_id: int) -> np.ndarray:
        coord = self._ap_coord()
        return np.array(self._extract_joint_series(joint_id, coord), dtype=np.float64)

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

    def _detect_events(self, left_ap: np.ndarray, right_ap: np.ndarray) -> _GaitEvents:
        window = max(11, len(left_ap) // 20)
        if window % 2 == 0:
            window += 1
        left_hs, left_to, _ = find_peak_savitzky(
            left_ap, peak_width=window, peak_poly_d=3, slope_sensitivity=0.03
        )
        right_hs, right_to, _ = find_peak_savitzky(
            right_ap, peak_width=window, peak_poly_d=3, slope_sensitivity=0.03
        )
        left_hs, right_hs = cal_waterfall(
            np.array(left_hs, dtype=int), np.array(right_hs, dtype=int)
        )
        events = _GaitEvents()
        events.left_hs = left_hs
        events.right_hs = right_hs
        events.left_to = left_to
        events.right_to = right_to
        return events

    def _build_cycles(self, events: _GaitEvents, times: List[float]) -> List[_GaitCycle]:
        all_hs = []
        for idx in events.left_hs:
            if idx < len(times):
                all_hs.append((times[idx], "L", idx))
        for idx in events.right_hs:
            if idx < len(times):
                all_hs.append((times[idx], "R", idx))
        all_hs.sort(key=lambda x: x[0])

        def _find_to_between(hs_time: float, next_hs_time: float, to_list: List[int], times_arr: List[float]) -> float:
            candidates = []
            for ti in to_list:
                if ti < len(times_arr) and hs_time <= times_arr[ti] <= next_hs_time:
                    candidates.append((times_arr[ti], ti))
            if candidates:
                candidates.sort(key=lambda x: x[0])
                return candidates[0][0], candidates[0][1]
            mid = (hs_time + next_hs_time) / 2.0
            return mid, -1

        cycles = []
        for i in range(len(all_hs) - 1):
            ev = all_hs[i]
            ev_next = all_hs[i + 1]
            if ev[1] == ev_next[1]:
                continue
            cycle = _GaitCycle()
            cycle.start_time = ev[0]
            cycle.end_time = ev_next[0]
            if ev[1] == "L":
                cycle.left_hs = ev[0]
                cycle.left_hs_idx = ev[2]
                cycle.right_hs = ev_next[0]
                cycle.right_hs_idx = ev_next[2]
                lto, lto_i = _find_to_between(ev[0], ev_next[0], events.left_to, times)
                rto, rto_i = _find_to_between(ev[0], ev_next[0], events.right_to, times)
                cycle.left_to = lto
                cycle.left_to_idx = lto_i
                cycle.right_to = rto
                cycle.right_to_idx = rto_i
            else:
                cycle.right_hs = ev[0]
                cycle.right_hs_idx = ev[2]
                cycle.left_hs = ev_next[0]
                cycle.left_hs_idx = ev_next[2]
                lto, lto_i = _find_to_between(ev[0], ev_next[0], events.left_to, times)
                rto, rto_i = _find_to_between(ev[0], ev_next[0], events.right_to, times)
                cycle.left_to = lto
                cycle.left_to_idx = lto_i
                cycle.right_to = rto
                cycle.right_to_idx = rto_i
            cycles.append(cycle)
        return cycles

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
        avg_pixel_h = float(np.mean(heights))
        if avg_pixel_h < 1:
            return 1.0
        return avg_pixel_h / self._height_cm

    def _calc_spatial(self, cycles: List[_GaitCycle], result: GaitResult, scale: float):
        left_steps = []
        right_steps = []
        left_stride = []
        right_stride = []

        coord = self._ap_coord()
        for cycle in cycles:
            if cycle.left_hs_idx >= 0 and cycle.right_hs_idx >= 0:
                l_ap = self._skeletons[cycle.left_hs_idx].get_landmark(MPJoint.LEFT_ANKLE)
                r_ap = self._skeletons[cycle.right_hs_idx].get_landmark(MPJoint.RIGHT_ANKLE)
                if l_ap and r_ap:
                    step_px = abs(getattr(l_ap, coord) - getattr(r_ap, coord)) * self._skeletons[cycle.left_hs_idx].frame_width
                    step_cm = step_px / scale
                    left_steps.append(step_cm * 0.5)
                    right_steps.append(step_cm * 0.5)

        for i in range(1, len(cycles)):
            if cycles[i].left_hs_idx >= 0 and cycles[i-1].left_hs_idx >= 0:
                l1 = self._skeletons[cycles[i].left_hs_idx].get_landmark(MPJoint.LEFT_ANKLE)
                l2 = self._skeletons[cycles[i-1].left_hs_idx].get_landmark(MPJoint.LEFT_ANKLE)
                if l1 and l2:
                    stride_px = abs(getattr(l1, coord) - getattr(l2, coord)) * self._skeletons[cycles[i].left_hs_idx].frame_width
                    left_stride.append(stride_px / scale)
            if cycles[i].right_hs_idx >= 0 and cycles[i-1].right_hs_idx >= 0:
                r1 = self._skeletons[cycles[i].right_hs_idx].get_landmark(MPJoint.RIGHT_ANKLE)
                r2 = self._skeletons[cycles[i-1].right_hs_idx].get_landmark(MPJoint.RIGHT_ANKLE)
                if r1 and r2:
                    stride_px = abs(getattr(r1, coord) - getattr(r2, coord)) * self._skeletons[cycles[i].right_hs_idx].frame_width
                    right_stride.append(stride_px / scale)

        all_steps = left_steps + right_steps
        all_strides = left_stride + right_stride
        if not all_steps and not all_strides:
            return

        s = result.spatial
        if all_steps:
            s.step_length = float(np.mean(all_steps))
            s.left_step_length = float(np.mean(left_steps)) if left_steps else 0
            s.right_step_length = float(np.mean(right_steps)) if right_steps else 0
        if all_strides:
            s.stride_length = float(np.mean(all_strides))
        else:
            s.stride_length = s.step_length * 2.0

        durations = [c.end_time - c.start_time for c in cycles if c.end_time > c.start_time]
        if durations:
            s.cadence = 60.0 / float(np.mean(durations))

        total_dur = result.total_duration
        if total_dur > 0 and s.step_length > 0:
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

        stance_left = []
        stance_right = []
        swing_left = []
        swing_right = []
        for c in cycles:
            if c.left_hs > 0 and c.left_to > c.left_hs:
                stance = c.left_to - c.left_hs
                stance_left.append(stance)
                swing_left.append(c.end_time - c.left_to)
            if c.right_hs > 0 and c.right_to > c.right_hs:
                stance = c.right_to - c.right_hs
                stance_right.append(stance)
                swing_right.append(c.end_time - c.right_to)

        if stance_left:
            result.temporal.stance_time = float(np.mean(stance_left))
        elif stance_right:
            result.temporal.stance_time = float(np.mean(stance_right))
        else:
            result.temporal.stance_time = avg_cycle * 0.6

        if swing_left:
            result.temporal.swing_time = float(np.mean(swing_left))
        elif swing_right:
            result.temporal.swing_time = float(np.mean(swing_right))
        else:
            result.temporal.swing_time = avg_cycle * 0.4

    def _calc_support(self, cycles: List[_GaitCycle], result: GaitResult):
        if not cycles:
            return
        sup = result.support
        durations = [c.end_time - c.start_time for c in cycles if c.end_time > c.start_time]
        if not durations:
            return
        avg_cycle = float(np.mean(durations))
        if avg_cycle <= 0:
            return

        total_stance_left = 0.0
        total_stance_right = 0.0
        count_left = 0
        count_right = 0
        double_support_times = []

        for c in cycles:
            if c.left_hs > 0 and c.left_to > c.left_hs:
                stance_l = c.left_to - c.left_hs
                total_stance_left += stance_l
                count_left += 1
                if c.right_hs > 0:
                    ds_start = max(c.left_hs, c.right_hs)
                    ds_end = min(c.left_to, c.right_to)
                    if ds_end > ds_start:
                        double_support_times.append(ds_end - ds_start)

            if c.right_hs > 0 and c.right_to > c.right_hs:
                stance_r = c.right_to - c.right_hs
                total_stance_right += stance_r
                count_right += 1
                if c.left_hs > 0:
                    ds_start = max(c.right_hs, c.left_hs)
                    ds_end = min(c.right_to, c.left_to)
                    if ds_end > ds_start:
                        double_support_times.append(ds_end - ds_start)

        if double_support_times:
            avg_ds = float(np.mean(double_support_times))
            sup.double_support = (avg_ds / avg_cycle) * 100.0
        else:
            sup.double_support = 20.0

        if count_left > 0:
            avg_stance_l = total_stance_left / count_left
            sup.left_single_support = (avg_stance_l / avg_cycle) * 100.0
        else:
            sup.left_single_support = 40.0

        if count_right > 0:
            avg_stance_r = total_stance_right / count_right
            sup.right_single_support = (avg_stance_r / avg_cycle) * 100.0
        else:
            sup.right_single_support = 40.0

        sup.single_support = (sup.left_single_support + sup.right_single_support) / 2.0

        if sup.left_single_support > 0 and sup.right_single_support > 0:
            sup.single_support_asymmetry = abs(
                sup.left_single_support - sup.right_single_support
            ) / ((sup.left_single_support + sup.right_single_support) / 2.0) * 100.0

        sup.pre_swing = sup.double_support * 0.5
        sup.loading_response = sup.double_support * 0.5

    def _calc_joint_angles(self, result: GaitResult):
        left_knee = []
        right_knee = []
        left_hip = []
        right_hip = []

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
                left_knee.append(joint_angle(a, b, c))

            if rh and rk and ra and all(x.visibility > 0.3 for x in (rh, rk, ra)):
                a = np.array([rh.x, rh.y, rh.z])
                b = np.array([rk.x, rk.y, rk.z])
                c = np.array([ra.x, ra.y, ra.z])
                right_knee.append(joint_angle(a, b, c))

            if ls and lh and lk and all(x.visibility > 0.3 for x in (ls, lh, lk)):
                a = np.array([ls.x, ls.y, ls.z])
                b = np.array([lh.x, lh.y, lh.z])
                c = np.array([lk.x, lk.y, lk.z])
                left_hip.append(joint_angle(a, b, c))

            if rs and rh and rk and all(x.visibility > 0.3 for x in (rs, rh, rk)):
                a = np.array([rs.x, rs.y, rs.z])
                b = np.array([rh.x, rh.y, rh.z])
                c = np.array([rk.x, rk.y, rk.z])
                right_hip.append(joint_angle(a, b, c))

        def _make_grom(angles: List[float]) -> GROM:
            if not angles:
                return GROM()
            g = GROM()
            g.max_angle = float(np.max(angles))
            g.min_angle = float(np.min(angles))
            g.mean_angle = float(np.mean(angles))
            g.rom = g.max_angle - g.min_angle
            return g

        result.left_knee = _make_grom(left_knee)
        result.right_knee = _make_grom(right_knee)
        result.left_hip = _make_grom(left_hip)
        result.right_hip = _make_grom(right_hip)

    def _calc_risk(self, result: GaitResult):
        stride_m = result.spatial.stride_length / 100.0
        height_m = self._height_cm / 100.0
        result.risk = RiskCalculator.calculate_all(stride_m, height_m)

    @property
    def height_cm(self) -> float:
        return self._height_cm

    @height_cm.setter
    def height_cm(self, value: float):
        self._height_cm = value
