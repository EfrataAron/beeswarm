import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertItem,
  AlertSeverity,
  HiveDetailData,
  fetchHiveAlerts,
  fetchHiveDetail,
} from "../../../api";
import {
  THEME,
  STATUS_COLOR,
  displayStatus,
  statusCondition,
  formatStateDuration,
  formatRelativeTime,
} from "../../../theme";
import { useTheme } from "../../../hooks/useTheme";
import { HivesStackParamList, MainTabParamList } from "../../../navigation/types";
import { createHiveDetailsStyles } from "./HiveDetailsScreen.styles";
import { HiveMetricsLineChart } from "../../../components/HiveMetricsLineChart";

type NavigationProp = CompositeNavigationProp<
  NativeStackScreenProps<HivesStackParamList, "HiveDetails">["navigation"],
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = NativeStackScreenProps<HivesStackParamList, "HiveDetails"> & {
  navigation: NavigationProp;
};

export function HiveDetailsScreen({ route, navigation }: Props) {
  const { hiveId, lastAnalysisTime } = route.params;
  const theme = useTheme();
  const styles = useMemo(() => createHiveDetailsStyles(theme), [theme]);
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
      setError(
        err instanceof Error ? err.message : "Could not load hive details",
      );
    } finally {
      setLoading(false);
    }
  }, [hiveId]);

  // console.log("hiveAlerts: ", hiveAlerts)

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

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
        <Text style={styles.errorBody}>
          {error ?? "No detail returned from API"}
        </Text>
        <Pressable
          style={styles.primaryButtonSmall}
          onPress={() => void loadDetail()}
        >
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
  const latestTemperature =
    temperatureValues[temperatureValues.length - 1] ?? 0;
  const latestHumidity = humidityValues[humidityValues.length - 1] ?? 0;

  const severityColors: Record<AlertSeverity, string> = {
    Critical: "#DC2626",
    Warning: "#D97706",
    Info: "#2563EB",
  };
  const severityBg: Record<AlertSeverity, string> = {
    Critical: theme.surfaceSoft,
    Warning: theme.surfaceSoft,
    Info: theme.surfaceSoft,
  };
  // console.log("DETAISLSSSS: ", detail);
  // console.log("lastAnalysisTime from route params is: ", lastAnalysisTime);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero Header ── */}
      <View style={[styles.detailHeroCard, { backgroundColor: theme.primary }]}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.name}</Text>
            <View style={styles.detailHeroMetaRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={theme.textMuted}
              />
              <Text style={[styles.detailHeroMeta, { color: theme.textMuted }]}>{detail.location}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: `${STATUS_COLOR[detail.status]}20` },
            ]}
          >
            <Text style={[styles.statusPillText, { color: STATUS_COLOR[detail.status] }]}>
              {displayStatus(detail.status)}
            </Text>
          </View>
        </View>

        <View style={styles.detailStateDurationRow}>
          <View style={styles.detailStateLabelContainer}>
            <Text
              style={[
                styles.detailStateLabel,
                { color: STATUS_COLOR[detail.status] },
              ]}
            >
            </Text>
            {lastAnalysisTime ? (
              <Text style={styles.detailLastAnalysisTime}>
                Last analysis: {formatRelativeTime(lastAnalysisTime)}
              </Text>
            ) : (
              <Text style={styles.detailLastAnalysisTime}>
                No analysis data available
              </Text>
            )}
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.detailAlertBanner}>
          <View style={styles.detailAlertIconWrap}>
            <Ionicons
              name={
                detail.status === "active"
                  ? "checkmark-circle-outline"
                  : "warning-outline"
              }
              size={18}
              color={detail.status === "active" ? "#16A34A" : THEME.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailAlertTitle}>
              {statusCondition(detail.status)}
            </Text>
            <Text style={styles.detailAlertSubtitle}>
              {detail.alertMessage}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Weather Card ── */}
      {detail.weather && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.weatherHeader}>
            <Ionicons name="cloud-outline" size={18} color={THEME.primary} />
            <Text style={styles.cardTitle}>Latest Weather Readings</Text>
          </View>
          <Text style={styles.weatherSubtitle}>
            {detail.weather.weatherDescription ?? "Current conditions"}
          </Text>

          <View style={styles.weatherDataRow}>
            <View style={[styles.weatherCard, { backgroundColor: "#FFF5EA" }]}>
              <Ionicons
                name="thermometer-outline"
                size={24}
                color={THEME.accent}
              />
              <Text style={styles.weatherValue}>
                {detail.weather.temperature.toFixed(1)}°C
              </Text>
              <Text style={styles.weatherLabel}>Temperature</Text>
            </View>
            <View style={[styles.weatherCard, { backgroundColor: "#E8F4F8" }]}>
              <Ionicons name="water-outline" size={24} color="#0891B2" />
              <Text style={styles.weatherValue}>
                {detail.weather.humidity.toFixed(0)}%
              </Text>
              <Text style={styles.weatherLabel}>Humidity</Text>
            </View>
          </View>

          <Text style={styles.weatherTimestamp}>
            Updated {formatRelativeTime(detail.weather.timestamp)}
          </Text>
        </View>
      )}

      {/* ── Metrics Graph ── */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={styles.cardTitle}>
          Temperature & Humidity Trends
        </Text>

        <HiveMetricsLineChart
          metricSeries={metricSeries}
          hiveId={detail.id}
        />
      </View>

      {/* ── Notifications ── */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Previous Notifications</Text>

          {(() => {
            const pendingReview = hiveAlerts.filter(alert => alert.alertStatus !== "acknowledged").length;

            if (pendingReview > 0) {
              return (
                <View style={styles.hiveAlertCountBadge}>
                  <Text style={styles.hiveAlertCountText}>
                    {pendingReview}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
        </View>

        {hiveAlerts.length === 0 && (
          <View style={styles.hiveAlertEmpty}>
            <Ionicons
              name="checkmark-circle-outline"
              size={28}
              color="#16A34A"
            />
            <Text style={styles.hiveAlertEmptyText}>
              All clear · No active alerts
            </Text>
          </View>
        )}

        {hiveAlerts.map((alert) => {
          console.log("alert.severity :", alert)
          var bg, color = '';
          if (alert.alertStatus !== "acknowledged") {
            color = severityColors["Info"];
            bg = severityBg["Info"];
          } else {
            color = severityColors[alert.severity];
            bg = severityBg[alert.severity];
          }

          const iconName =
            alert.severity === "Critical" ? "alert-circle" :
              alert.severity === "Warning" ? "warning" : "information-circle";
          return (
            <Pressable
              key={alert.id}
              style={styles.hiveAlertRowCompact}
              onPress={() => {
                navigation.navigate("Alerts", {
                  screen: "AlertDetails",
                  params: { alertId: alert.id },
                });
              }}
            >
              {/* Severity Icon */}
              <View style={[styles.alertIconCircle, { backgroundColor: bg }]}>
                <Ionicons name={iconName} size={18} color={color} />
              </View>

              {/* Alert Content */}
              <View style={styles.alertContentCompact}>
                <Text style={styles.alertTitleCompact} numberOfLines={1}>
                  {alert.title}
                </Text>
                <Text style={styles.alertTimeCompact}>
                  {alert.severity}- {formatRelativeTime(alert.date)}
                </Text>
              </View>

              {/* Chevron */}
              <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
