import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { THEME } from "../theme";

type HivePoint = {
  hiveId: string;
  hiveName: string;
  temperatureC: number;
  humidityPercent: number;
};

type Props = {
  allHives: HivePoint[];
};

export function AllHivesMetricsChart({ allHives }: Props) {
  const [chartWidth, setChartWidth] = useState(0);
  const [hoveredHive, setHoveredHive] = useState<string | null>(null);
  const CHART_HEIGHT = 280;
  const PAD_LEFT = 50;
  const PAD_RIGHT = 20;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 50;
  const THRESHOLD_TEMP = 34.5;
  const THRESHOLD_HUMIDITY = 65;

  const maxTemp = Math.max(...allHives.map((h) => h.temperatureC), 40);
  const minTemp = Math.min(...allHives.map((h) => h.temperatureC), 25);

  const plotW = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{ height: CHART_HEIGHT, position: "relative" }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <>
            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map((val) => (
              <Text key={`y-label-${val}`} style={{ position: "absolute", right: plotW + PAD_LEFT + 8, top: PAD_TOP + (1 - val / 100) * plotH - 8, width: 35, textAlign: "right", fontSize: 9, color: THEME.textMuted, fontWeight: "500" }}>
                {val}%
              </Text>
            ))}
            <Text style={{ position: "absolute", left: 2, top: PAD_TOP + plotH / 2 - 40, fontSize: 11, fontWeight: "700", color: THEME.textMuted }}>
              Humidity
            </Text>
            {/* X-axis labels */}
            {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((val, idx) => (
              <Text key={`x-label-${idx}`} style={{ position: "absolute", left: PAD_LEFT + (idx / 2) * plotW - 14, bottom: 8, fontSize: 9, color: THEME.textMuted, fontWeight: "500" }}>
                {val.toFixed(0)}°C
              </Text>
            ))}
            <Text style={{ position: "absolute", left: PAD_LEFT + plotW / 2 - 40, bottom: 18, fontSize: 11, fontWeight: "700", color: THEME.textMuted }}>
              Temperature
            </Text>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <React.Fragment key={`grid-${pct}`}>
                <View style={{ position: "absolute", left: PAD_LEFT + pct * plotW, top: PAD_TOP, width: 1, height: plotH, backgroundColor: pct === 0 || pct === 1 ? "#D1D5DB" : "#E5E7EB" }} />
                <View style={{ position: "absolute", left: PAD_LEFT, top: PAD_TOP + pct * plotH, width: plotW, height: 1, backgroundColor: pct === 0 || pct === 1 ? "#D1D5DB" : "#E5E7EB" }} />
              </React.Fragment>
            ))}
            {/* Normal zone */}
            <View style={{ position: "absolute", left: PAD_LEFT, top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH, width: ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW, height: (THRESHOLD_HUMIDITY / 100) * plotH, backgroundColor: "#22C55E", opacity: 0.1, borderWidth: 2, borderColor: "#22C55E", borderStyle: "dashed" }} />
            {/* Threshold lines */}
            <View style={{ position: "absolute", left: PAD_LEFT + ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW, top: PAD_TOP, width: 2, height: plotH, backgroundColor: "#FFB268", opacity: 0.7 }} />
            <View style={{ position: "absolute", left: PAD_LEFT, top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH, width: plotW, height: 2, backgroundColor: "#60A5FA", opacity: 0.7 }} />
            <Text style={{ position: "absolute", left: PAD_LEFT + ((THRESHOLD_TEMP - minTemp) / (maxTemp - minTemp)) * plotW - 18, top: PAD_TOP - 18, fontSize: 8, fontWeight: "700", color: "#FFB268", backgroundColor: "#FFFFFF", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 }}>
              34.5°C
            </Text>
            <Text style={{ position: "absolute", right: PAD_RIGHT, top: PAD_TOP + (1 - THRESHOLD_HUMIDITY / 100) * plotH - 16, fontSize: 8, fontWeight: "700", color: "#60A5FA", backgroundColor: "#FFFFFF", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 }}>
              65%
            </Text>
            {/* Hive dots */}
            {allHives.map((hive) => {
              const x = PAD_LEFT + ((hive.temperatureC - minTemp) / (maxTemp - minTemp)) * plotW;
              const y = PAD_TOP + (1 - hive.humidityPercent / 100) * plotH;
              const isAbnormal = hive.temperatureC > THRESHOLD_TEMP || hive.humidityPercent > THRESHOLD_HUMIDITY;
              const color = isAbnormal ? "#DC2626" : "#22C55E";
              const isHovered = hoveredHive === hive.hiveId;
              return (
                <React.Fragment key={hive.hiveId}>
                  <Pressable
                    onPress={() => setHoveredHive(hive.hiveName)}
                    onHoverIn={() => setHoveredHive(hive.hiveName)}
                    onHoverOut={() => setHoveredHive(null)}
                    style={{ position: "absolute", left: x - 12, top: y - 12, width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" }}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 3, borderColor: "#FFFFFF" }} />
                  </Pressable>
                  {isHovered && (
                    <View style={{ position: "absolute", left: x - 30, top: y - 50, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: color, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF", textAlign: "center" }}>{hive.hiveId}</Text>
                      <Text style={{ fontSize: 9, color: "#FFFFFF", marginTop: 2 }}>{hive.temperatureC.toFixed(1)}°C / {hive.humidityPercent.toFixed(0)}%</Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </View>

      {/* Summary */}
      <View style={{ marginTop: 16, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#ECFDF5", borderRadius: 6 }}>
            <Text style={{ fontSize: 9, color: THEME.textMuted, fontWeight: "600" }}>Healthy</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#22C55E", marginTop: 4 }}>
              {allHives.filter((h) => h.temperatureC <= THRESHOLD_TEMP && h.humidityPercent <= THRESHOLD_HUMIDITY).length}
            </Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#FCE7E7", borderRadius: 6 }}>
            <Text style={{ fontSize: 9, color: THEME.textMuted, fontWeight: "600" }}>At Risk</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#DC2626", marginTop: 4 }}>
              {allHives.filter((h) => h.temperatureC > THRESHOLD_TEMP || h.humidityPercent > THRESHOLD_HUMIDITY).length}
            </Text>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "#F0F4F8", borderRadius: 6 }}>
            <Text style={{ fontSize: 9, color: THEME.textMuted, fontWeight: "600" }}>Total</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: THEME.primary, marginTop: 4 }}>{allHives.length}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
