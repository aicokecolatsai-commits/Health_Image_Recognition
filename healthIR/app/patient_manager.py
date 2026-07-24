import json
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Optional


@dataclass
class Patient:
    patient_id: str = ""
    name: str = ""
    height: float = 170.0
    weight: float = 70.0
    gender: str = ""
    birth_date: str = ""
    notes: str = ""
    created_at: str = ""


class PatientManager:
    def __init__(self, data_dir: str = ""):
        self._data_dir = data_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(self._data_dir, exist_ok=True)
        self._path = os.path.join(self._data_dir, "patients.json")
        self._patients: List[Patient] = []
        self._active_id: Optional[str] = None
        self._load()

    @property
    def active_patient(self) -> Optional[Patient]:
        if not self._active_id:
            return None
        for p in self._patients:
            if p.patient_id == self._active_id:
                return p
        return None

    @active_patient.setter
    def active_patient(self, patient_id: Optional[str]):
        self._active_id = patient_id

    @property
    def patients(self) -> List[Patient]:
        return self._patients

    def add_patient(self, patient: Patient) -> str:
        if not patient.patient_id:
            patient.patient_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        if not patient.created_at:
            patient.created_at = datetime.now().isoformat()
        self._patients.append(patient)
        self._save()
        return patient.patient_id

    def update_patient(self, patient: Patient) -> bool:
        for i, p in enumerate(self._patients):
            if p.patient_id == patient.patient_id:
                self._patients[i] = patient
                self._save()
                return True
        return False

    def delete_patient(self, patient_id: str) -> bool:
        self._patients = [p for p in self._patients if p.patient_id != patient_id]
        if self._active_id == patient_id:
            self._active_id = self._patients[0].patient_id if self._patients else None
        self._save()
        return True

    def get_patient(self, patient_id: str) -> Optional[Patient]:
        for p in self._patients:
            if p.patient_id == patient_id:
                return p
        return None

    def _load(self):
        if not os.path.exists(self._path):
            self._patients = []
            return
        try:
            with open(self._path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._patients = [Patient(**d) for d in data]
            self._active_id = self._patients[0].patient_id if self._patients else None
        except (json.JSONDecodeError, IOError):
            self._patients = []

    def _save(self):
        try:
            with open(self._path, "w", encoding="utf-8") as f:
                json.dump([asdict(p) for p in self._patients], f, ensure_ascii=False, indent=2)
        except IOError:
            pass
