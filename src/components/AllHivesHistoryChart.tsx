import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { THEME } from "../theme";

// ─── Types ───────────────────────────────────────────────────────────────────

type HistoryPoint = {
  timeLabel: string;
  temperatureC: number;
  humidityPercent: number;
};

type HiveHistory = {
  hiveId: string;
  history: HistoryPoint[];
};

type Props = {
  allHivesHistory: HiveHistory[];
};

// ─── Colour palette — distinct per hive ─────────────────────────────────────

const HIVE_COLORS = [
  "#F97316", // orange
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#EF4444", // red
  "#0EA5E9", // sky
  "#F59E0B", // amber
  "#EC4899", // pink
  "#14B8A6", // teal
  "#A855F7", // purple
  "#22C55E", // green
  "#64748B", // slate
];

const TEMP_THRESHOLD = 34.5;
const HUM_THRESHOLD = 65;

// ─── Component ───────────────────────────────────────────────────────────────

export function AllHivesHistoryChart({ allHivesHistory }: Props) {
  const [metric, setMetric] = useState<"temperature" | "humidity">("temperature");
  const [activeHives, setActiveHives] = useState<Set<string>>(
    new Set(allHivesHistory.map((h) => h.hiveId)),
  );
  const [chartWidth, setChartWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    hiveId: string;
    timeLabel: string;
    value: number;
    x: number;
    y: number;
    color: string;
  } | null>(null);

  if (!allHivesHistory || allHivesHistory.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ color: THEME.textMuted, fontSize: 13, fontWeight: "600" }}>
          No history data available
        </Text>
      </View>
    );
  }

  // ── Layout constants ──────────────────────────────────────────────────────
  const CHART_H = 200;
  const PAD_LEFT = 38;
  const PAD_RIGHT = 14;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 28;

  const plotW = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

  // ── Collect all time labels (union across hives, keep order) ─────────────
  const timeLabels: string[] = [];
  allHivesHistory.forEach((h) => {
    h.history.forEach((p) => {
      if (!timeLabels.includes(p.timeLabel)) timeLabels.push(p.timeLabel);
    });
  });
  const nTimes = timeLabels.length;

  // ── Y-axis domain ────────────────────────────────────────────────────────
  const isTemp = metric === "temperature";
  const threshold = isTemp ? TEMP_THRESHOLD : HUM_THRESHOLD;
  const unit = isTemp ? "°C" : "%";
  const thresholdLabel = isTemp ? `${TEMP_THRESHOLD}°C Normal` : `${HUM_THRESHOLD}% Normal`;

  let domainMin = isTemp ? 25 : 0;
  let domainMax = isTemp ? 42 : 100;
  allHivesHistory.forEach((h) => {
    h.history.forEach((p) => {
      const v = isTemp ? p.temperatureC : p.humidityPercent;
      if (v < domainMin) domainMin = v - 1;
      if (v > domainMax) domainMax = v + 1;
    });
  });

  // ── Toggle a hive chip ───────────────────────────────────────────────────
  const toggleHive = (hiveId: string) => {
    setActiveHives((prev) => {
      const next = new Set(prev);
      if (next.has(hiveId)) {
        if (next.size > 1) next.delete(hiveId); // keep at least 1
      } else {
        next.add(hiveId);
      }
      return next;
    });
  };

  // ── Point coordinates helpers ─────────────────────────────────────────────
  const xFor = (tIdx: number) =>
    nTimes > 1
      ? PAD_LEFT + (tIdx / (nTimes - 1)) * plotW
      : PAD_LEFT + plotW / 2;

  const yFor = (value: number) =>
    PAD_TOP + ((domainMax - value) / (domainMax - domainMin)) * plotH;

  const thresholdY = yFor(threshold);

  // ── Y-axis tick values ────────────────────────────────────────────────────
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) =>
    domainMin + p * (domainMax - domainMin),
  );

  return (
    <View>
      {/* ── Metric Toggle ─────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginBottom: 10,
          alignSelf: "flex-end",
        }}
      >
        {(["temperature", "humidity"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMetric(m)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: metric === m ? THEME.accent : THEME.line,
              backgroundColor: metric === m ? THEME.accent : "#FFFFFF",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: metric === m ? "#FFFFFF" : THEME.textMuted,
              }}
            >
              {m === "temperature" ? "🌡 Temp" : "💧 Humidity"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Chart canvas ──────────────────────────────────────────────── */}
      <View
        style={{ height: CHART_H, position: "relative" }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <>
            {/* Y-axis labels */}
            {yTicks.map((val, i) => (
              <Text
                key={`ytick-${i}`}
                style={{
                  position: "absolute",
                  left: 0,
                  top: yFor(val) - 8,
                  width: PAD_LEFT - 4,
                  textAlign: "right",
                  fontSize: 8,
                  color: THEME.textMuted,
                  fontWeight: "600",
                }}
              >
                {isTemp ? val.toFixed(0) + "°" : val.toFixed(0) + "%"}
              </Text>
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

            {/* Horizontal grid lines */}
            {yTicks.map((_, i) => (
              <View
                key={`hgrid-${i}`}
                style={{
                  position: "absolute",
                  left: PAD_LEFT,
                  top: PAD_TOP + (i / (yTicks.length - 1)) * plotH,
                  width: plotW,
                  height: 1,
                  backgroundColor: i === 0 || i === yTicks.length - 1 ? "#CBD5E1" : "#E2E8F0",
                }}
              />
            ))}

            {/* Threshold line */}
            <View
              style={{
                position: "absolute",
                left: PAD_LEFT,
                top: thresholdY,
                width: plotW,
                height: 2,
                backgroundColor: "#22C55E",
                opacity: 0.75,
              }}
            />
            <Text
              style={{
                position: "absolute",
                left: PAD_LEFT + 4,
                top: thresholdY - 14,
                fontSize: 8,
                fontWeight: "700",
                color: "#16A34A",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 3,
              }}
            >
              {thresholdLabel}
            </Text>

            {/* ── Lines & dots per hive ─────────────────────────────────── */}
            {allHivesHistory.map((hive, hIdx) => {
              if (!activeHives.has(hive.hiveId)) return null;
              const color = HIVE_COLORS[hIdx % HIVE_COLORS.length];

              // Map each point to (x, y, value)
              const pts = hive.history
                .map((p) => {
                  const tIdx = timeLabels.indexOf(p.timeLabel);
                  if (tIdx < 0) return null;
                  const value = isTemp ? p.temperatureC : p.humidityPercent;
                  return { x: xFor(tIdx), y: yFor(value), value, label: p.timeLabel };
                })
                .filter(Boolean) as { x: number; y: number; value: number; label: string }[];

              return (
                <React.Fragment key={hive.hiveId}>
                  {/* Line segments */}
                  {pts.slice(0, -1).map((p, i) => {
                    const q = pts[i + 1];
                    const dx = q.x - p.x;
                    const dy = q.y - p.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    return (
                      <View
                        key={`line-${hive.hiveId}-${i}`}
                        style={{
                          position: "absolute",
                          left: (p.x + q.x) / 2 - len / 2,
                          top: (p.y + q.y) / 2 - 1.5,
                          width: len,
                          height: 3,
                          backgroundColor: color,
                          borderRadius: 2,
                          opacity: 0.85,
                          transform: [{ rotate: `${angle}deg` }],
                        }}
                      />
                    );
                  })}

                  {/* Dots */}
                  {pts.map((p, i) => (
                    <Pressable
                      key={`dot-${hive.hiveId}-${i}`}
                      onPress={() =>
                        setTooltip((prev) =>
                          prev?.hiveId === hive.hiveId && prev?.timeLabel === p.label
                            ? null
                            : { hiveId: hive.hiveId, timeLabel: p.label, value: p.value, x: p.x, y: p.y, color },
                        )
                      }
                      style={{
                        position: "absolute",
                        left: p.x - 8,
                        top: p.y - 8,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: color,
                          borderWidth: 2,
                          borderColor: "#FFFFFF",
                        }}
                      />
                    </Pressable>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Tooltip */}
            {tooltip && (
              <View
                style={{
                  position: "absolute",
                  left: Math.min(tooltip.x - 36, plotW + PAD_LEFT - 76),
                  top: Math.max(tooltip.y - 52, 2),
                  backgroundColor: tooltip.color,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  zIndex: 99,
                  minWidth: 72,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>
                  {tooltip.hiveId}
                </Text>
                <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.9)", marginTop: 1 }}>
                  {tooltip.timeLabel} · {tooltip.value.toFixed(1)}{unit}
                </Text>
              </View>
            )}

            {/* X-axis time labels — show every other label if many hives */}
            {timeLabels.map((label, i) => {
              const skip = nTimes > 8 ? i % 2 !== 0 : false;
              if (skip) return null;
              return (
                <Text
                  key={`xlabel-${i}`}
                  style={{
                    position: "absolute",
                    left: xFor(i) - 16,
                    top: PAD_TOP + plotH + 6,
                    width: 32,
                    textAlign: "center",
                    fontSize: 7,
                    color: THEME.textMuted,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              );
            })}
          </>
        )}
      </View>

      {/* ── Hive filter chips ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row",
          gap: 6,
          marginTop: 14,
          paddingBottom: 2,
        }}
      >
        {allHivesHistory.map((hive, hIdx) => {
          const color = HIVE_COLORS[hIdx % HIVE_COLORS.length];
          const isOn = activeHives.has(hive.hiveId);
          return (
            <Pressable
              key={hive.hiveId}
              onPress={() => toggleHive(hive.hiveId)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: isOn ? color : THEME.line,
                backgroundColor: isOn ? `${color}18` : "#FAFAFA",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOn ? color : THEME.line,
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: isOn ? color : THEME.textMuted,
                }}
              >
                {hive.hiveId}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Summary stats strip ────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 14,
        }}
      >
        {/* Normal count */}
        {(() => {
          let normal = 0;
          let atRisk = 0;
          allHivesHistory.forEach((h) => {
            const latest = h.history[h.history.length - 1];
            if (!latest) return;
            const v = isTemp ? latest.temperatureC : latest.humidityPercent;
            if (v <= threshold) normal++;
            else atRisk++;
          });
          return (
            <>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#ECFDF5",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 9, color: "#065F46", fontWeight: "700" }}>
                  Normal
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#16A34A", marginTop: 2 }}>
                  {normal}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FEF2F2",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 9, color: "#7F1D1D", fontWeight: "700" }}>
                  Above Threshold
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#DC2626", marginTop: 2 }}>
                  {atRisk}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "#F0F4F8",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 9, color: THEME.textMuted, fontWeight: "700" }}>
                  Total Hives
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: THEME.primary, marginTop: 2 }}>
                  {allHivesHistory.length}
                </Text>
              </View>
            </>
          );
        })()}
      </View>
    </View>
  );
}
