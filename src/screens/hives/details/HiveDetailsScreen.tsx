import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertItem,
  AlertSeverity,
  HiveDetailData,
  fetchHiveAlerts,
  fetchHiveDetail,
} from "../../../api/beeswarmApi";
import {
  THEME,
  STATUS_COLOR,
  displayStatus,
  statusCondition,
  formatStateDuration,
} from "../../../theme";
import { HivesStackParamList } from "../../../navigation/types";
import { hiveDetailsStyles as styles } from "./HiveDetailsScreen.styles";
import { HiveMetricsLineChart } from "../../../components/HiveMetricsLineChart";

type Props = NativeStackScreenProps<HivesStackParamList, "HiveDetails">;

function StatusPill({ status }: { status: HiveDetailData["status"] }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[status]}20` }]}>
      <Text style={[styles.statusPillText, { color: STATUS_COLOR[status] }]}>
        {displayStatus(status)}
      </Text>
    </View>
  );
}

export function HiveDetailsScreen({ route }: Props) {
  const { hiveId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<HiveDetailData | null>(null);
  const [hiveAlerts, setHiveAlerts] = useState<AlertItem[]>([]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, alerts] = await Promise.all([
        fetchHiveDetail(hiveId),
        fetchHiveAlerts(hiveId),
      ]);
      setDetail(data);
      setHiveAlerts(alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hive details");
    } finally {
      setLoading(false);
    }
  }, [hiveId]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.stateText}>Loading hive details...</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load hive</Text>
        <Text style={styles.errorBody}>{error ?? "No detail returned from API"}</Text>
        <Pressable style={styles.primaryButtonSmall} onPress={() => void loadDetail()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const metricSeries =
    detail.metricSeries.length > 0
      ? detail.metricSeries
      : detail.metrics.map((value, index) => ({
          timeLabel: `R${index + 1}`,
          temperatureC: value,
          humidityPercent: 60 + index,
        }));

  const temperatureValues = metricSeries.map((p) => p.temperatureC);
  const humidityValues = metricSeries.map((p) => p.humidityPercent);
  const latestTemperature = temperatureValues[temperatureValues.length - 1] ?? 0;
  const latestHumidity = humidityValues[humidityValues.length - 1] ?? 0;

  const severityColors: Record<AlertSeverity, string> = {
    Critical: "#DC2626",
    Warning: "#D97706",
    Info: "#2563EB",
  };
  const severityBg: Record<AlertSeverity, string> = {
    Critical: "#FEF2F2",
    Warning: "#FFFBEB",
    Info: "#EFF6FF",
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero Header ── */}
      <View style={styles.detailHeroCard}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.name}</Text>
            <View style={styles.detailHeroMetaRow}>
              <Ionicons name="location-outline" size={12} color={THEME.textMuted} />
              <Text style={styles.detailHeroMeta}>{detail.location}</Text>
            </View>
          </View>
          <StatusPill status={detail.status} />
        </View>

        <View style={styles.detailStateDurationRow}>
          <Text style={[styles.detailStateLabel, { color: STATUS_COLOR[detail.status] }]}>
            {displayStatus(detail.status)}
          </Text>
          {detail.stateSince && (
            <View style={styles.detailDurationBadge}>
              <Ionicons name="time-outline" size={11} color={THEME.textMuted} />
              <Text style={styles.detailDurationText}>{formatStateDuration(detail.stateSince)}</Text>
            </View>
          )}
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.detailAlertBanner}>
          <View style={styles.detailAlertIconWrap}>
            <Ionicons
              name={detail.status === "Healthy" ? "checkmark-circle-outline" : "warning-outline"}
              size={18}
              color={detail.status === "Healthy" ? "#16A34A" : THEME.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailAlertTitle}>{statusCondition(detail.status)}</Text>
            <Text style={styles.detailAlertSubtitle}>{detail.alertMessage}</Text>
          </View>
        </View>
      </View>

      {/* ── Notifications ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.hiveAlertCountBadge}>
            <Text style={styles.hiveAlertCountText}>{hiveAlerts.length} active</Text>
          </View>
        </View>

        {hiveAlerts.length === 0 && (
          <View style={styles.hiveAlertEmpty}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#16A34A" />
            <Text style={styles.hiveAlertEmptyText}>No notifications for this hive</Text>
          </View>
        )}

        {hiveAlerts.map((alert) => {
          const color = severityColors[alert.severity];
          const bg = severityBg[alert.severity];
          return (
            <View key={alert.id} style={styles.hiveAlertRow}>
              <View style={[styles.hiveAlertSeverityBar, { backgroundColor: color }]} />
              <View style={styles.hiveAlertContent}>
                <View style={styles.hiveAlertHeader}>
                  <View style={[styles.hiveAlertSeverityBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.hiveAlertSeverityText, { color }]}>{alert.severity}</Text>
                  </View>
                  <Text style={styles.hiveAlertDate}>{alert.date}</Text>
                </View>
                <Text style={styles.hiveAlertTitle}>{alert.title}</Text>
                <Text style={styles.hiveAlertSummary}>{alert.summary}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Metrics Highlights ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Readings</Text>
        <Text style={styles.metricsSubtitle}>
          Temperature & humidity over time with normal threshold
        </Text>

        <View style={styles.metricsHighlightsRow}>
          <View style={[styles.metricHighlightCard, { borderLeftColor: THEME.accent, borderLeftWidth: 3 }]}>
            <Ionicons name="thermometer-outline" size={16} color={THEME.accent} />
            <Text style={styles.metricHighlightValue}>{latestTemperature.toFixed(1)}°C</Text>
            <Text style={styles.metricHighlightLabel}>Temperature</Text>
          </View>
          <View style={[styles.metricHighlightCard, { borderLeftColor: THEME.primary, borderLeftWidth: 3 }]}>
            <Ionicons name="water-outline" size={16} color={THEME.primary} />
            <Text style={styles.metricHighlightValue}>{latestHumidity.toFixed(0)}%</Text>
            <Text style={styles.metricHighlightLabel}>Humidity</Text>
          </View>
        </View>

        <View style={styles.metricsLegendRow}>
          <View style={styles.metricsLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.accent }]} />
            <Text style={styles.legendText}>Temperature</Text>
          </View>
          <View style={styles.metricsLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.primary }]} />
            <Text style={styles.legendText}>Humidity</Text>
          </View>
          <View style={styles.metricsLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: THEME.accent, opacity: 0.4, height: 2 }]} />
            <Text style={styles.legendText}>Normal Threshold</Text>
          </View>
        </View>

        <HiveMetricsLineChart metricSeries={metricSeries} hiveId={detail.id} />
      </View>
    </ScrollView>
  );
}
