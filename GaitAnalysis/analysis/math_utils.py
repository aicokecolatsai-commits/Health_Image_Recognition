import numpy as np
from typing import List, Tuple


def savgol_filter(data: np.ndarray, window: int = 11, order: int = 3) -> np.ndarray:
    if window % 2 == 0:
        window += 1
    if window < order + 2:
        window = order + 2
    if window > len(data):
        window = len(data) if len(data) % 2 == 1 else len(data) - 1
    if window < 3:
        return data.copy()
    half = window // 2
    result = data.copy().astype(np.float64)
    for i in range(half, len(data) - half):
        xs = np.arange(i - half, i + half + 1) - i
        A = np.vander(xs, order + 1, increasing=True)
        coeffs, _, _, _ = np.linalg.lstsq(A, data[i - half:i + half + 1], rcond=None)
        result[i] = coeffs[0]
    return result


def differential(data: np.ndarray) -> np.ndarray:
    return np.diff(data, prepend=data[0])


def angle_between(v1: np.ndarray, v2: np.ndarray) -> float:
    cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
    cos_a = np.clip(cos_a, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_a)))


def joint_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    return angle_between(ba, bc)


def find_peaks(data: np.ndarray, min_distance: int = 10) -> List[int]:
    if len(data) < 3:
        return []
    smoothed = savgol_filter(data, window=min(min_distance * 2 + 1, len(data) if len(data) % 2 == 1 else len(data) - 1), order=3)
    peaks = []
    i = 1
    while i < len(smoothed) - 1:
        if smoothed[i] > smoothed[i - 1] and smoothed[i] >= smoothed[i + 1]:
            peaks.append(i)
            i += min_distance
        else:
            i += 1
    return peaks


def find_valleys(data: np.ndarray, min_distance: int = 10) -> List[int]:
    neg = -data
    smoothed = savgol_filter(neg, window=min(min_distance * 2 + 1, len(neg) if len(neg) % 2 == 1 else len(neg) - 1), order=3)
    valleys = []
    i = 1
    while i < len(smoothed) - 1:
        if smoothed[i] > smoothed[i - 1] and smoothed[i] >= smoothed[i + 1]:
            valleys.append(i)
            i += min_distance
        else:
            i += 1
    return valleys


def standard_deviation(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    return float(np.std(values, ddof=1))


def coefficient_variation(values: List[float]) -> float:
    arr = np.array(values)
    mean = np.mean(arr)
    if abs(mean) < 1e-8:
        return 0.0
    return float(np.std(arr, ddof=1) / mean * 100)


def find_peak_savitzky(
    data: np.ndarray,
    peak_width: int = 11,
    peak_poly_d: int = 3,
    slope_sensitivity: float = 0.1,
) -> Tuple[List[int], List[int], np.ndarray]:
    smoothed = savgol_filter(data, window=peak_width, order=peak_poly_d)
    deriv = differential(smoothed)
    peaks: List[int] = []
    valleys: List[int] = []
    for i in range(1, len(deriv) - 1):
        if deriv[i] > 0 and deriv[i + 1] <= 0:
            if abs(deriv[i]) >= slope_sensitivity:
                peaks.append(i)
        elif deriv[i] < 0 and deriv[i + 1] >= 0:
            if abs(deriv[i]) >= slope_sensitivity:
                valleys.append(i)
    return peaks, valleys, smoothed


def min_max_normalize(data: np.ndarray) -> np.ndarray:
    mn, mx = np.min(data), np.max(data)
    if mx - mn < 1e-8:
        return np.zeros_like(data)
    return (data - mn) / (mx - mn)