// import React, { useCallback, useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Pressable,
//   ScrollView,
//   Text,
//   View,
// } from "react-native";
// import { NativeStackScreenProps } from "@react-navigation/native-stack";
// import { Ionicons } from "@expo/vector-icons";
// import {
//   AlertItem,
//   AlertSeverity,
//   HiveDetailData,
//   fetchHiveAlerts,
//   fetchHiveDetail,
// } from "../../../api";
// import {
//   THEME,
//   STATUS_COLOR,
//   displayStatus,
//   statusCondition,
//   formatStateDuration,
//   formatRelativeTime,
// } from "../../../theme";
// import { HivesStackParamList } from "../../../navigation/types";
// import { hiveDetailsStyles as styles } from "./HiveDetailsScreen.styles";
// import { HiveMetricsLineChart } from "../../../components/HiveMetricsLineChart";

// type Props = NativeStackScreenProps<HivesStackParamList, "HiveDetails">;

// function StatusPill({ status }: { status: HiveDetailData["status"] }) {
//   return (
//     <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[status]}20` }]}>
//       <Text style={[styles.statusPillText, { color: STATUS_COLOR[status] }]}>
//         {displayStatus(status)}
//       </Text>
//     </View>
//   );
// }

// export function HiveDetailsScreen({ route }: Props) {
//   const { hiveId } = route.params;
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [detail, setDetail] = useState<HiveDetailData | null>(null);
//   const [hiveAlerts, setHiveAlerts] = useState<AlertItem[]>([]);

//   const loadDetail = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const [data, alerts] = await Promise.all([
//         fetchHiveDetail(hiveId),
//         fetchHiveAlerts(hiveId),
//       ]);
//       setDetail(data);
//       setHiveAlerts(alerts);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Could not load hive details");
//     } finally {
//       setLoading(false);
//     }
//   }, [hiveId]);

//   useEffect(() => { void loadDetail(); }, [loadDetail]);

//   if (loading) {
//     return (
//       <View style={styles.centerState}>
//         <ActivityIndicator size="large" color={THEME.accent} />
//         <Text style={styles.stateText}>Loading hive details...</Text>
//       </View>
//     );
//   }

//   if (error || !detail) {
//     return (
//       <View style={styles.centerState}>
//         <Text style={styles.errorTitle}>Failed to load hive</Text>
//         <Text style={styles.errorBody}>{error ?? "No detail returned from API"}</Text>
//         <Pressable style={styles.primaryButtonSmall} onPress={() => void loadDetail()}>
//           <Text style={styles.primaryButtonText}>Retry</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   const metricSeries =
//     detail.metricSeries.length > 0
//       ? detail.metricSeries
//       : detail.metrics.map((value, index) => ({
//           timeLabel: `R${index + 1}`,
//           temperatureC: value,
//           humidityPercent: 60 + index,
//         }));

//   const temperatureValues = metricSeries.map((p) => p.temperatureC);
//   const humidityValues = metricSeries.map((p) => p.humidityPercent);
//   const latestTemperature = temperatureValues[temperatureValues.length - 1] ?? 0;
//   const latestHumidity = humidityValues[humidityValues.length - 1] ?? 0;

//   const severityColors: Record<AlertSeverity, string> = {
//     Critical: "#DC2626",
//     Warning: "#D97706",
//     Info: "#2563EB",
//   };
//   const severityBg: Record<AlertSeverity, string> = {
//     Critical: "#FEF2F2",
//     Warning: "#FFFBEB",
//     Info: "#EFF6FF",
//   };
//   console.log("DETAISLSSSS: ",detail)

//   return (
//     <ScrollView
//       style={{ flex: 1, backgroundColor: THEME.page }}
//       contentContainerStyle={styles.detailPage}
//     >
//       {/* ── Hero Header ── */}
//       <View style={styles.detailHeroCard}>
//         <View style={styles.detailHeroTopRow}>
//           <View style={styles.detailHeroTextWrap}>
//             <Text style={styles.detailHiveName}>{detail.name}</Text>
//             <View style={styles.detailHeroMetaRow}>
//               <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
//               <Text style={styles.detailHeroMeta}>{detail.location}</Text>
//             </View>
//           </View>
//           <StatusPill status={detail.status} />
//         </View>

//         <View style={styles.detailStateDurationRow}>
//           <View style={styles.detailStateLabelContainer}>
//             <Text style={[styles.detailStateLabel, { color: STATUS_COLOR[detail.status] }]}>
//               {/* {displayStatus(detail.status)} */}
//             </Text>
//             {detail.lastAnalysisTime && (
//               <Text style={styles.detailLastAnalysisTime}>
//                 Last analysis: {formatRelativeTime(detail.lastAnalysisTime)}
//               </Text>
//             )}
//           </View>
//           {detail.stateSince && (
//             <View style={styles.detailDurationBadge}>
//               <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
//               <Text style={styles.detailDurationText}>{formatStateDuration(detail.stateSince)}</Text>
//             </View>
//           )}
//         </View>

//         <View style={styles.heroDivider} />

//         <View style={styles.detailAlertBanner}>
//           <View style={styles.detailAlertIconWrap}>
//             <Ionicons
//               name={detail.status === "active" ? "checkmark-circle-outline" : "warning-outline"}
//               size={18}
//               color={detail.status === "active" ? "#16A34A" : THEME.accent}
//             />
//           </View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.detailAlertTitle}>{statusCondition(detail.status)}</Text>
//             <Text style={styles.detailAlertSubtitle}>{detail.alertMessage}</Text>
//           </View>
//         </View>
//       </View>

//       {/* ── Weather Card ── */}
//       {detail.weather && (
//         <View style={styles.card}>
//           <View style={styles.weatherHeader}>
//             <Ionicons name="cloud-outline" size={18} color={THEME.primary} />
//             <Text style={styles.cardTitle}>Local Weather</Text>
//           </View>
//           <Text style={styles.weatherSubtitle}>
//             {detail.weather.weatherDescription ?? "Current conditions"}
//           </Text>

//           <View style={styles.weatherDataRow}>
//             <View style={[styles.weatherCard, { backgroundColor: "#FFF5EA" }]}>
//               <Ionicons name="thermometer-outline" size={24} color={THEME.accent} />
//               <Text style={styles.weatherValue}>{detail.weather.temperature.toFixed(1)}°C</Text>
//               <Text style={styles.weatherLabel}>Temperature</Text>
//             </View>
//             <View style={[styles.weatherCard, { backgroundColor: "#E8F4F8" }]}>
//               <Ionicons name="water-outline" size={24} color="#0891B2" />
//               <Text style={styles.weatherValue}>{detail.weather.humidity.toFixed(0)}%</Text>
//               <Text style={styles.weatherLabel}>Humidity</Text>
//             </View>
//           </View>

//           <Text style={styles.weatherTimestamp}>
//             Updated {formatRelativeTime(detail.weather.timestamp)}
//           </Text>
//         </View>
//       )}

//       {/* ── Notifications ── */}
//       <View style={styles.card}>
//         <View style={styles.rowBetween}>
//           <Text style={styles.cardTitle}>Notifications</Text>
//           <View style={styles.hiveAlertCountBadge}>
//             <Text style={styles.hiveAlertCountText}>{hiveAlerts.length} active</Text>
//           </View>
//         </View>

//         {hiveAlerts.length === 0 && (
//           <View style={styles.hiveAlertEmpty}>
//             <Ionicons name="checkmark-circle-outline" size={28} color="#16A34A" />
//             <Text style={styles.hiveAlertEmptyText}>No notifications for this hive</Text>
//           </View>
//         )}

//         {hiveAlerts.map((alert) => {
//           const color = severityColors[alert.severity];
//           const bg = severityBg[alert.severity];
//           return (
//             <View key={alert.id} style={styles.hiveAlertRow}>
//               <View style={[styles.hiveAlertSeverityBar, { backgroundColor: color }]} />
//               <View style={styles.hiveAlertContent}>
//                 <View style={styles.hiveAlertHeader}>
//                   <View style={[styles.hiveAlertSeverityBadge, { backgroundColor: bg }]}>
//                     <Text style={[styles.hiveAlertSeverityText, { color }]}>{alert.severity}</Text>
//                   </View>
//                   <Text style={styles.hiveAlertDate}>{alert.date}</Text>
//                 </View>
//                 <Text style={styles.hiveAlertTitle}>{alert.title}</Text>
//                 <Text style={styles.hiveAlertSummary}>{alert.summary}</Text>
//               </View>
//             </View>
//           );
//         })}
//       </View>

//       {/* ── Metrics Highlights ── */}
//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>Latest Readings</Text>
//         <Text style={styles.metricsSubtitle}>
//           Temperature & humidity over time with normal threshold
//         </Text>

//         <View style={styles.metricsHighlightsRow}>
//           <View style={[styles.metricHighlightCard, { borderLeftColor: THEME.accent, borderLeftWidth: 3 }]}>
//             <Ionicons name="thermometer-outline" size={16} color={THEME.accent} />
//             <Text style={styles.metricHighlightValue}>{latestTemperature.toFixed(1)}°C</Text>
//             <Text style={styles.metricHighlightLabel}>Hive Temperature</Text>
//           </View>
//           <View style={[styles.metricHighlightCard, { borderLeftColor: THEME.primary, borderLeftWidth: 3 }]}>
//             <Ionicons name="water-outline" size={16} color={THEME.primary} />
//             <Text style={styles.metricHighlightValue}>{latestHumidity.toFixed(0)}%</Text>
//             <Text style={styles.metricHighlightLabel}>Hive Humidity</Text>
//           </View>
//         </View>

//         <View style={styles.metricsLegendRow}>
//           <View style={styles.metricsLegendItem}>
//             <View style={[styles.legendDot, { backgroundColor: THEME.accent }]} />
//             <Text style={styles.legendText}>Temperature</Text>
//           </View>
//           <View style={styles.metricsLegendItem}>
//             <View style={[styles.legendDot, { backgroundColor: THEME.primary }]} />
//             <Text style={styles.legendText}>Humidity</Text>
//           </View>
//           <View style={styles.metricsLegendItem}>
//             <View style={[styles.legendDot, { backgroundColor: THEME.accent, opacity: 0.4, height: 2 }]} />
//             <Text style={styles.legendText}>Normal Threshold</Text>
//           </View>
//         </View>

//         <HiveMetricsLineChart metricSeries={metricSeries} hiveId={detail.id} />
//       </View>
//     </ScrollView>
//   );
// }

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  deleteHive,
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
import { useTemperatureUnit } from "../../../hooks/useTemperatureUnit";
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
  const { formatTemp, unit: tempUnit } = useTemperatureUnit();
  const styles = useMemo(() => createHiveDetailsStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<HiveDetailData | null>(null);
  const [hiveAlerts, setHiveAlerts] = useState<AlertItem[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDeletePress = useCallback(() => {
    setShowDeleteModal(true);
    setDeleteError(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteHive(hiveId);
      setShowDeleteModal(false);
      // Navigate back to hive list with refresh
      navigation.navigate("Hives", {
        screen: "HiveList",
        params: { refresh: Date.now() },
      });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete hive. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }, [hiveId, navigation]);

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
      : (detail.metrics.length > 0
        ? detail.metrics.map((value, index) => ({
          timeLabel: `R${index + 1}`,
          temperatureC: value,
          humidityPercent: 60 + index,
        }))
        : []); // If no data at all, return empty array

  const temperatureValues = metricSeries.map((p) => p.temperatureC);
  const humidityValues = metricSeries.map((p) => p.humidityPercent);
  const latestTemperature =
    temperatureValues.length > 0
      ? temperatureValues[temperatureValues.length - 1]
      : undefined;
  const latestHumidity =
    humidityValues.length > 0
      ? humidityValues[humidityValues.length - 1]
      : undefined;

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
    <>
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
            <View style={{ alignItems: "center", paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="warning" size={32} color="#DC2626" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: theme.primary }}>Delete Hive</Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              <Text style={{ fontSize: 15, color: theme.textMuted, textAlign: "center", lineHeight: 22 }}>
                Are you sure you want to delete{" "}
                <Text style={{ fontWeight: "800", color: theme.primary }}>"{detail?.name}"</Text>?
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF2F2", borderLeftWidth: 0, borderLeftColor: "#DC2626", borderRadius: 8, padding: 12 }}>
                <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                <Text style={{ flex: 1, fontSize: 12, color: "#B91C1C", fontWeight: "600", lineHeight: 18 }}>
                  This action cannot be undone. All hive data, including history and alerts, will be permanently removed.
                </Text>
              </View>

              {deleteError && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 12 }}>
                  <Ionicons name="close-circle" size={16} color="#DC2626" />
                  <Text style={{ flex: 1, fontSize: 12, color: "#DC2626", fontWeight: "600" }}>{deleteError}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: theme.line }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.surfaceSoft, borderWidth: 1, borderColor: theme.line }}
                onPress={handleCancelDelete}
                disabled={deleting}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.primary }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626", flexDirection: "row", gap: 6 },
                  deleting && { opacity: 0.5 },
                ]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#FFF" />
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}>Continue</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.detailAlertTitle}>
                {lastAnalysisTime ? (
                  <>
                    {statusCondition(detail.status)}
                  </>
                ) : (
                  <>
                    No analysis data available
                  </>
                )}
              </Text>            </Text>
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
                {formatTemp(detail.weather.temperature, 1)}
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

        {metricSeries.length === 0 ? (
          <View style={[styles.centerState, { paddingVertical: 40 }]}>
            <Ionicons name="analytics-outline" size={40} color={THEME.textMuted} />
            <Text style={styles.stateText}>No analysis history available yet</Text>
            <Text style={styles.metricsSubtitle}>
              Check back once we've collected the first set of readings
            </Text>
          </View>
        ) : (
          <HiveMetricsLineChart
            metricSeries={metricSeries}
            // hiveId={detail.id}
            hiveName={detail.name}
          />
        )}
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

      {/* ── Delete Button ── */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Pressable
          style={[
            styles.deleteButton,
            deleting && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeletePress}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={styles.deleteButtonText}>Delete Hive</Text>
        </Pressable>
        <Text style={styles.deleteWarning}>
          This action cannot be undone. All hive data will be permanently removed.
        </Text>
      </View>
    </ScrollView>
    </>
  );
}