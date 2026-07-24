import numpy as np
import matplotlib
matplotlib.use("TkAgg")
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import customtkinter as ctk

from analysis.gait_analyzer import GaitResult
from skeleton.skeleton_data import MPJoint


class GaitChartFrame(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self._fig = Figure(figsize=(9, 7), dpi=100, facecolor="#1a1a2e")
        self._canvas = FigureCanvasTkAgg(self._fig, master=self)
        self._canvas.get_tk_widget().pack(fill="both", expand=True, padx=5, pady=5)

    def clear(self):
        self._fig.clear()

    def plot_assessment(self, result: GaitResult):
        self._fig.clear()
        d = result.to_dict()

        axes = self._fig.subplots(3, 2)
        self._fig.subplots_adjust(hspace=0.4, wspace=0.3)

        self._plot_spatial(axes[0, 0], d)
        self._plot_risk(axes[0, 1], d)
        self._plot_joint_rom(axes[1, 0], d)
        self._plot_support(axes[1, 1], d)
        self._plot_asymmetry(axes[2, 0], d)
        self._plot_summary(axes[2, 1], d)

        self._canvas.draw()

    def plot_angle_trends(self, left_knee: list, right_knee: list, left_hip: list, right_hip: list):
        self._fig.clear()
        ax = self._fig.subplots(1, 1)
        if left_knee:
            ax.plot(left_knee, label="左膝", color="#3498db", alpha=0.8)
        if right_knee:
            ax.plot(right_knee, label="右膝", color="#e74c3c", alpha=0.8)
        if left_hip:
            ax.plot(left_hip, label="左髖", color="#2ecc71", alpha=0.8, linestyle="--")
        if right_hip:
            ax.plot(right_hip, label="右髖", color="#f39c12", alpha=0.8, linestyle="--")
        ax.set_facecolor("#16213e")
        ax.set_title("關節角度趨勢", color="white")
        ax.legend()
        ax.tick_params(colors="gray")
        self._fig.patch.set_facecolor("#1a1a2e")
        self._canvas.draw()

    def _style_ax(self, ax):
        ax.set_facecolor("#16213e")
        ax.tick_params(colors="gray")
        for spine in ax.spines.values():
            spine.set_color("#333")

    def _plot_spatial(self, ax, d):
        self._style_ax(ax)
        s = d["spatial"]
        labels = ["步頻", "速度", "步幅", "步長"]
        vals = [s["cadence"], s["speed"], s["stride_length"], s["step_length"]]
        colors = ["#3498db", "#2ecc71", "#f39c12", "#e74c3c"]
        bars = ax.bar(labels, vals, color=colors, alpha=0.8)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                    f"{v:.1f}", ha="center", va="bottom", fontsize=8, color="white")
        ax.set_title("空間參數", color="white", fontsize=10)

    def _plot_risk(self, ax, d):
        self._style_ax(ax)
        r = d["risk"]
        labels = ["跌倒", "功能喪失", "失能"]
        vals = [r["falling"], r["function_loss"], r["disability"]]
        bars = ax.bar(labels, vals, color=["#e74c3c", "#f39c12", "#e74c3c"], alpha=0.8)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                    f"{v:.0f}", ha="center", va="bottom", fontsize=8, color="white")
        ax.set_ylim(0, 100)
        ax.axhline(y=50, color="gray", linestyle="--", alpha=0.5)
        ax.set_title("風險評估", color="white", fontsize=10)

    def _plot_joint_rom(self, ax, d):
        self._style_ax(ax)
        j = d["joint"]
        labels = ["左膝", "右膝", "左髖", "右髖"]
        vals = [j["left_knee"]["rom"], j["right_knee"]["rom"],
                j["left_hip"]["rom"], j["right_hip"]["rom"]]
        colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12"]
        bars = ax.bar(labels, vals, color=colors, alpha=0.8)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                    f"{v:.1f}°", ha="center", va="bottom", fontsize=8, color="white")
        ax.set_title("關節活動度 (ROM)", color="white", fontsize=10)

    def _plot_support(self, ax, d):
        self._style_ax(ax)
        sup = d["support"]
        labels = ["雙腳支撐", "單腳支撐", "承重期", "擺盪前期"]
        vals = [sup["double_support"], sup["single_support"],
                sup["loading_response"], sup["pre_swing"]]
        bars = ax.bar(labels, vals, color=["#3498db", "#2ecc71", "#f39c12", "#e74c3c"], alpha=0.8)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                    f"{v:.1f}%", ha="center", va="bottom", fontsize=8, color="white")
        ax.set_title("支撐期參數", color="white", fontsize=10)

    def _plot_asymmetry(self, ax, d):
        self._style_ax(ax)
        s, sup = d["spatial"], d["support"]
        labels = ["步長不對稱", "單腳支撐不對稱"]
        vals = [s["step_length_asymmetry"], sup["single_support_asymmetry"]]
        bars = ax.bar(labels, vals, color=["#e74c3c", "#f39c12"], alpha=0.8)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                    f"{v:.1f}%", ha="center", fontsize=8, color="white")
        ax.axhline(y=5, color="green", linestyle="--", alpha=0.5, label="正常閾值")
        ax.legend(fontsize=7)
        ax.set_title("對稱性分析", color="white", fontsize=10)

    def _plot_summary(self, ax, d):
        self._style_ax(ax)
        ax.axis("off")
        lines = [
            f"步態週期數: {d['num_cycles']}",
            f"總持續時間: {d['total_duration']}s",
            f"步長變異性: {d['spatial']['step_length_variability']:.1f}%",
            f"站立期: {d['temporal']['stance_time']:.2f}s",
            f"擺動期: {d['temporal']['swing_time']:.2f}s",
            f"週期時間: {d['temporal']['cycle_time']:.2f}s",
        ]
        for i, line in enumerate(lines):
            ax.text(0.1, 0.9 - i * 0.12, line, transform=ax.transAxes,
                    fontsize=9, color="white", verticalalignment="top")
        ax.set_title("摘要", color="white", fontsize=10)
