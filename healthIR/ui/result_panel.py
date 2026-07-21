import customtkinter as ctk
from config import Config
from analysis.gait_analyzer import GaitResult
from app.data_manager import DataManager


class ResultPanel(ctk.CTkScrollableFrame):
    def __init__(self, master, data_manager: DataManager, **kwargs):
        super().__init__(master, **kwargs)
        self._data_manager = data_manager
        self._build_ui()

    def _build_ui(self):
        self._title = ctk.CTkLabel(self, text=Config.lang("result.title", "Gait Analysis Report"),
                                   font=ctk.CTkFont(size=16, weight="bold"))
        self._title.pack(pady=(10, 5))

        self._content_frame = ctk.CTkFrame(self)
        self._content_frame.pack(fill="both", expand=True, padx=10, pady=5)

        self._no_result_label = ctk.CTkLabel(
            self._content_frame,
            text=Config.lang("result.no_result", "No analysis results yet"),
            font=ctk.CTkFont(size=14),
            text_color="gray",
        )
        self._no_result_label.pack(pady=30)

        self._export_btn = ctk.CTkButton(
            self._content_frame,
            text=Config.lang("result.export_csv", "Export CSV"),
            command=self._export_csv,
            state="disabled",
        )

        self._result: GaitResult | None = None

    def show_result(self, result: GaitResult):
        self._result = result
        if not result or not result.valid:
            self._clear_content()
            self._no_result_label.pack(pady=30)
            return

        self._clear_content()
        self._no_result_label.pack_forget()

        lang = Config._locale_data.get("result", {})
        d = result.to_dict()

        sections = [
            ("spatial", Config.lang("result.spatial", "Spatial Parameters"), [
                ("cadence", f"{d['spatial']['cadence']} {Config.lang('result.unit_cadence', 'steps/min')}"),
                ("speed", f"{d['spatial']['speed']} {Config.lang('result.unit_speed', 'm/s')}"),
                ("stride_length", f"{d['spatial']['stride_length']} {Config.lang('result.unit_length', 'cm')}"),
                ("step_length", f"{d['spatial']['step_length']} {Config.lang('result.unit_length', 'cm')}"),
                ("step_length_asymmetry", f"{d['spatial']['step_length_asymmetry']} {Config.lang('result.unit_percent', '%')}"),
                ("step_length_variability", f"{d['spatial']['step_length_variability']} {Config.lang('result.unit_percent', '%')}"),
            ]),
            ("support", Config.lang("result.support", "Support Phase"), [
                ("double_support", f"{d['support']['double_support']} {Config.lang('result.unit_percent', '%')}"),
                ("single_support", f"{d['support']['single_support']} {Config.lang('result.unit_percent', '%')}"),
                ("single_support_asymmetry", f"{d['support']['single_support_asymmetry']} {Config.lang('result.unit_percent', '%')}"),
                ("loading_response", f"{d['support']['loading_response']} {Config.lang('result.unit_percent', '%')}"),
                ("pre_swing", f"{d['support']['pre_swing']} {Config.lang('result.unit_percent', '%')}"),
            ]),
            ("joint", Config.lang("result.joint", "Joint ROM"), [
                ("left_knee_rom", f"{d['joint']['left_knee']['rom']} {Config.lang('result.unit_rom', 'deg')}"),
                ("right_knee_rom", f"{d['joint']['right_knee']['rom']} {Config.lang('result.unit_rom', 'deg')}"),
                ("left_hip_rom", f"{d['joint']['left_hip']['rom']} {Config.lang('result.unit_rom', 'deg')}"),
                ("right_hip_rom", f"{d['joint']['right_hip']['rom']} {Config.lang('result.unit_rom', 'deg')}"),
            ]),
            ("risk", Config.lang("result.risk", "Risk Assessment"), [
                ("risk_falling", f"{d['risk']['falling']} {Config.lang('result.unit_score', 'pts')}"),
                ("risk_function_loss", f"{d['risk']['function_loss']} {Config.lang('result.unit_score', 'pts')}"),
                ("risk_disability", f"{d['risk']['disability']} {Config.lang('result.unit_score', 'pts')}"),
            ]),
        ]

        for section_key, section_title, items in sections:
            frame = ctk.CTkFrame(self._content_frame)
            frame.pack(fill="x", padx=5, pady=3)
            ctk.CTkLabel(frame, text=section_title, font=ctk.CTkFont(size=13, weight="bold")).pack(anchor="w", padx=5, pady=(5, 0))
            for key, val in items:
                label_key = lang.get(key, key)
                row = ctk.CTkFrame(frame, fg_color="transparent")
                row.pack(fill="x", padx=15, pady=1)
                ctk.CTkLabel(row, text=label_key, width=200, anchor="w").pack(side="left")
                ctk.CTkLabel(row, text=str(val), anchor="e").pack(side="right")

        summary = f"Gait cycles: {d['num_cycles']}, Duration: {d['total_duration']}s"
        ctk.CTkLabel(self._content_frame, text=summary, font=ctk.CTkFont(size=11), text_color="gray").pack(pady=5)

        self._export_btn.pack(pady=10)

    def _clear_content(self):
        for w in self._content_frame.winfo_children():
            if w != self._no_result_label and w != self._export_btn:
                w.destroy()
        self._export_btn.pack_forget()

    def _export_csv(self):
        if self._result:
            path = self._data_manager.export_csv(self._result)
            self._export_btn.configure(text=f"Exported: {path.split('/')[-1].split('\\\\')[-1]}")