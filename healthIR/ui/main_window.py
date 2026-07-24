import customtkinter as ctk

from config import Config
from app.app_controller import AppController
from app.state_machine import AppState
from ui.camera_panel import CameraPanel
from ui.gait_panel import GaitPanel
from ui.result_panel import ResultPanel
from ui.login_panel import LoginPanel
from ui.patient_panel import PatientPanel
from analysis.gait_analyzer import GaitResult


class MainWindow(ctk.CTk):
    def __init__(self, controller: AppController):
        super().__init__()
        self._controller = controller
        Config.load_locale("zh_TW")
        self._setup_window()
        self._build_ui()
        self._bind_events()
        self._update_timer()

    def _setup_window(self):
        self.title(f"{Config.lang('app.title', 'healthIR')} {Config.lang('app.version', 'v2.0.0')}")
        self.geometry("1100x700")
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("green")

    def _build_ui(self):
        self._tab_view = ctk.CTkTabview(self)
        self._tab_view.pack(fill="both", expand=True, padx=10, pady=5)

        tabs = ["登入", "病人管理", "鏡頭設定", "步態測量", "分析結果"]
        for t in tabs:
            self._tab_view.add(t)

        self._login_panel = LoginPanel(
            self._tab_view.tab(tabs[0]),
            self._controller.line_login,
            self._controller.cloud,
            self._controller.sync_manager,
        )
        self._login_panel.pack(fill="both", expand=True)

        self._patient_panel = PatientPanel(
            self._tab_view.tab(tabs[1]),
            self._controller.patient_manager,
        )
        self._patient_panel.pack(fill="both", expand=True)

        self._camera_panel = CameraPanel(self._tab_view.tab(tabs[2]), self._controller)
        self._camera_panel.pack(fill="both", expand=True)

        self._gait_panel = GaitPanel(self._tab_view.tab(tabs[3]), self._controller)
        self._gait_panel.pack(fill="both", expand=True)

        self._result_panel = ResultPanel(
            self._tab_view.tab(tabs[4]),
            self._controller.data_manager,
            self._controller.patient_manager,
        )
        self._result_panel.pack(fill="both", expand=True)

    def _bind_events(self):
        self._controller.set_frame_callback(self._on_frame)
        self._controller.set_result_callback(self._on_result)
        self._controller.state_machine.add_listener(self._on_state_change)

    def _on_frame(self, frame):
        self._camera_panel.update_frame(frame)
        if self._controller.state_machine.state == AppState.RECORDING:
            count = self._controller._analyzer.buffer_size()
            dur = 0.0
            if count >= 2:
                dur = self._controller._analyzer._skeletons[-1].timestamp - self._controller._analyzer._skeletons[0].timestamp
            self._gait_panel.update_buffer_info(count, dur)

    def _on_result(self, result: GaitResult):
        if result and result.valid:
            self._result_panel.show_result(result)
            self._tab_view.set("分析結果")

    def _on_state_change(self, old, new):
        pass

    def _update_timer(self):
        self.after(50, self._update_timer)
