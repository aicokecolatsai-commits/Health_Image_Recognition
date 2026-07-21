import json
import os
import datetime
from typing import Optional

from analysis.gait_analyzer import GaitResult


class DataManager:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        self._data_dir = data_dir
        os.makedirs(self._data_dir, exist_ok=True)

    def save_result(self, result: GaitResult, patient_info: dict = None) -> str:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gait_result_{timestamp}.json"
        filepath = os.path.join(self._data_dir, filename)

        data = result.to_dict()
        data["patient_info"] = patient_info or {}
        data["record_time"] = timestamp

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return filepath

    def export_csv(self, result: GaitResult, filepath: str = None) -> str:
        if filepath is None:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = os.path.join(self._data_dir, f"gait_result_{timestamp}.csv")

        d = result.to_dict()
        lines = ["參數,值,單位"]
        for category, params in d.items():
            if category == "valid" or category == "num_cycles" or category == "total_duration":
                lines.append(f"{category},{params},-")
                continue
            if isinstance(params, dict):
                for key, val in params.items():
                    if isinstance(val, dict):
                        for sub_key, sub_val in val.items():
                            lines.append(f"{key}_{sub_key},{sub_val},-")
                    else:
                        lines.append(f"{category}_{key},{val},-")

        with open(filepath, "w", encoding="utf-8-sig") as f:
            f.write("\n".join(lines))
        return filepath

    def list_results(self) -> list:
        files = []
        for f in os.listdir(self._data_dir):
            if f.startswith("gait_result_") and f.endswith(".json"):
                files.append(os.path.join(self._data_dir, f))
        return sorted(files, reverse=True)

    def load_result(self, filepath: str) -> Optional[GaitResult]:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            return GaitResult(**data)
        except Exception:
            return None