const PM25_BREAKPOINTS = [
  { C_low: 0, C_high: 12, I_low: 0, I_high: 50 },
  { C_low: 12.1, C_high: 35.4, I_low: 51, I_high: 100 },
  { C_low: 35.5, C_high: 55.4, I_low: 101, I_high: 150 },
  { C_low: 55.5, C_high: 150.4, I_low: 151, I_high: 200 },
  { C_low: 150.5, C_high: 250.4, I_low: 201, I_high: 300 },
  { C_low: 250.5, C_high: 500.4, I_low: 301, I_high: 500 },
];

const PM10_BREAKPOINTS = [
  { C_low: 0, C_high: 54, I_low: 0, I_high: 50 },
  { C_low: 55, C_high: 154, I_low: 51, I_high: 100 },
  { C_low: 155, C_high: 254, I_low: 101, I_high: 150 },
  { C_low: 255, C_high: 354, I_low: 151, I_high: 200 },
  { C_low: 355, C_high: 424, I_low: 201, I_high: 300 },
  { C_low: 425, C_high: 604, I_low: 301, I_high: 500 },
];

const calculateSubIndex = (concentration, breakpoints) => {
  const value = Number(concentration);
  if (!Number.isFinite(value) || value < 0) return null;

  for (const bp of breakpoints) {
    if (bp.C_low <= value && value <= bp.C_high) {
      return Math.round(
        ((bp.I_high - bp.I_low) / (bp.C_high - bp.C_low)) * (value - bp.C_low) + bp.I_low
      );
    }
  }

  return null;
};

export const calculateAQIFromComponents = (components = {}) => {
  const aqiPm25 = calculateSubIndex(components.pm2_5, PM25_BREAKPOINTS);
  const aqiPm10 = calculateSubIndex(components.pm10, PM10_BREAKPOINTS);
  const candidates = [aqiPm25, aqiPm10].filter((value) => Number.isFinite(value));

  if (!candidates.length) return null;
  return Math.max(...candidates);
};

export const getAQIMetadata = (aqi) => {
  const value = Number(aqi);
  if (!Number.isFinite(value)) {
    return {
      label: "Unknown",
      variant: "default",
      color: "#64748B",
    };
  }

  if (value < 50) {
    return { label: "Good", variant: "good", color: "#10B981" };
  }

  if (value < 100) {
    return { label: "Moderate", variant: "moderate", color: "#FBBF24" };
  }

  if (value < 150) {
    return { label: "Unhealthy", variant: "unhealthy", color: "#F59E0B" };
  }

  return { label: "Very Unhealthy", variant: "very-unhealthy", color: "#EF4444" };
};

export const getAQIRecommendation = (aqi) => {
  const value = Number(aqi);
  if (!Number.isFinite(value)) {
    return "AQI data is unavailable right now. Please retry in a moment.";
  }

  if (value < 50) {
    return "Air quality is good. Maintain greenery and reduce vehicle emissions.";
  }

  if (value < 100) {
    return "Moderate air quality. Sensitive groups should limit long outdoor exertion.";
  }

  if (value < 150) {
    return "Unhealthy air quality. Children, elders, and people with lung disease should reduce exposure.";
  }

  return "Very unhealthy air quality. Avoid prolonged outdoor activities and use protective masks.";
};
