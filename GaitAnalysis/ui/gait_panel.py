import customtkinter as ctk
from config import Config
from app.app_controller import AppController
from app.state_machine import AppState


class GaitPanel(ctk.CTkFrame):
    def __init__(self, master, controller: AppController, **kwargs):
        super().__init__(master, **kwargs)
        self._controller = controller
        self._build_ui()
        controller.state_machine.add_listener(self._on_state_change)

    def _build_ui(self):
        title = ctk.CTkLabel(self, text=Config.lang("gait.tab", "Gait Measurement"),
                             font=ctk.CTkFont(size=16, weight="bold"))
        title.pack(pady=(10, 5))

        ctn = ctk.CTkFrame(self)
        ctn.pack(fill="both", expand=True, padx=10, pady=5)

        self._status_label = ctk.CTkLabel(
            ctn, text=Config.lang("gait.ready", "Ready"),
            font=ctk.CTkFont(size=16),
            text_color="gray",
        )
        self._status_label.pack(pady=10)

        self._record_btn = ctk.CTkButton(
            ctn,
            text=Config.lang("gait.start_record", "Start Recording"),
            command=self._toggle_record,
            width=200,
            height=60,
            font=ctk.CTkFont(size=16),
            fg_color="#2d7a3a",
            hover_color="#1e5c28",
            state="disabled",
        )
        self._record_btn.pack(pady=20)

        self._info_frame = ctk.CTkFrame(ctn)
        self._info_frame.pack(fill="x", padx=20, pady=10)

        self._buffer_label = ctk.CTkLabel(self._info_frame, text="", font=ctk.CTkFont(size=12))
        self._buffer_label.pack(anchor="w")

        self._duration_label = ctk.CTkLabel(self._info_frame, text="", font=ctk.CTkFont(size=12))
        self._duration_label.pack(anchor="w")

        hint = ctk.CTkLabel(ctn, text=Config.lang("gait.record_hint", "Press start and begin walking"),
                            font=ctk.CTkFont(size=11), text_color="gray")
        hint.pack(side="bottom", pady=10)

    def _on_state_change(self, old, new):
        if new == AppState.CAMERA_READY:
            self._record_btn.configure(state="normal", text=Config.lang("gait.start_record", "Start Recording"), fg_color="#2d7a3a", hover_color="#1e5c28")
            self._status_label.configure(text=Config.lang("gait.ready", "Ready"), text_color="gray")
        elif new == AppState.RECORDING:
            self._record_btn.configure(text=Config.lang("gait.stop_record", "Stop Recording"), fg_color="#a32a2a", hover_color="#7a1f1f")
            self._status_label.configure(text=Config.lang("gait.recording", "Recording..."), text_color="#e74c3c")
        elif new == AppState.ANALYZING:
            self._record_btn.configure(state="disabled", text=Config.lang("gait.analyzing", "Analyzing..."), fg_color="#2d7a3a")
            self._status_label.configure(text=Config.lang("gait.analyzing", "Analyzing..."), text_color="#f39c12")
        elif new == AppState.RESULT:
            self._record_btn.configure(state="normal", text=Config.lang("gait.start_record", "Start Recording"), fg_color="#2d7a3a", hover_color="#1e5c28")
            self._status_label.configure(text=Config.lang("gait.ready", "Ready"), text_color="gray")
        elif new == AppState.IDLE:
            self._record_btn.configure(state="disabled", text=Config.lang("gait.start_record", "Start Recording"), fg_color="#2d7a3a")
            self._status_label.configure(text=Config.lang("gait.ready", "Ready"), text_color="gray")
            self._buffer_label.configure(text="")
            self._duration_label.configure(text="")

    def _toggle_record(self):
        if self._controller.state_machine.state == AppState.RECORDING:
            self._controller.stop_recording()
        else:
            self._controller.start_recording()

    def update_buffer_info(self, count: int, duration: float):
        if count > 0:
            self._buffer_label.configure(text=f"Frames: {count}")
            self._duration_label.configure(text=f"Duration: {duration:.1f}s")
        else:
            self._buffer_label.configure(text="")
            self._duration_label.configure(text="")