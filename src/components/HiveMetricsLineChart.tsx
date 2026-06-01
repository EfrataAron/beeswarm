import React, { useState } from "react";
import { Text, View } from "react-native";
import { THEME } from "../theme";

const THRESHOLD_TEMP = 34.5;

export function HiveMetricsLineChart({
  metricSeries,
  hiveId,
}: {
  metricSeries: Array<{
    timeLabel: string;
    temperatureC: number;
    humidityPercent: number;
  }>;
  hiveId: string;
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const CHART_HEIGHT = 160;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 26;
  const PAD_LEFT = 36;
  const PAD_RIGHT = 12;

  if (metricSeries.length === 0) {
    return (
      <Text style={{ textAlign: "center", color: THEME.textMuted }}>
        No data available
      </Text>
    );
  }

  const tempValues = metricSeries.map((p) => p.temperatureC);
  const humidityValues = metricSeries.map((p) => p.humidityPercent);
  const maxTemp = Math.max(...tempValues, THRESHOLD_TEMP + 5, 40);
  const minTemp = Math.min(...tempValues, THRESHOLD_TEMP - 5, 25);
  const maxHumidity = Math.max(...humidityValues, 100);
  const minHumidity = Math.min(...humidityValues, 0);

  const avgTemp = tempValues.reduce((a, b) => a + b) / tempValues.length;
  const avgHumidity =
    humidityValues.reduce((a, b) => a + b) / humidityValues.length;
  const maxTempVal = Math.max(...tempValues);
  const minTempVal = Math.min(...tempValues);
  const maxHumidityVal = Math.max(...humidityValues);
  const minHumidityVal = Math.min(...humidityValues);

  const n = metricSeries.length;
  const plotW = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const tempPts = metricSeries.map((d, i) => ({
    x: PAD_LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
    y: PAD_TOP + ((maxTemp - d.temperatureC) / (maxTemp - minTemp)) * plotH,
    label: d.timeLabel,
    value: d.temperatureC,
  }));

  const humidityPts = metricSeries.map((d, i) => ({
    x: PAD_LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
    y:
      PAD_TOP +
      ((maxHumidity - d.humidityPercent) / (maxHumidity - minHumidity)) *
        plotH,
    label: d.timeLabel,
    value: d.humidityPercent,
  }));

  const thresholdY =
    PAD_TOP + ((maxTemp - THRESHOLD_TEMP) / (maxTemp - minTemp)) * plotH;

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{ height: CHART_HEIGHT, position: "relative" }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <>
            {/* Y-axis labels (Temperature) */}
            {[0, 0.5, 1].map((pct) => {
              const tempVal = minTemp + (1 - pct) * (maxTemp - minTemp);
              return (
                <Text
                  key={`y-temp-${pct}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: PAD_TOP + pct * plotH - 8,
                    width: 32,
                    textAlign: "right",
                    fontSize: 9,
                    color: THEME.textMuted,
                    fontWeight: "600",
                  }}
                >
                  {tempVal.toFixed(0)}°
                </Text>
              );
            })}

            {/* Grid lines */}
            {[0, 0.5, 1].map((pct) => (
              <View
                key={`grid-${pct}`}
                style={{
                  position: "absolute",
                  left: PAD_LEFT,
                  top: PAD_TOP + pct * plotH,
                  width: plotW,
                  height: 1,
                  backgroundColor:
                    pct === 0 || pct === 1 ? "#E2E8F0" : "#F1F5F9",
                }}
              />
            ))}

            {/* Y-axis line */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: PAD_TOP,
                width: 1,
                height: plotH,
                backgroundColor: "#CBD5E1",
              }}
            />

            {/* Threshold line */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: thresholdY,
                width: plotW,
                height: 2,
                backgroundColor: "#22C55E",
                opacity: 0.6,
              }}
            />

            {/* Temperature line segments */}
            {tempPts.slice(0, -1).map((p, i) => {
              const q = tempPts[i + 1];
              const dx = q.x - p.x;
              const dy = q.y - p.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`temp-line-${i}`}
                  style={{
                    position: "absolute",
                    left: (p.x + q.x) / 2 - len / 2,
                    top: (p.y + q.y) / 2 - 1.5,
                    width: len,
                    height: 3,
                    backgroundColor: THEME.accent,
                    borderRadius: 1.5,
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
              );
            })}

            {/* Humidity line segments */}
            {humidityPts.slice(0, -1).map((p, i) => {
              const q = humidityPts[i + 1];
              const dx = q.x - p.x;
              const dy = q.y - p.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`humidity-line-${i}`}
                  style={{
                    position: "absolute",
                    left: (p.x + q.x) / 2 - len / 2,
                    top: (p.y + q.y) / 2 - 1.5,
                    width: len,
                    height: 3,
                    backgroundColor: THEME.primary,
                    borderRadius: 1.5,
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
              );
            })}

            {/* Temperature dots */}
            {tempPts.map((p, i) => (
              <View
                key={`temp-dot-${i}`}
                style={{
                  position: "absolute",
                  left: p.x - 5,
                  top: p.y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: THEME.accent,
                  borderWidth: 2.5,
                  borderColor: "#FFFFFF",
                  shadowColor: THEME.accent,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              />
            ))}

            {/* Humidity dots */}
            {humidityPts.map((p, i) => (
              <View
                key={`humidity-dot-${i}`}
                style={{
                  position: "absolute",
                  left: p.x - 5,
                  top: p.y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: THEME.primary,
                  borderWidth: 2.5,
                  borderColor: "#FFFFFF",
                  shadowColor: THEME.primary,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              />
            ))}

            {/* Time labels */}
            {tempPts.map((p, i) => (
              <Text
                key={`time-label-${i}`}
                style={{
                  position: "absolute",
                  left: p.x - 16,
                  top: PAD_TOP + plotH + 6,
                  width: 32,
                  textAlign: "center",
                  fontSize: 7,
                  color: THEME.textMuted,
                  fontWeight: "600",
                }}
              >
                {p.label}
              </Text>
            ))}

            {/* Threshold label */}
            <Text
              style={{
                position: "absolute",
                left: PAD_LEFT + 4,
                top: thresholdY - 14,
                fontSize: 8,
                fontWeight: "700",
                color: "#22C55E",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              Normal: {THRESHOLD_TEMP}°C
            </Text>
          </>
        )}
      </View>

      {/* Stats below chart */}
      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: 8,
              paddingVertical: 8,
              backgroundColor: "#FFF8F3",
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>
              Temperature
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              {[
                { label: "Min", val: `${minTempVal.toFixed(1)}°` },
                { label: "Avg", val: `${avgTemp.toFixed(1)}°` },
                { label: "Max", val: `${maxTempVal.toFixed(1)}°` },
              ].map(({ label, val }) => (
                <View key={label}>
                  <Text style={{ fontSize: 8, color: THEME.textMuted }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: THEME.accent }}>{val}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={{
              flex: 1,
              paddingHorizontal: 8,
              paddingVertical: 8,
              backgroundColor: "#F0F4F8",
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>
              Humidity
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              {[
                { label: "Min", val: `${minHumidityVal.toFixed(0)}%` },
                { label: "Avg", val: `${avgHumidity.toFixed(0)}%` },
                { label: "Max", val: `${maxHumidityVal.toFixed(0)}%` },
              ].map(({ label, val }) => (
                <View key={label}>
                  <Text style={{ fontSize: 8, color: THEME.textMuted }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: THEME.primary }}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
