import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { THEME } from "../theme";

const THRESHOLD_TEMP = 34.5;
const THRESHOLD_HUMIDITY = 65;

export function AllHivesMetricsChart({
  allHives,
}: {
  allHives: Array<{
    hiveId: string;
    temperatureC: number;
    humidityPercent: number;
  }>;
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const [hoveredHive, setHoveredHive] = useState<string | null>(null);
  const CHART_HEIGHT = 280;
  const PAD_LEFT = 50;
  const PAD_RIGHT = 20;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 50;

  const maxTemp = Math.max(...allHives.map((h) => h.temperatureC), 40);
  const minTemp = Math.min(...allHives.map((h) => h.temperatureC), 25);

  const plotW = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const normalCount = allHives.filter(
    (h) =>
      h.temperatureC <= THRESHOLD_TEMP &&
      h.humidityPercent <= THRESHOLD_HUMIDITY,
  ).length;
  const atRiskCount = allHives.filter(
    (h) =>
      h.temperatureC > THRESHOLD_TEMP ||
      h.humidityPercent > THRESHOLD_HUMIDITY,
  ).length;

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{ height: CHART_HEIGHT, position: "relative" }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <>
            {/* Y-axis labels (Humidity %) */}
            {[0, 25, 50, 75, 100].map((val) => (
              <Text
                key={`y-label-${val}`}
                style={{
                  position: "absolute",
                  right: plotW + PAD_LEFT + 8,
                  top: PAD_TOP + (1 - val / 100) * plotH - 8,
                  width: 35,
                  textAlign: "right",
                  fontSize: 9,
                  color: THEME.textMuted,
                  fontWeight: "500",
                }}
              >
                {val}%
              </Text>
            ))}

            {/* Y-axis title */}
            <Text
              style={{
                position: "absolute",
                left: 2,
                top: PAD_TOP + plotH / 2 - 40,
                fontSize: 11,
                fontWeight: "700",
                color: THEME.textMuted,
                transform: [{ rotate: "-90deg" }],
                width: 80,
                textAlign: "center",
              }}
            >
              Humidity
            </Text>

            {/* X-axis labels (Temperature °C) */}
            {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((val, idx) => (
              <Text
                key={`x-label-${idx}`}
                style={{
                  position: "absolute",
                  left: PAD_LEFT + (idx / 2) * plotW - 14,
                  bottom: 8,
                  fontSize: 9,
                  color: THEME.textMuted,
                  fontWeight: "500",
                }}
              >
                {val.toFixed(0)}°C
              </Text>
            ))}

            {/* X-axis title */}
            <Text
              style={{
                position: "absolute",
                left: PAD_LEFT + plotW / 2 - 40,
                bottom: 18,
                fontSize: 11,
                fontWeight: "700",
                color: THEME.textMuted,
              }}
            >
              Temperature
            </Text>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <React.Fragment key={`grid-${pct}`}>
                <View
                  style={{
                    position: "absolute",
                    left: PAD_LEFT + pct * plotW,
                    top: PAD_TOP,
                    width: 1,
                    height: plotH,
                    backgroundColor:
                      pct === 0 || pct === 1 ? "#D1D5DB" : "#E5E7EB",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: PAD_LEFT,
                    top: PAD_TOP + pct * plotH,
                    width: plotW,
                    height: 1,
                    backgroundColor:
                      pct === 0 || pct === 1 ? "#D1D5DB" : "#E5E7EB",
                  }}
                />
              </React.Fragment>
            ))}

            {/* Normal zone shaded area */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH,
                width:
                  ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW,
                height: (THRESHOLD_HUMIDITY / 100) * plotH,
                backgroundColor: "#22C55E",
                opacity: 0.1,
                borderWidth: 2,
                borderColor: "#22C55E",
                borderStyle: "dashed",
              }}
            />

            {/* Temperature threshold line */}
            <View
              style={{
                position: "absolute",
                left:
                  PAD_LEFT +
                  ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW,
                top: PAD_TOP,
                width: 2,
                height: plotH,
                backgroundColor: "#FFB268",
                opacity: 0.7,
              }}
            />

            {/* Humidity threshold line */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH,
                width: plotW,
                height: 2,
                backgroundColor: "#60A5FA",
                opacity: 0.7,
              }}
            />

            {/* Threshold labels */}
            <Text
              style={{
                position: "absolute",
                left:
                  PAD_LEFT +
                  ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW -
                  18,
                top: PAD_TOP - 18,
                fontSize: 8,
                fontWeight: "700",
                color: "#FFB268",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 3,
              }}
            >
              34.5°C
            </Text>

            <Text
              style={{
                position: "absolute",
                right: PAD_RIGHT,
                top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH - 16,
                fontSize: 8,
                fontWeight: "700",
                color: "#60A5FA",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 3,
              }}
            >
              65%
            </Text>

            {/* Hive dots */}
            {allHives.map((hive) => {
              const x =
                PAD_LEFT +
                ((hive.temperatureC - minTemp) / (maxTemp - minTemp)) * plotW;
              const y = PAD_TOP + (1 - hive.humidityPercent / 100) * plotH;
              const isAbnormal =
                hive.temperatureC > THRESHOLD_TEMP ||
                hive.humidityPercent > THRESHOLD_HUMIDITY;
              const color = isAbnormal ? "#DC2626" : "#22C55E";
              const isHovered = hoveredHive === hive.hiveId;

              return (
                <React.Fragment key={hive.hiveId}>
                  <Pressable
                    onPress={() => setHoveredHive(hive.hiveId)}
                    onHoverIn={() => setHoveredHive(hive.hiveId)}
                    onHoverOut={() => setHoveredHive(null)}
                    style={{
                      position: "absolute",
                      left: x - 12,
                      top: y - 12,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: color,
                        borderWidth: 3,
                        borderColor: "#FFFFFF",
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.5,
                        shadowRadius: 3,
                        elevation: 4,
                      }}
                    />
                  </Pressable>

                  {isHovered && (
                    <View
                      style={{
                        position: "absolute",
                        left: x - 30,
                        top: y - 50,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: color,
                        borderRadius: 6,
                        shadowColor: "#000000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        elevation: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#FFFFFF",
                          textAlign: "center",
                        }}
                      >
                        {hive.hiveId}
                      </Text>
                      <Text style={{ fontSize: 9, color: "#FFFFFF", marginTop: 2 }}>
                        {hive.temperatureC.toFixed(1)}°C /{" "}
                        {hive.humidityPercent.toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </View>

      {/* Legend */}
      <View style={{ marginTop: 16, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
          {[
            { color: "#22C55E", label: "Normal" },
            { color: "#DC2626", label: "Abnormal" },
          ].map(({ color, label }) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              />
              <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>
                {label}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderWidth: 1.5,
                borderColor: "#22C55E",
                borderStyle: "dashed",
              }}
            />
            <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>
              Normal Zone
            </Text>
          </View>
        </View>

        {/* Summary stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Healthy", count: normalCount, color: "#22C55E", bg: "#ECFDF5" },
            { label: "At Risk", count: atRiskCount, color: "#DC2626", bg: "#FCE7E7" },
            { label: "Total", count: allHives.length, color: THEME.primary, bg: "#F0F4F8" },
          ].map(({ label, count, color, bg }) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingVertical: 10,
                backgroundColor: bg,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 9, color: THEME.textMuted, fontWeight: "600" }}>
                {label}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color, marginTop: 4 }}>
                {count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
