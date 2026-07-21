import json
import os
from datetime import datetime
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore

from analysis.gait_analyzer import GaitResult
from config import Config


class CloudService:
    def __init__(self):
        self._app: Optional[firebase_admin.App] = None
        self._db: Optional[firestore.Client] = None
        self._initialized = False

    def initialize(self, cred_path: Optional[str] = None) -> bool:
        if self._initialized:
            return True
        path = cred_path or Config.FIREBASE_CRED_PATH
        if not path or not os.path.exists(path):
            return False
        try:
            cred = credentials.Certificate(path)
            self._app = firebase_admin.initialize_app(cred, {
                "projectId": Config.FIREBASE_PROJECT_ID,
            })
            self._db = firestore.client()
            self._initialized = True
            return True
        except Exception:
            return False

    @property
    def db(self) -> Optional[firestore.Client]:
        return self._db

    @property
    def is_ready(self) -> bool:
        return self._initialized and self._db is not None

    def save_assessment(
        self, user_id: str, patient_id: str, result: GaitResult, assessment_id: Optional[str] = None
    ) -> Optional[str]:
        if not self.is_ready or not result.valid:
            return None
        aid = assessment_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        d = result.to_dict()
        data = {
            "assessment_id": aid,
            "date": firestore.SERVER_TIMESTAMP,
            "num_cycles": d["num_cycles"],
            "total_duration": d["total_duration"],
            "cadence": d["spatial"]["cadence"],
            "speed": d["spatial"]["speed"],
            "stride_length": d["spatial"]["stride_length"],
            "step_length": d["spatial"]["step_length"],
            "step_length_asymmetry": d["spatial"]["step_length_asymmetry"],
            "step_length_variability": d["spatial"]["step_length_variability"],
            "double_support": d["support"]["double_support"],
            "single_support_asymmetry": d["support"]["single_support_asymmetry"],
            "left_knee_rom": d["joint"]["left_knee"]["rom"],
            "right_knee_rom": d["joint"]["right_knee"]["rom"],
            "left_hip_rom": d["joint"]["left_hip"]["rom"],
            "right_hip_rom": d["joint"]["right_hip"]["rom"],
            "risk_falling": d["risk"]["falling"],
            "risk_function_loss": d["risk"]["function_loss"],
            "risk_disability": d["risk"]["disability"],
        }
        self._db.collection("users").document(user_id).collection("patients").document(
            patient_id
        ).collection("assessments").document(aid).set(data)
        return aid

    def save_patient(self, user_id: str, patient_data: dict) -> Optional[str]:
        if not self.is_ready:
            return None
        patient_id = patient_data.get("patient_id", datetime.now().strftime("%Y%m%d_%H%M%S"))
        data = {
            **patient_data,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        if "created_at" not in data:
            data["created_at"] = firestore.SERVER_TIMESTAMP
        self._db.collection("users").document(user_id).collection("patients").document(
            patient_id
        ).set(data, merge=True)
        return patient_id

    def get_patients(self, user_id: str) -> list:
        if not self.is_ready:
            return []
        docs = (
            self._db.collection("users")
            .document(user_id)
            .collection("patients")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .get()
        )
        return [{"id": d.id, **d.to_dict()} for d in docs] if docs else []

    def get_assessments(self, user_id: str, patient_id: str) -> list:
        if not self.is_ready:
            return []
        docs = (
            self._db.collection("users")
            .document(user_id)
            .collection("patients")
            .document(patient_id)
            .collection("assessments")
            .order_by("date", direction=firestore.Query.DESCENDING)
            .get()
        )
        return [{"id": d.id, **d.to_dict()} for d in docs] if docs else []

    def save_user_profile(self, user_id: str, profile_data: dict):
        if not self.is_ready:
            return
        self._db.collection("users").document(user_id).set(
            {**profile_data, "last_login": firestore.SERVER_TIMESTAMP}, merge=True
        )

    def close(self):
        if self._app:
            firebase_admin.delete_app(self._app)
            self._app = None
            self._db = None
            self._initialized = False
