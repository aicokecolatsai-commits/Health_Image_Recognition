import cv2
import customtkinter as ctk
from config import Config, CameraType, GaitAxis
from app.app_controller import AppController


class CameraPanel(ctk.CTkFrame):
    def __init__(self, master, controller: AppController, **kwargs):
        super().__init__(master, **kwargs)
        self._controller = controller
        self._video_label: ctk.CTkLabel | None = None
        self._build_ui()

    def _build_ui(self):
        title = ctk.CTkLabel(self, text=Config.lang("camera.tab", "Camera Settings"),
                             font=ctk.CTkFont(size=16, weight="bold"))
        title.pack(pady=(10, 5))

        main_frame = ctk.CTkFrame(self)
        main_frame.pack(fill="both", expand=True, padx=10, pady=5)
        main_frame.grid_columnconfigure(1, weight=1)
        main_frame.grid_rowconfigure(7, weight=1)

        row = 0
        ctk.CTkLabel(main_frame, text=Config.lang("camera.module_label", "Sensor Module:")).grid(row=row, column=0, sticky="w", padx=5, pady=5)
        self._module_var = ctk.StringVar(value=CameraType.WEBCAM)
        cam_labels = [CameraType.WEBCAM, CameraType.MOBILE, CameraType.DEPTH_KINECT, CameraType.DEPTH_ORBBEC]
        self._module_combo = ctk.CTkComboBox(
            main_frame, values=cam_labels,
            variable=self._module_var, state="readonly", width=200,
        )
        self._module_combo.grid(row=row, column=1, sticky="w", padx=5, pady=5)

        row += 1
        ctk.CTkLabel(main_frame, text=Config.lang("camera.gait_axis_label", "Walking Direction:")).grid(row=row, column=0, sticky="w", padx=5, pady=5)
        self._axis_var = ctk.StringVar(value=GaitAxis.SIDE)
        self._axis_combo = ctk.CTkComboBox(
            main_frame, values=[GaitAxis.SIDE, GaitAxis.FRONT],
            variable=self._axis_var, state="readonly", width=200,
        )
        self._axis_combo.grid(row=row, column=1, sticky="w", padx=5, pady=5)

        row += 1
        ctk.CTkLabel(main_frame, text=Config.lang("camera.height_label", "Height (cm):")).grid(row=row, column=0, sticky="w", padx=5, pady=5)
        self._height_var = ctk.StringVar(value="170")
        self._height_entry = ctk.CTkEntry(main_frame, textvariable=self._height_var, width=100)
        self._height_entry.grid(row=row, column=1, sticky="w", padx=5, pady=5)

        row += 1
        self._camera_btn = ctk.CTkButton(
            main_frame,
            text=Config.lang("camera.start", "Start Camera"),
            command=self._toggle_camera,
            width=150,
        )
        self._camera_btn.grid(row=row, column=0, columnspan=2, pady=5)

        row += 1
        self._status_label = ctk.CTkLabel(main_frame, text="", font=ctk.CTkFont(size=12))
        self._status_label.grid(row=row, column=0, columnspan=2, pady=2)

        row += 1
        self._video_label = ctk.CTkLabel(main_frame, text=Config.lang("camera.placeholder", "Preview will appear here"), width=320, height=240, fg_color="#1a1a2e")
        self._video_label.grid(row=row, column=0, columnspan=2, pady=5, sticky="nsew")

        row += 1
        hint = ctk.CTkLabel(main_frame, text=Config.lang("camera.side_view_hint", "Place camera at the side of walking direction"),
                             font=ctk.CTkFont(size=11), text_color="gray")
        hint.grid(row=row, column=0, columnspan=2, pady=2)

    def _toggle_camera(self):
        if self._controller.state_machine.state.name in ("CAMERA_READY", "RECORDING"):
            self._controller.stop_camera()
            self._camera_btn.configure(text=Config.lang("camera.start", "Start Camera"))
            self._status_label.configure(text="")
        else:
            try:
                h = float(self._height_var.get())
                self._controller.height_cm = h
            except ValueError:
                h = 170.0
            self._controller.camera_type = self._module_var.get()
            self._controller.gait_axis = self._axis_var.get()
            ok = self._controller.start_camera()
            if ok:
                ct = self._module_var.get()
                label = CameraType.label(ct)
                self._camera_btn.configure(text=Config.lang("camera.stop", "Stop Camera"))
                self._status_label.configure(text=f"{label}")
            else:
                self._status_label.configure(text=Config.lang("camera.no_camera", "No camera available"))

    def update_frame(self, frame):
        if self._video_label is None:
            return
        try:
            from PIL import Image
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w = rgb.shape[:2]
            max_w, max_h = 320, 240
            scale = min(max_w / w, max_h / h)
            nw, nh = int(w * scale), int(h * scale)
            img = Image.fromarray(rgb).resize((nw, nh))
            from customtkinter import CTkImage
            ctimg = CTkImage(img, size=(nw, nh))
            self._video_label.configure(image=ctimg, text="")
            self._video_label.image = ctimg
        except Exception:
            pass
