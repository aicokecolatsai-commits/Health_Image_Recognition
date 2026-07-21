from analysis.gait_analyzer import GaitRisk


class RiskCalculator:
    @staticmethod
    def calculate_all(stride_length_m: float, height_m: float) -> GaitRisk:
        r = GaitRisk()
        r.falling = RiskCalculator._falling_risk(stride_length_m, height_m)
        r.function_loss = RiskCalculator._function_loss_risk(stride_length_m, height_m)
        r.disability = RiskCalculator._disability_risk(stride_length_m, height_m)
        return r

    @staticmethod
    def _falling_risk(stride_length_m: float, height_m: float) -> float:
        if height_m <= 0:
            return 0.0
        ratio = stride_length_m / height_m
        if ratio <= 0.3:
            return 90.0
        elif ratio <= 0.5:
            return 90.0 - (ratio - 0.3) / 0.2 * 50.0
        elif ratio <= 0.7:
            return 40.0 - (ratio - 0.5) / 0.2 * 30.0
        else:
            return max(0, 10.0 - (ratio - 0.7) / 0.2 * 10.0)

    @staticmethod
    def _function_loss_risk(stride_length_m: float, height_m: float) -> float:
        if height_m <= 0:
            return 0.0
        ratio = stride_length_m / height_m
        if ratio <= 0.35:
            return 85.0
        elif ratio <= 0.55:
            return 85.0 - (ratio - 0.35) / 0.2 * 45.0
        elif ratio <= 0.75:
            return 40.0 - (ratio - 0.55) / 0.2 * 30.0
        else:
            return max(0, 10.0 - (ratio - 0.75) / 0.2 * 10.0)

    @staticmethod
    def _disability_risk(stride_length_m: float, height_m: float) -> float:
        if height_m <= 0:
            return 0.0
        ratio = stride_length_m / height_m
        if ratio <= 0.3:
            return 95.0
        elif ratio <= 0.5:
            return 95.0 - (ratio - 0.3) / 0.2 * 55.0
        elif ratio <= 0.7:
            return 40.0 - (ratio - 0.5) / 0.2 * 30.0
        else:
            return max(0, 10.0 - (ratio - 0.7) / 0.2 * 10.0)