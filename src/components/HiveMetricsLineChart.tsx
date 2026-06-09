// import React, { useState } from "react";
// import { Text, View } from "react-native";
// import { THEME } from "../theme";

// type MetricPoint = {
//   timeLabel: string;
//   temperatureC: number;
//   humidityPercent: number;
// };

// type Props = {
//   metricSeries: MetricPoint[];
//   hiveId: string;
// };

// export function HiveMetricsLineChart({ metricSeries, hiveId: _hiveId }: Props) {
//   const [chartWidth, setChartWidth] = useState(0);
//   const CHART_HEIGHT = 160;
//   const PAD_TOP = 16;
//   const PAD_BOTTOM = 26;
//   const PAD_LEFT = 36;
//   const PAD_RIGHT = 12;
//   const THRESHOLD_TEMP = 34.5;

//   if (metricSeries.length === 0) {
//     return <Text style={{ textAlign: "center", color: THEME.textMuted }}>No data available</Text>;
//   }

//   const tempValues = metricSeries.map((p) => p.temperatureC);
//   const humidityValues = metricSeries.map((p) => p.humidityPercent);
//   const maxTemp = Math.max(...tempValues, THRESHOLD_TEMP + 5, 40);
//   const minTemp = Math.min(...tempValues, THRESHOLD_TEMP - 5, 25);
//   const maxHumidity = Math.max(...humidityValues, 100);
//   const minHumidity = Math.min(...humidityValues, 0);

//   const avgTemp = tempValues.reduce((a, b) => a + b) / tempValues.length;
//   const avgHumidity = humidityValues.reduce((a, b) => a + b) / humidityValues.length;
//   const maxTempVal = Math.max(...tempValues);
//   const minTempVal = Math.min(...tempValues);
//   const maxHumidityVal = Math.max(...humidityValues);
//   const minHumidityVal = Math.min(...humidityValues);

//   const n = metricSeries.length;
//   const plotW = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
//   const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

//   const tempPts = metricSeries.map((d, i) => ({
//     x: PAD_LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
//     y: PAD_TOP + ((maxTemp - d.temperatureC) / (maxTemp - minTemp)) * plotH,
//     label: d.timeLabel,
//     value: d.temperatureC,
//   }));

//   const humidityPts = metricSeries.map((d, i) => ({
//     x: PAD_LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
//     y: PAD_TOP + ((maxHumidity - d.humidityPercent) / (maxHumidity - minHumidity)) * plotH,
//     label: d.timeLabel,
//     value: d.humidityPercent,
//   }));

//   const thresholdY = PAD_TOP + ((maxTemp - THRESHOLD_TEMP) / (maxTemp - minTemp)) * plotH;

//   return (
//     <View style={{ marginTop: 12 }}>
//       <View
//         style={{ height: CHART_HEIGHT, position: "relative" }}
//         onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
//       > 
//         {chartWidth > 0 && (
//           <>
//             {[0, 0.5, 1].map((pct) => {
//               const tempVal = minTemp + (1 - pct) * (maxTemp - minTemp);
//               return (
//                 <Text
//                   key={`y-temp-${pct}`}
//                   style={{ position: "absolute", left: 0, top: PAD_TOP + pct * plotH - 8, width: 32, textAlign: "right", fontSize: 9, color: THEME.textMuted, fontWeight: "600" }}
//                 >
//                   {tempVal.toFixed(0)}°
//                 </Text>
//               );
//             })}
//             {[0, 0.5, 1].map((pct) => (
//               <View key={`grid-${pct}`} style={{ position: "absolute", left: PAD_LEFT, top: PAD_TOP + pct * plotH, width: plotW, height: 1, backgroundColor: pct === 0 || pct === 1 ? "#E2E8F0" : "#F1F5F9" }} />
//             ))}
//             <View style={{ position: "absolute", left: PAD_LEFT, top: PAD_TOP, width: 1, height: plotH, backgroundColor: "#CBD5E1" }} />
//             <View style={{ position: "absolute", left: PAD_LEFT, top: thresholdY, width: plotW, height: 2, backgroundColor: "#22C55E", opacity: 0.6 }} />

//             {/* Temperature line */}
//             {tempPts.slice(0, -1).map((p, i) => {
//               const q = tempPts[i + 1];
//               const dx = q.x - p.x; const dy = q.y - p.y;
//               const len = Math.sqrt(dx * dx + dy * dy);
//               const angle = Math.atan2(dy, dx) * (180 / Math.PI);
//               return <View key={`temp-line-${i}`} style={{ position: "absolute", left: (p.x + q.x) / 2 - len / 2, top: (p.y + q.y) / 2 - 1.5, width: len, height: 3, backgroundColor: THEME.accent, borderRadius: 1.5, transform: [{ rotate: `${angle}deg` }] }} />;
//             })}
//             {/* Humidity line */}
//             {humidityPts.slice(0, -1).map((p, i) => {
//               const q = humidityPts[i + 1];
//               const dx = q.x - p.x; const dy = q.y - p.y;
//               const len = Math.sqrt(dx * dx + dy * dy);
//               const angle = Math.atan2(dy, dx) * (180 / Math.PI);
//               return <View key={`humidity-line-${i}`} style={{ position: "absolute", left: (p.x + q.x) / 2 - len / 2, top: (p.y + q.y) / 2 - 1.5, width: len, height: 3, backgroundColor: THEME.primary, borderRadius: 1.5, transform: [{ rotate: `${angle}deg` }] }} />;
//             })}
//             {/* Temperature dots */}
//             {tempPts.map((p, i) => <View key={`temp-dot-${i}`} style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.accent, borderWidth: 2.5, borderColor: "#FFFFFF" }} />)}
//             {/* Humidity dots */}
//             {humidityPts.map((p, i) => <View key={`humidity-dot-${i}`} style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.primary, borderWidth: 2.5, borderColor: "#FFFFFF" }} />)}
//             {/* Time labels */}
//             {tempPts.map((p, i) => (
//               <Text key={`time-label-${i}`} style={{ position: "absolute", left: p.x - 16, top: PAD_TOP + plotH + 6, width: 32, textAlign: "center", fontSize: 7, color: THEME.textMuted, fontWeight: "600" }}>{p.label}</Text>
//             ))}
//             <Text style={{ position: "absolute", left: PAD_LEFT + 4, top: thresholdY - 14, fontSize: 8, fontWeight: "700", color: "#22C55E", backgroundColor: "#FFFFFF", paddingHorizontal: 6, paddingVertical: 2 }}>
//               Normal: {THRESHOLD_TEMP}°C
//             </Text>
//           </>
//         )}
//       </View>

//       {/* Statistics below chart */}
//       {/* <View style={{ marginTop: 12 }}>
//         <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
//           <View style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#FFF8F3", borderRadius: 6 }}>
//             <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>Temperature</Text>
//             <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Min</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.accent }}>{minTempVal.toFixed(1)}°</Text></View>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Avg</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.accent }}>{avgTemp.toFixed(1)}°</Text></View>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Max</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.accent }}>{maxTempVal.toFixed(1)}°</Text></View>
//             </View>
//           </View>
//           <View style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#F0F4F8", borderRadius: 6 }}>
//             <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>Humidity</Text>
//             <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Min</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.primary }}>{minHumidityVal.toFixed(0)}%</Text></View>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Avg</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.primary }}>{avgHumidity.toFixed(0)}%</Text></View>
//               <View><Text style={{ fontSize: 8, color: THEME.textMuted }}>Max</Text><Text style={{ fontSize: 12, fontWeight: "700", color: THEME.primary }}>{maxHumidityVal.toFixed(0)}%</Text></View>
//             </View>
//           </View>
//         </View>
//       </View> */}
//     </View>
//   );
// }



import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { THEME } from "../theme";

type MetricPoint = {
  timeLabel: string;
  temperatureC: number;
  humidityPercent: number;
};

type Props = {
  metricSeries: MetricPoint[];
  hiveId: string;
};

export function HiveMetricsLineChart({
  metricSeries,
  hiveId: _hiveId,
}: Props) {
  const [chartWidth, setChartWidth] = useState(0);

  const [selectedPoint, setSelectedPoint] = useState<{
    x: number;
    y: number;
    value: number;
    label: string;
    type: string;
  } | null>(null);

  const CHART_HEIGHT = 220;

  const PAD_TOP = 16;
  const PAD_BOTTOM = 32;
  const PAD_LEFT = 36;
  const PAD_RIGHT = 12;

  const THRESHOLD_TEMP = 24.0;
  const THRESHOLD_HUMIDITY = 60;


  if (metricSeries.length === 0) {
    return (
      <Text
        style={{
          textAlign: "center",
          color: THEME.textMuted,
        }}
      >
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

  const n = metricSeries.length;

  const plotW = Math.max(
    chartWidth - PAD_LEFT - PAD_RIGHT,
    1
  );

  const plotH =
    CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const tempPts = metricSeries.map((d, i) => ({
    x:
      PAD_LEFT +
      (n > 1
        ? (i / (n - 1)) * plotW
        : plotW / 2),
    y:
      PAD_TOP +
      ((maxTemp - d.temperatureC) /
        (maxTemp - minTemp)) *
        plotH,
    label: d.timeLabel,
    value: d.temperatureC,
  }));

  const humidityPts = metricSeries.map((d, i) => ({
    x:
      PAD_LEFT +
      (n > 1
        ? (i / (n - 1)) * plotW
        : plotW / 2),
    y:
      PAD_TOP +
      ((maxHumidity - d.humidityPercent) /
        (maxHumidity - minHumidity)) *
        plotH,
    label: d.timeLabel,
    value: d.humidityPercent,
  }));

  const thresholdY =
    PAD_TOP +
    ((maxTemp - THRESHOLD_TEMP) /
      (maxTemp - minTemp)) *
    plotH;
  
  const humidityThresholdY =
  PAD_TOP +
  ((maxHumidity - THRESHOLD_HUMIDITY) /
    (maxHumidity - minHumidity)) *
    plotH;

  return (
    <View style={{ marginTop: 12 }}>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 12,
          color: THEME.text,
        }}
      >
        Hive Temperature & Humidity Trends
      </Text>

  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 12,
    }}
  >
    <Text style={{ color: THEME.accent }}>
      ● Temperature
    </Text>

    <Text style={{ color: THEME.primary }}>
      ● Humidity
    </Text>

    <Text style={{ color: "#22C55E" }}>
      ─ Temp Threshold
    </Text>

    <Text style={{ color: "#3B82F6" }}>
      ─ Humidity Threshold
    </Text>
  </View>
      <View
        style={{
          height: CHART_HEIGHT,
          position: "relative",
        }}
        onLayout={(e) =>
          setChartWidth(
            e.nativeEvent.layout.width
          )
        }
      >
        {chartWidth > 0 && (
          <>
            {/* Y Axis Labels */}
            {[0, 0.5, 1].map((pct) => {
              const tempVal =
                minTemp +
                (1 - pct) *
                  (maxTemp - minTemp);

              return (
                <Text
                  key={`y-${pct}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top:
                      PAD_TOP +
                      pct * plotH -
                      8,
                    width: 32,
                    textAlign: "right",
                    fontSize: 10,
                    color: THEME.textMuted,
                    fontWeight: "600",
                  }}
                >
                  {tempVal.toFixed(0)}°
                </Text>
              );
            })}

            {/* Humidity Axis Labels */}
            {[0, 0.5, 1].map((pct) => {
              const humidityVal =
                minHumidity +
                (1 - pct) *
                  (maxHumidity - minHumidity);

              return (
                <Text
                  key={`humidity-axis-${pct}`}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: PAD_TOP + pct * plotH - 8,
                    width: 32,
                    textAlign: "left",
                    fontSize: 10,
                    color: THEME.primary,
                    fontWeight: "600",
                  }}
                >
                  {humidityVal.toFixed(0)}%
                </Text>
              );
            })}

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(
              (pct) => (
                <View
                  key={`grid-${pct}`}
                  style={{
                    position: "absolute",
                    left: PAD_LEFT,
                    top:
                      PAD_TOP +
                      pct * plotH,
                    width: plotW,
                    height: 1,
                    backgroundColor:
                      "#EDF2F7",
                  }}
                />
              )
            )}

            {/* Axis */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: PAD_TOP,
                width: 1,
                height: plotH,
                backgroundColor:
                  "#CBD5E1",
              }}
            
            />

            {/* Threshold Line */}
            <Pressable
              onPress={() =>
                setSelectedPoint({
                  x:
                    PAD_LEFT +
                    plotW / 2,
                  y: thresholdY,
                  value:
                    THRESHOLD_TEMP,
                  label:
                    "Normal Threshold",
                  type: "Threshold",
                })
              }
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: thresholdY - 4,
                width: plotW,
                height: 8,
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: 2,
                  backgroundColor:
                    "#22C55E",
                  opacity: 0.7,
                }}
              />
            </Pressable>

            {/* Humidity Threshold */}
            <Pressable
              onPress={() =>
                setSelectedPoint({
                  x: PAD_LEFT + plotW / 2,
                  y: humidityThresholdY,
                  value: THRESHOLD_HUMIDITY,
                  label: "Normal Humidity",
                  type: "Humidity Threshold",
                })
              }
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: humidityThresholdY - 4,
                width: plotW,
                height: 8,
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: 2,
                  backgroundColor: "#3B82F6",
                  opacity: 0.5,
                }}
              />
            </Pressable>

            {/* Temperature Line */}
            {tempPts
              .slice(0, -1)
              .map((p, i) => {
                const q =
                  tempPts[i + 1];

                const dx =
                  q.x - p.x;

                const dy =
                  q.y - p.y;

                const len =
                  Math.sqrt(
                    dx * dx +
                      dy * dy
                  );

                const angle =
                  Math.atan2(
                    dy,
                    dx
                  ) *
                  (180 / Math.PI);

                return (
                  <View
                    key={`temp-line-${i}`}
                    style={{
                      position:
                        "absolute",
                      left:
                        (p.x +
                          q.x) /
                          2 -
                        len / 2,
                      top:
                        (p.y +
                          q.y) /
                          2 -
                        2,
                      width: len,
                      height: 4,
                      backgroundColor:
                        THEME.accent,
                      borderRadius:
                        2,
                      transform: [
                        {
                          rotate: `${angle}deg`,
                        },
                      ],
                    }}
                  />
                );
              })}

            {/* Humidity Line */}
            {humidityPts
              .slice(0, -1)
              .map((p, i) => {
                const q =
                  humidityPts[
                    i + 1
                  ];

                const dx =
                  q.x - p.x;

                const dy =
                  q.y - p.y;

                const len =
                  Math.sqrt(
                    dx * dx +
                      dy * dy
                  );

                const angle =
                  Math.atan2(
                    dy,
                    dx
                  ) *
                  (180 / Math.PI);

                return (
                  <View
                    key={`humidity-line-${i}`}
                    style={{
                      position:
                        "absolute",
                      left:
                        (p.x +
                          q.x) /
                          2 -
                        len / 2,
                      top:
                        (p.y +
                          q.y) /
                          2 -
                        2,
                      width: len,
                      height: 4,
                      backgroundColor:
                        THEME.primary,
                      borderRadius:
                        2,
                      transform: [
                        {
                          rotate: `${angle}deg`,
                        },
                      ],
                    }}
                  />
                );
              })}

            {/* Temperature Dots */}
            {tempPts.map((p, i) => (
              <Pressable
                key={`temp-dot-${i}`}
                onPress={() =>
                  setSelectedPoint({
                    x: p.x,
                    y: p.y,
                    value: p.value,
                    label:
                      p.label,
                    type:
                      "Temperature",
                  })
                }
                style={{
                  position:
                    "absolute",
                  left: p.x - 7,
                  top: p.y - 7,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor:
                    THEME.accent,
                  borderWidth: 2,
                  borderColor:
                    "#FFF",
                }}
              />
            ))}

            {/* Humidity Dots */}
            {humidityPts.map((p, i) => (
              <Pressable
                key={`humidity-dot-${i}`}
                onPress={() =>
                  setSelectedPoint({
                    x: p.x,
                    y: p.y,
                    value: p.value,
                    label:
                      p.label,
                    type:
                      "Humidity",
                  })
                }
                style={{
                  position:
                    "absolute",
                  left: p.x - 7,
                  top: p.y - 7,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor:
                    THEME.primary,
                  borderWidth: 2,
                  borderColor:
                    "#FFF",
                }}
              />
            ))}

            {/* Time Labels */}
            {tempPts.map((p, i) => (
              <Text
                key={`label-${i}`}
                style={{
                  position:
                    "absolute",
                  left:
                    p.x - 18,
                  top:
                    PAD_TOP +
                    plotH +
                    6,
                  width: 36,
                  textAlign:
                    "center",
                  fontSize: 9,
                  color:
                    THEME.textMuted,
                  fontWeight:
                    "600",
                }}
              >
                {p.label}
              </Text>
            ))}

            {/* Threshold Label */}
            <Text
              style={{
                position:
                  "absolute",
                left:
                  PAD_LEFT + 6,
                top:
                  thresholdY -
                  18,
                fontSize: 9,
                fontWeight:
                  "700",
                color:
                  "#22C55E",
                backgroundColor:
                  "#FFFFFF",
                paddingHorizontal:
                  6,
                paddingVertical:
                  2,
              }}
            >
              Normal:{" "}
              {THRESHOLD_TEMP}°C
            </Text>

              <Text
              style={{
                position: "absolute",
                right: 40,
                top: humidityThresholdY - 18,
                fontSize: 9,
                fontWeight: "700",
                color: "#3B82F6",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              Normal Humidity: {THRESHOLD_HUMIDITY}%
            </Text>

            {/* Tooltip */}
            {selectedPoint && (
              <View
                style={{
                  position:
                    "absolute",
                  left: Math.max(
                    10,
                    selectedPoint.x -
                      45
                  ),
                  top: Math.max(
                    10,
                    selectedPoint.y -
                      65
                  ),
                  backgroundColor:
                    "#FFF",
                  borderRadius: 8,
                  paddingHorizontal:
                    10,
                  paddingVertical:
                    6,
                  borderWidth: 1,
                  borderColor:
                    "#E5E7EB",
                  elevation: 5,
                }}
              >
                <Text
                  style={{
                    fontWeight:
                      "700",
                    fontSize: 11,
                  }}
                >
                  {
                    selectedPoint.type
                  }
                </Text>

                <Text
                  style={{
                    fontWeight:
                      "600",
                  }}
                >
                  {selectedPoint.type ===
                  "Temperature"
                    ? `${selectedPoint.value.toFixed(
                        1
                      )}°C`
                    : selectedPoint.type ===
                      "Humidity"
                    ? `${selectedPoint.value.toFixed(
                        0
                      )}%`
                    : `${selectedPoint.value.toFixed(
                        1
                      )}°C`}
                </Text>

                <Text
                  style={{
                    fontSize: 10,
                    color:
                      THEME.textMuted,
                  }}
                >
                  {
                    selectedPoint.label
                  }
                </Text>
              </View>
            )}
            {/* Y Axis Title */}
            <Text
              style={{
                position: "absolute",
                left: -25,
                top: plotH / 2,
                transform: [{ rotate: "-90deg" }],
                fontSize: 11,
                fontWeight: "600",
                color: THEME.textMuted,
              }}
            >
              Temp (°C)
            </Text>

            {/* Right Axis Title */}
            <Text
              style={{
                position: "absolute",
                right: -25,
                top: plotH / 2,
                transform: [{ rotate: "90deg" }],
                fontSize: 11,
                fontWeight: "600",
                color: THEME.primary,
              }}
            >
              Humidity (%)
            </Text>

            {/* X Axis Title */}
            <Text
              style={{
                position: "absolute",
                bottom: 0,
                alignSelf: "center",
                fontSize: 11,
                fontWeight: "600",
                color: THEME.textMuted,
              }}
            >
              Time (Hours)
            </Text>
          </>
        )}
      </View>
    </View>
  );
}