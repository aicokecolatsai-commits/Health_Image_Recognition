import json
import os
from datetime import datetime
from typing import Optional

from analysis.gait_analyzer import GaitResult
from cloud.cloud_service import CloudService
from cloud.line_login import LineLogin
from config import Config


class SyncManager:
    def __init__(self, cloud: CloudService, line_login: LineLogin):
        self._cloud = cloud
        self._line = line_login
        self._sync_enabled = True

    @property
    def sync_enabled(self) -> bool:
        return self._sync_enabled

    @sync_enabled.setter
    def sync_enabled(self, value: bool):
        self._sync_enabled = value

    @property
    def is_ready(self) -> bool:
        return (
            self._cloud.is_ready
            and self._line.is_logged_in
            and self._sync_enabled
        )

    def upload_assessment(self, patient_id: str, result: GaitResult) -> Optional[str]:
        if not self.is_ready or not result.valid:
            return None
        user_id = self._line.profile.user_id
        return self._cloud.save_assessment(user_id, patient_id, result)

    def upload_patient(self, patient_data: dict) -> Optional[str]:
        if not self.is_ready:
            return None
        user_id = self._line.profile.user_id
        return self._cloud.save_patient(user_id, patient_data)

    def list_patients(self) -> list:
        if not self._cloud.is_ready or not self._line.is_logged_in:
            return []
        return self._cloud.get_patients(self._line.profile.user_id)

    def list_assessments(self, patient_id: str) -> list:
        if not self._cloud.is_ready or not self._line.is_logged_in:
            return []
        return self._cloud.get_assessments(self._line.profile.user_id, patient_id)

    def save_login_profile(self):
        if not self._cloud.is_ready or not self._line.is_logged_in:
            return
        self._cloud.save_user_profile(
            self._line.profile.user_id, self._line.to_dict()
        )
