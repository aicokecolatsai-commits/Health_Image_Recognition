import customtkinter as ctk
from datetime import datetime

from config import Config
from app.patient_manager import PatientManager, Patient


class PatientPanel(ctk.CTkFrame):
    def __init__(self, master, patient_manager: PatientManager, **kwargs):
        super().__init__(master, **kwargs)
        self._pm = patient_manager
        self._build_ui()
        self._refresh_list()

    def _build_ui(self):
        title = ctk.CTkLabel(self, text="病人管理", font=ctk.CTkFont(size=16, weight="bold"))
        title.pack(pady=(10, 5))

        main = ctk.CTkFrame(self)
        main.pack(fill="both", expand=True, padx=10, pady=5)
        main.grid_columnconfigure(0, weight=1)
        main.grid_columnconfigure(1, weight=2)

        ctk.CTkLabel(main, text="選擇病人:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        self._patient_combo = ctk.CTkComboBox(main, values=[], state="readonly", width=250, command=self._on_select)
        self._patient_combo.grid(row=0, column=1, sticky="w", padx=5, pady=5)

        ctk.CTkButton(main, text="新增病人", command=self._new_patient, width=100).grid(row=0, column=2, padx=5)

        sep = ctk.CTkFrame(main, height=2, fg_color="gray")
        sep.grid(row=1, column=0, columnspan=3, sticky="ew", padx=5, pady=10)

        fields = [
            ("姓名:", "name"),
            ("身高 (cm):", "height"),
            ("體重 (kg):", "weight"),
            ("性別:", "gender"),
            ("生日 (YYYY-MM-DD):", "birth_date"),
            ("備註:", "notes"),
        ]
        self._entries = {}
        for i, (label, key) in enumerate(fields):
            r = i + 2
            ctk.CTkLabel(main, text=label).grid(row=r, column=0, sticky="w", padx=5, pady=3)
            if key == "gender":
                var = ctk.StringVar(value="")
                combo = ctk.CTkComboBox(main, values=["男", "女", "其他"], variable=var, state="readonly", width=250)
                combo.grid(row=r, column=1, columnspan=2, sticky="w", padx=5, pady=3)
                self._entries[key] = var
            elif key == "notes":
                entry = ctk.CTkTextbox(main, width=250, height=60)
                entry.grid(row=r, column=1, columnspan=2, sticky="w", padx=5, pady=3)
                self._entries[key] = entry
            else:
                entry = ctk.CTkEntry(main, width=250)
                entry.grid(row=r, column=1, columnspan=2, sticky="w", padx=5, pady=3)
                self._entries[key] = entry

        btn_row = len(fields) + 2
        self._save_btn = ctk.CTkButton(main, text="儲存", command=self._save_patient, width=100)
        self._save_btn.grid(row=btn_row, column=0, padx=5, pady=10)

        self._delete_btn = ctk.CTkButton(main, text="刪除", command=self._delete_patient, width=100, fg_color="#a32a2a")
        self._delete_btn.grid(row=btn_row, column=1, padx=5, pady=10, sticky="w")

        self._status_label = ctk.CTkLabel(main, text="", font=ctk.CTkFont(size=12))
        self._status_label.grid(row=btn_row + 1, column=0, columnspan=3, pady=5)

    def _refresh_list(self):
        names = []
        for p in self._pm.patients:
            label = f"{p.name} ({p.patient_id[-6:]})" if p.name else p.patient_id
            names.append(label)
        self._patient_combo.configure(values=names)
        if self._pm.active_patient:
            for i, p in enumerate(self._pm.patients):
                if p.patient_id == self._pm.active_patient.patient_id:
                    label = f"{p.name} ({p.patient_id[-6:]})" if p.name else p.patient_id
                    if names:
                        self._patient_combo.set(label)
                    break
        elif names:
            self._patient_combo.set(names[0])
        if names:
            self._load_patient(self._pm.active_patient or self._pm.patients[0])

    def _on_select(self, choice):
        for p in self._pm.patients:
            label = f"{p.name} ({p.patient_id[-6:]})" if p.name else p.patient_id
            if label == choice:
                self._pm.active_patient = p.patient_id
                self._load_patient(p)
                break

    def _load_patient(self, patient: Patient):
        self._entries["name"].delete(0, "end")
        self._entries["name"].insert(0, patient.name)
        self._entries["height"].delete(0, "end")
        self._entries["height"].insert(0, str(patient.height))
        self._entries["weight"].delete(0, "end")
        self._entries["weight"].insert(0, str(patient.weight))
        self._entries["gender"].set(patient.gender)
        self._entries["birth_date"].delete(0, "end")
        self._entries["birth_date"].insert(0, patient.birth_date)
        self._entries["notes"].delete("1.0", "end")
        self._entries["notes"].insert("1.0", patient.notes)

    def _new_patient(self):
        p = Patient()
        p.patient_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        p.created_at = datetime.now().isoformat()
        self._pm.add_patient(p)
        self._pm.active_patient = p.patient_id
        self._refresh_list()
        self._load_patient(p)
        self._status_label.configure(text="已新增病人", text_color="#2ecc71")

    def _save_patient(self):
        p = self._pm.active_patient
        if not p:
            self._status_label.configure(text="請先選擇病人", text_color="red")
            return
        p.name = self._entries["name"].get().strip()
        try:
            p.height = float(self._entries["height"].get())
        except ValueError:
            p.height = 170.0
        try:
            p.weight = float(self._entries["weight"].get())
        except ValueError:
            p.weight = 70.0
        p.gender = self._entries["gender"].get()
        p.birth_date = self._entries["birth_date"].get().strip()
        p.notes = self._entries["notes"].get("1.0", "end-1c").strip()
        self._pm.update_patient(p)
        self._refresh_list()
        self._status_label.configure(text="已儲存病人資料", text_color="#2ecc71")

    def _delete_patient(self):
        p = self._pm.active_patient
        if not p:
            return
        self._pm.delete_patient(p.patient_id)
        self._refresh_list()
        self._status_label.configure(text="已刪除病人", text_color="#e74c3c")
