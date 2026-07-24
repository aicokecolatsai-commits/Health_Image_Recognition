import os
import io
from datetime import datetime

from analysis.gait_analyzer import GaitResult
from app.patient_manager import Patient


try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        Image as RLImage,
    )
    from reportlab.graphics.shapes import Drawing, String, Rect
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics import renderPDF
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class PdfGenerator:
    def __init__(self, output_dir: str = ""):
        base = os.path.dirname(os.path.dirname(__file__))
        self._output_dir = output_dir or os.path.join(base, "data", "reports")
        os.makedirs(self._output_dir, exist_ok=True)

    def generate(self, result: GaitResult, patient: Patient | None = None) -> str | None:
        if not HAS_REPORTLAB:
            return None
        if not result.valid:
            return None

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Gait_Report_{ts}.pdf"
        filepath = os.path.join(self._output_dir, filename)

        doc = SimpleDocTemplate(filepath, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name="DarkTitle", fontSize=20, textColor=HexColor("#1a1a2e"), spaceAfter=10))
        styles.add(ParagraphStyle(name="DarkNormal", fontSize=10, textColor=HexColor("#333"), spaceAfter=4))

        elements = []
        elements.append(Paragraph("步態分析報告", styles["DarkTitle"]))
        elements.append(Paragraph(f"報告日期: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["DarkNormal"]))
        elements.append(Spacer(1, 0.5 * cm))

        if patient:
            elements.append(Paragraph(f"病人姓名: {patient.name}", styles["DarkNormal"]))
            elements.append(Paragraph(f"身高: {patient.height} cm | 體重: {patient.weight} kg", styles["DarkNormal"]))
            elements.append(Spacer(1, 0.5 * cm))

        d = result.to_dict()
        elements.append(Paragraph("一、空間參數", styles["DarkTitle"]))
        spatial = [
            ["參數", "數值", "單位"],
            ["步頻", f"{d['spatial']['cadence']:.1f}", "步/分"],
            ["行走速度", f"{d['spatial']['speed']:.2f}", "m/s"],
            ["步幅", f"{d['spatial']['stride_length']:.1f}", "cm"],
            ["步長", f"{d['spatial']['step_length']:.1f}", "cm"],
            ["步長不對稱性", f"{d['spatial']['step_length_asymmetry']:.1f}", "%"],
            ["步長變異性", f"{d['spatial']['step_length_variability']:.1f}", "%"],
        ]
        t = Table(spatial, colWidths=[120, 80, 60])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#ccc")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("二、時間參數", styles["DarkTitle"]))
        temporal = [
            ["參數", "數值", "單位"],
            ["站立期", f"{d['temporal']['stance_time']:.2f}", "秒"],
            ["擺動期", f"{d['temporal']['swing_time']:.2f}", "秒"],
            ["週期時間", f"{d['temporal']['cycle_time']:.2f}", "秒"],
        ]
        t = Table(temporal, colWidths=[120, 80, 60])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#ccc")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("三、支撐期分析", styles["DarkTitle"]))
        support = [
            ["參數", "數值", "單位"],
            ["雙腳支撐期", f"{d['support']['double_support']:.1f}", "%"],
            ["單腳支撐期", f"{d['support']['single_support']:.1f}", "%"],
            ["承重期", f"{d['support']['loading_response']:.1f}", "%"],
            ["擺盪前期", f"{d['support']['pre_swing']:.1f}", "%"],
        ]
        t = Table(support, colWidths=[120, 80, 60])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#ccc")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("四、關節活動度 (ROM)", styles["DarkTitle"]))
        rom = [
            ["關節", "最大", "最小", "平均", "ROM"],
            ["左膝", f"{d['joint']['left_knee']['max']:.1f}°", f"{d['joint']['left_knee']['min']:.1f}°",
             f"{d['joint']['left_knee']['mean']:.1f}°", f"{d['joint']['left_knee']['rom']:.1f}°"],
            ["右膝", f"{d['joint']['right_knee']['max']:.1f}°", f"{d['joint']['right_knee']['min']:.1f}°",
             f"{d['joint']['right_knee']['mean']:.1f}°", f"{d['joint']['right_knee']['rom']:.1f}°"],
            ["左髖", f"{d['joint']['left_hip']['max']:.1f}°", f"{d['joint']['left_hip']['min']:.1f}°",
             f"{d['joint']['left_hip']['mean']:.1f}°", f"{d['joint']['left_hip']['rom']:.1f}°"],
            ["右髖", f"{d['joint']['right_hip']['max']:.1f}°", f"{d['joint']['right_hip']['min']:.1f}°",
             f"{d['joint']['right_hip']['mean']:.1f}°", f"{d['joint']['right_hip']['rom']:.1f}°"],
        ]
        t = Table(rom, colWidths=[60, 50, 50, 50, 50])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#ccc")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("五、跌倒風險評估", styles["DarkTitle"]))
        risk = [
            ["風險類型", "分數", "評估"],
            ["跌倒風險", f"{d['risk']['falling']:.0f}", "高風險≥70, 中風險40-69, 低風險<40"],
            ["功能喪失風險", f"{d['risk']['function_loss']:.0f}", "同上"],
            ["失能風險", f"{d['risk']['disability']:.0f}", "同上"],
        ]
        t = Table(risk, colWidths=[120, 60, 200])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#ccc")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 1 * cm))

        elements.append(Paragraph(f"步態週期數: {d['num_cycles']} | 總持續時間: {d['total_duration']:.1f} 秒",
                                  styles["DarkNormal"]))
        elements.append(Paragraph("本報告由 healthIR 步態分析系統自動產生", styles["DarkNormal"]))
        elements.append(Paragraph("免責聲明：本報告僅供參考，不替代醫療診斷", ParagraphStyle(
            "Disclaimer", fontSize=8, textColor=HexColor("#999"), spaceBefore=10)))

        doc.build(elements)
        return filepath
