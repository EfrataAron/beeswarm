import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertItem,
  AlertSeverity,
  AmbientWeather,
  DashboardData,
  fetchAlerts,
  fetchAmbientWeather,
  fetchDashboard,
} from "../../api";
import { THEME } from "../../theme";
import { useTheme } from "../../hooks/useTheme";
import { MainTabParamList } from "../../navigation/types";
import { createDashboardStyles } from "./DashboardScreen.styles";
import { DonutChart } from "../../components/DonutChart";
import { MetricCard } from "../../components/MetricCard";
import { AllHivesMetricsChart } from "../../components/AllHivesMetricsChart";
import { HiveMetricsLineChart } from "../../components/HiveMetricsLineChart";
import { HiveStatusTrendChart } from "../../components/HiveStatusTrendChart";
import { averageFleetMetrics } from "../../api/utils/metricsHistory";
import { useTemperatureUnit } from "../../hooks/useTemperatureUnit";

type Props = BottomTabScreenProps<MainTabParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createDashboardStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ambientWeather, setAmbientWeather] = useState<AmbientWeather | null>(null);
  const [dashboardAlerts, setDashboardAlerts] = useState<AlertItem[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [openAlertMenu, setOpenAlertMenu] = useState<"severity" | "hive" | "latest" | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "All">("All");
  const [hiveFilter, setHiveFilter] = useState<string>("All");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAlertsError(null);
    try {
      // Fire all three requests in parallel — this is the main performance win
      const [data, alerts, weather] = await Promise.allSettled([
        fetchDashboard(),
        fetchAlerts(),
        fetchAmbientWeather(),
      ]);

      if (data.status === "fulfilled") {
        setDashboard(data.value);
      } else {
        throw data.reason;
      }

      if (alerts.status === "fulfilled") {
        setDashboardAlerts(alerts.value);
      } else {
        setDashboardAlerts([]);
        setAlertsError(
          alerts.reason instanceof Error
            ? alerts.reason.message
            : "Could not load dashboard alerts",
        );
      }

      setAmbientWeather(
        weather.status === "fulfilled" ? weather.value : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const onRefreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const severityCounts = useMemo(() => ({
    Critical: dashboardAlerts.filter((a) => a.severity === "Critical").length,
    Warning: dashboardAlerts.filter((a) => a.severity === "Warning").length,
    Info: dashboardAlerts.filter((a) => a.severity === "Info").length,
  }), [dashboardAlerts]);

  const hiveOptions = useMemo(() => {
    const counts = new Map<string, number>();
    dashboardAlerts.forEach((alert) => {
      counts.set(alert.hiveId, (counts.get(alert.hiveId) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [dashboardAlerts]);

  const latestAlerts = useMemo(
    () =>
      [...dashboardAlerts]
        .sort((a, b) => {
          const aTime = Date.parse(a.date.replace(" ", "T"));
          const bTime = Date.parse(b.date.replace(" ", "T"));
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
        })
        .slice(0, 6),
    [dashboardAlerts],
  );

  const filteredDashboardAlerts = useMemo(
    () =>
      dashboardAlerts.filter((alert) => {
        const passesSeverity = severityFilter === "All" || alert.severity === severityFilter;
        const passesHive = hiveFilter === "All" || alert.hiveName === hiveFilter;
        return passesSeverity && passesHive;
      }),
    [dashboardAlerts, severityFilter, hiveFilter],
  );

  const selectedDashboardAlert = useMemo(() => {
    if (filteredDashboardAlerts.length === 0) return null;
    return (
      filteredDashboardAlerts.find((alert) => alert.id === selectedAlertId) ??
      filteredDashboardAlerts[0]
    );
  }, [filteredDashboardAlerts, selectedAlertId]);

  const fleetMetricSeries = useMemo(
    () => averageFleetMetrics(dashboard?.allHivesHistory ?? []),
    [dashboard?.allHivesHistory],
  );

  const { formatTemp, unit: tempUnit } = useTemperatureUnit();

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.stateText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load dashboard</Text>
        <Text style={styles.errorBody}>{error ?? "No data returned from API"}</Text>
        <Pressable style={styles.primaryButtonSmall} onPress={() => void loadDashboard()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const total = dashboard.totalHives ?? 0;

  const donutSegments = [
    { pct: dashboard.statusCounts.active / total, color: "#22C55E", label: "Active", count: dashboard.statusCounts.active },
    { pct: dashboard.statusCounts.swarming / total, color: "#EF4444", label: "Swarming", count: dashboard.statusCounts.swarming },
    { pct: dashboard.statusCounts.quacking_queens / total, color: "#8B5CF6", label: "Quacking Queens", count: dashboard.statusCounts.quacking_queens },
    { pct: dashboard.statusCounts.pests / total, color: "#DC2626", label: "Pests", count: dashboard.statusCounts.pests },
    { pct: dashboard.statusCounts.queenless / total, color: "#EC4899", label: "Queenless", count: dashboard.statusCounts.queenless },
    { pct: dashboard.statusCounts.external_noise / total, color: "#D97706", label: "External Noise", count: dashboard.statusCounts.external_noise },
    { pct: dashboard.statusCounts.inactive_hive / total, color: "#94A3B8", label: "Inactive", count: dashboard.statusCounts.inactive_hive },
    { pct: dashboard.statusCounts.Abscondment / total, color: "#6B7280", label: "Absconded", count: dashboard.statusCounts.Abscondment },
  ];

  const dashboardSeverityColor: Record<AlertSeverity, string> = {
    Critical: "#DC2626",
    Warning: "#D97706",
    Info: "#2563EB",
  };

  const displayTemperature = ambientWeather?.temperatureC ?? dashboard.keyMetrics.temperatureC;
  const displayHumidity = ambientWeather?.humidityPercent ?? dashboard.keyMetrics.humidityPercent;
  const weatherSubtitle = ambientWeather ? "Live weather (Open-Meteo)" : "Last 24 hours";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.page }}
      contentContainerStyle={[styles.appPage, { backgroundColor: theme.page }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefreshDashboard()}
          colors={[THEME.accent]}
          tintColor={THEME.accent}
        />
      }
    >
      {/* ── Alerts card ── */}
      <View style={[styles.dashboardAlertsCard, { backgroundColor: theme.surface }]}>
        <View style={styles.dashboardAlertsTopRow}>
          <View style={styles.dashboardAlertsTitleWrap}>
            <Text style={styles.dashboardAlertsTitle}>Alerts</Text>
            <Text style={styles.dashboardAlertsSubTitle}>Dashboard quick view</Text>
          </View>
          <View style={styles.hiveAlertCountBadge}>
            <Text style={styles.hiveAlertCountText}>{filteredDashboardAlerts.length} shown</Text>
          </View>
        </View>

        <View style={styles.dashboardAlertMenuRow}>
          {(["severity", "hive", "latest"] as const).map((menu) => {
            const icons = { severity: "funnel-outline", hive: "cube-outline", latest: "time-outline" } as const;
            const labels = { severity: "Severity", hive: "Hive", latest: "Latest" };
            const active = openAlertMenu === menu;
            return (
              <Pressable
                key={menu}
                style={[styles.dashboardAlertMenuChip, active && styles.dashboardAlertMenuChipActive]}
                onPress={() => setOpenAlertMenu((c) => (c === menu ? null : menu))}
              >
                <Ionicons name={icons[menu]} size={14} color={active ? "#FFFFFF" : THEME.primary} />
                <Text style={[styles.dashboardAlertMenuChipText, active && styles.dashboardAlertMenuChipTextActive]}>
                  {labels[menu]} 
                </Text>
              </Pressable>
            );
          })}
        </View>

        {openAlertMenu !== null && (
          <View style={styles.dashboardAlertSubMenu}>
            <View style={styles.dashboardAlertSubMenuHeader}>
              <Text style={styles.dashboardAlertSubMenuTitle}>
                {openAlertMenu === "severity" ? "Severity Categories" : openAlertMenu === "hive" ? "Hive Categories" : "Recent Alerts"}
              </Text>
              <Pressable style={styles.dashboardAlertSubMenuCloseBtn} onPress={() => setOpenAlertMenu(null)}>
                <Ionicons name="close" size={16} color={THEME.textMuted} />
              </Pressable>
            </View>

            {openAlertMenu === "severity" && (
              <View style={styles.dashboardAlertSubMenuList}>
                <Pressable
                  style={[styles.dashboardAlertSubMenuItem, severityFilter === "All" && styles.dashboardAlertSubMenuItemActive]}
                  onPress={() => setSeverityFilter("All")}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, severityFilter === "All" && styles.dashboardAlertSubMenuItemTextActive]}>
                    All ({dashboardAlerts.length})
                  </Text>
                </Pressable>
                {(["Critical", "Warning", "Info"] as AlertSeverity[]).map((severity) => (
                  <Pressable
                    key={severity}
                    style={[styles.dashboardAlertSubMenuItem, severityFilter === severity && styles.dashboardAlertSubMenuItemActive]}
                    onPress={() => setSeverityFilter(severity)}
                  >
                    <View style={[styles.dashboardAlertSubMenuDot, { backgroundColor: dashboardSeverityColor[severity] }]} />
                    <Text style={[styles.dashboardAlertSubMenuItemText, severityFilter === severity && styles.dashboardAlertSubMenuItemTextActive]}>
                      {severity} ({severityCounts[severity]})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {openAlertMenu === "hive" && (
              <View style={styles.dashboardAlertSubMenuList}>
                <Pressable
                  style={[styles.dashboardAlertSubMenuItem, hiveFilter === "All" && styles.dashboardAlertSubMenuItemActive]}
                  onPress={() => setHiveFilter("All")}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, hiveFilter === "All" && styles.dashboardAlertSubMenuItemTextActive]}>
                    All hives
                  </Text>
                </Pressable>
                {hiveOptions.map(([hiveName, count]) => (
                  <Pressable
                    key={hiveName}
                    style={[styles.dashboardAlertSubMenuItem, hiveFilter === hiveName && styles.dashboardAlertSubMenuItemActive]}
                    onPress={() => setHiveFilter(hiveName)}
                  >
                    <Text style={[styles.dashboardAlertSubMenuItemText, hiveFilter === hiveName && styles.dashboardAlertSubMenuItemTextActive]}>
                      {hiveName} ({count})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {openAlertMenu === "latest" && (
              <View style={styles.dashboardAlertSubMenuList}>
                {latestAlerts.map((alert) => (
                  <Pressable
                    key={alert.id}
                    style={styles.dashboardAlertSubMenuItem}
                    onPress={() => { setSelectedAlertId(alert.id); setOpenAlertMenu(null); }}
                  >
                    <View style={[styles.dashboardAlertSubMenuDot, { backgroundColor: dashboardSeverityColor[alert.severity] }]} />
                    <Text style={styles.dashboardAlertSubMenuItemText}>{alert.title}</Text>
                  </Pressable>
                ))}
                {latestAlerts.length === 0 && (
                  <Text style={styles.dashboardAlertSubMenuEmpty}>No recent alerts available</Text>
                )}
              </View>
            )}
          </View>
        )}

        {alertsError && <Text style={styles.dashboardAlertsInlineError}>{alertsError}</Text>}
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dashboardAlertScroller}>
          {filteredDashboardAlerts.map((alert) => {
            const selected = selectedDashboardAlert?.id === alert.id;
            return (
              <Pressable
                key={alert.id}
                style={[styles.dashboardAlertCompactCard, selected && styles.dashboardAlertCompactCardActive]}
                onPress={() => setSelectedAlertId(alert.id)}
              >
                <View style={styles.dashboardAlertCompactTopRow}>
                  <View style={[styles.dashboardAlertCompactDot, { backgroundColor: dashboardSeverityColor[alert.severity] }]} />
                  <Text style={styles.dashboardAlertCompactHive}>{alert.hiveName}</Text>
                </View>
                <Text style={styles.dashboardAlertCompactTitle} numberOfLines={1}>{alert.title}</Text>
                <Text style={styles.dashboardAlertCompactDate}>{alert.date}</Text>
              </Pressable>
            );
          })} 
          {filteredDashboardAlerts.length === 0 && (
            <View style={styles.dashboardAlertsEmptyState}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
              <Text style={styles.dashboardAlertsEmptyStateText}>No alerts match this filter</Text>
            </View>
          )}
        </ScrollView>

        {selectedDashboardAlert && (
          <View style={styles.dashboardAlertDetailsCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.dashboardAlertDetailsTitle}>{selectedDashboardAlert.title}</Text>
              <View style={[styles.dashboardAlertDetailsSeverity, { backgroundColor: `${dashboardSeverityColor[selectedDashboardAlert.severity]}20` }]}>
                <Text style={[styles.dashboardAlertDetailsSeverityText, { color: dashboardSeverityColor[selectedDashboardAlert.severity] }]}>
                  {selectedDashboardAlert.severity}
                </Text>
              </View>
            </View>
            <Text style={styles.dashboardAlertDetailsMeta}>
              {selectedDashboardAlert.hiveName} · {selectedDashboardAlert.date}
            </Text>
            <Text style={styles.dashboardAlertDetailsSummary}>{selectedDashboardAlert.summary}</Text>
            <Pressable
              style={styles.dashboardAlertDetailsLink}
              onPress={() =>
                navigation.navigate("Alerts", {
                  screen: "AlertDetails",
                  params: { alertId: selectedDashboardAlert.id },
                })
              }
            >
              <Text style={styles.dashboardAlertDetailsLinkText}>Open Full Details</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Overview row ── */}
      <Pressable style={styles.overviewCardRow} onPress={() => navigation.navigate("Hives", { screen: "HiveList" })}>
        <View style={[styles.overviewTile, { backgroundColor: dashboard.silentHives.length > 0 ? "#152566" : "#36f57c" }]}>
          <Ionicons name={dashboard.silentHives.length > 0 ? "wifi-outline" : "radio-outline"} size={25} color="#fff" />
          <Text style={styles.overviewTileValue}>
            {dashboard.silentHives.length > 0 ? dashboard.silentHives.length : dashboard.totalHives}
          </Text>
          <Text style={styles.overviewTileLabel}>{dashboard.silentHives.length > 0 ? "Offline" : "All Online"}</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#5184f2" }]}>
          <Ionicons name="checkmark-circle-outline" size={25} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.activeHives}</Text>
          <Text style={styles.overviewTileLabel}>Harmonious</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#f55858" }]}>
          <Ionicons name="alert-circle-outline" size={25} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.pendingAlerts}</Text>
          <Text style={styles.overviewTileLabel}>Alerts</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#f3ac5a" }]}>
          <Ionicons name="warning-outline" size={25} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.statusCounts.swarming}</Text>
          <Text style={styles.overviewTileLabel}>Swarming</Text>
        </View>
      </Pressable>

      {/* ── All hives temp & humidity (same chart style as hive details) ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>All Hives — Temperature & Humidity</Text>
        <Text style={styles.metricsSubtitle}>
          Fleet average
          {(dashboard.allHivesHistory?.length ?? 0) > 0
            ? ` across ${dashboard.allHivesHistory!.length} hive${dashboard.allHivesHistory!.length === 1 ? "" : "s"}`
            : ""}
          {" · "}temp (orange) · humidity (blue) · tap a dot for hive names
        </Text>
        {fleetMetricSeries.length > 0 ? (
          <HiveMetricsLineChart
            
            metricSeries={fleetMetricSeries}
            hiveName="fleet"
            perHiveSeries={dashboard.allHivesHistory?.map((h) => ({
              hiveId: h.hiveId,
              hiveName: h.hiveName ?? h.hiveId,
              history: h.history,
            }))}
          />
        ) : (
          <Text style={[styles.metricsSubtitle, { textAlign: "center", paddingVertical: 24 }]}>
            No hive sensor data yet. Create a hive to see fleet trends here.
          </Text>
        )}
      </View>

      {/* ── Hive State Donut ── */}
      <Pressable style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => navigation.navigate("Hives", { screen: "HiveList" })}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Hive State</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "700" }}>View Hives</Text>
            <Ionicons name="chevron-forward" size={14} color="#2563EB" />
          </View>
        </View>
        <View style={styles.donutRow}>
          <DonutChart segments={donutSegments} total={total} />
          <View style={styles.donutLegend}>
            {donutSegments.map((seg) => (
              <View key={seg.label} style={styles.donutLegendItem}>
                <View style={[styles.donutLegendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.donutLegendLabel}>{seg.label}</Text>
                <Text style={styles.donutLegendCount}>{seg.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>

      {/* ── Hive Status Trend ── */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Hive Status Trend</Text>
          <Text style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}>
            Live from DB
          </Text>
        </View>
        <Text style={[styles.metricsSubtitle, { marginBottom: 4 }]}>
          Status counts over time · tap chips to filter
        </Text>
        <HiveStatusTrendChart statusTrend={dashboard.statusTrend ?? []} />
      </View>

      {/* ── All Hives Snapshot Scatter ── */}
      {dashboard.allHives && dashboard.allHives.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Hive Metrics Snapshot</Text>
          </View>
          <Text style={styles.metricsSubtitle}>All hives plotted by temperature vs humidity</Text>
          <View style={styles.metricsLegendRow}>
            <View style={styles.metricsLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#DC2626", width: 8, height: 8 }]} />
              <Text style={styles.legendText}>Abnormal</Text>
            </View>
            <View style={styles.metricsLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#22C55E", width: 8, height: 8 }]} />
              <Text style={styles.legendText}>Normal</Text>
            </View>
          </View>
          <AllHivesMetricsChart
            key={`snapshot-${tempUnit}`}
            allHives={dashboard.allHives}
          />
        </View>
      )}

      {/* ── Key Metrics ── */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.gridTwo}>
        <MetricCard title="Avg Temperature" value={formatTemp(displayTemperature, 1).replace(`°${tempUnit}`, "")} unit={`°${tempUnit}`} subtitle={weatherSubtitle} />
        <MetricCard title="Avg Humidity" value={displayHumidity.toFixed(0)} unit="%" subtitle={weatherSubtitle} />
      </View>

      <Text style={styles.sectionTitle}>System Monitoring</Text>
      

<View style={styles.gridThree}>
  {/* Recordings Today */}
  <View style={styles.infoCard}>
    <Ionicons
      name="mic-outline"
      size={22}
      color={THEME.primary}
    />
    <Text style={styles.infoCardValue}>
      {dashboard.recordingsToday}
    </Text>
    <Text style={styles.infoCardLabel}>
      Recordings Today
    </Text>
    <Text style={styles.infoCardSub}>
      Across all hives
    </Text>
  </View>

  {/* Silent Hives */}
  <View
    style={[
      styles.infoCard,
      dashboard.silentHives.length > 0 &&
        styles.infoCardWarn,
    ]}
  >
    <Ionicons
      name="volume-mute-outline"
      size={22}
      color={
        dashboard.silentHives.length > 0
          ? "#EF4444"
          : "#22C55E"
      }
    />

    <Text
      style={[
        styles.infoCardValue,
        {
          color:
            dashboard.silentHives.length > 0
              ? "#EF4444"
              : "#22C55E",
        },
      ]}
    >
      {dashboard.silentHives.length}
    </Text>

    <Text style={styles.infoCardLabel}>
      Silent Hives
    </Text>

    <Text style={styles.infoCardSub}>
      No audio in 8h+
    </Text>
  </View>

  {/* Low Confidence */}
  <View
    style={[
      styles.infoCard,
      dashboard.lowConfidenceInferences > 0 &&
        styles.infoCardWarn,
    ]}
  >
    <Ionicons
      name="help-circle-outline"
      size={22}
      color={
        dashboard.lowConfidenceInferences > 0
          ? "#EF4444"
          : "#22C55E"
      }
    />

    <Text
      style={[
        styles.infoCardValue,
        {
          color:
            dashboard.lowConfidenceInferences > 0
              ? "#EF4444"
              : "#22C55E",
        },
      ]}
    >
      {dashboard.lowConfidenceInferences}
    </Text>

    <Text style={styles.infoCardLabel}>
      Low Confidence
    </Text>

    <Text style={styles.infoCardSub}>
      Score &lt; 0.6
    </Text>
  </View>
</View>
    </ScrollView>
  );
}