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
} from "../../api/beeswarmApi";
import { THEME } from "../../theme";
import { MainTabParamList } from "../../navigation/types";
import { dashboardStyles as styles } from "./DashboardScreen.styles";
import { DonutChart } from "../../components/DonutChart";
import { TrendLineChart } from "../../components/TrendLineChart";
import { MetricCard } from "../../components/MetricCard";
import { AllHivesMetricsChart } from "../../components/AllHivesMetricsChart";

const TREND_24H: Array<{ label: string; count: number }> = [
  { label: "00", count: 0 },
  { label: "03", count: 1 },
  { label: "06", count: 2 },
  { label: "09", count: 2 },
  { label: "12", count: 3 },
  { label: "15", count: 2 },
  { label: "18", count: 3 },
  { label: "21", count: 1 },
];

const TREND_30D: Array<{ label: string; count: number }> = [
  { label: "Apr 1", count: 1 },
  { label: "Apr 4", count: 2 },
  { label: "Apr 7", count: 1 },
  { label: "Apr 10", count: 3 },
  { label: "Apr 13", count: 2 },
  { label: "Apr 16", count: 4 },
  { label: "Apr 19", count: 3 },
  { label: "Apr 22", count: 5 },
  { label: "Apr 25", count: 4 },
  { label: "Apr 28", count: 3 },
];

type Props = BottomTabScreenProps<MainTabParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
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
  const [trendRange, setTrendRange] = useState<"24h" | "7d" | "30d">("7d");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAlertsError(null);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
      try {
        const alerts = await fetchAlerts();
        setDashboardAlerts(alerts);
      } catch (alertsErr) {
        setDashboardAlerts([]);
        setAlertsError(
          alertsErr instanceof Error ? alertsErr.message : "Could not load dashboard alerts",
        );
      }
      try {
        const weather = await fetchAmbientWeather();
        setAmbientWeather(weather);
      } catch {
        setAmbientWeather(null);
      }
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
        const passesHive = hiveFilter === "All" || alert.hiveId === hiveFilter;
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

  const activeTrendData = useMemo(() => {
    if (trendRange === "24h") return TREND_24H;
    if (trendRange === "30d") return TREND_30D;
    return (dashboard?.preSwarmTrend ?? []).map((d) => ({ label: d.day, count: d.count }));
  }, [trendRange, dashboard?.preSwarmTrend]);

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

  const total = dashboard.totalHives || 1;
  const donutSegments = [
    { pct: dashboard.statusCounts.Healthy / total, color: "#22C55E", label: "Harmonious", count: dashboard.statusCounts.Healthy },
    { pct: dashboard.statusCounts["Pre-swarm"] / total, color: "#D97706", label: "2 Queens!", count: dashboard.statusCounts["Pre-swarm"] },
    { pct: dashboard.statusCounts.Swarm / total, color: "#EF4444", label: "Swarming", count: dashboard.statusCounts.Swarm },
    { pct: dashboard.statusCounts.Abscondment / total, color: "#94A3B8", label: "Empty", count: dashboard.statusCounts.Abscondment },
    { pct: dashboard.statusCounts.Abscondment / total, color: "#d8f040", label: "Pest Infestation", count: dashboard.statusCounts.Abscondment },
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
      contentContainerStyle={styles.appPage}
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
      <View style={styles.dashboardAlertsCard}>
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
                {hiveOptions.map(([hiveId, count]) => (
                  <Pressable
                    key={hiveId}
                    style={[styles.dashboardAlertSubMenuItem, hiveFilter === hiveId && styles.dashboardAlertSubMenuItemActive]}
                    onPress={() => setHiveFilter(hiveId)}
                  >
                    <Text style={[styles.dashboardAlertSubMenuItemText, hiveFilter === hiveId && styles.dashboardAlertSubMenuItemTextActive]}>
                      {hiveId} ({count})
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
                  <Text style={styles.dashboardAlertCompactHive}>{alert.hiveId}</Text>
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
              {selectedDashboardAlert.hiveId} · {selectedDashboardAlert.date}
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
        <View style={[styles.overviewTile, { backgroundColor: dashboard.silentHives.length > 0 ? "#152566" : "#22C55E" }]}>
          <Ionicons name={dashboard.silentHives.length > 0 ? "wifi-outline" : "radio-outline"} size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>
            {dashboard.silentHives.length > 0 ? dashboard.silentHives.length : dashboard.totalHives}
          </Text>
          <Text style={styles.overviewTileLabel}>{dashboard.silentHives.length > 0 ? "Offline" : "All Online"}</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#22C55E" }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.activeHives}</Text>
          <Text style={styles.overviewTileLabel}>Harmonious</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.pendingAlerts}</Text>
          <Text style={styles.overviewTileLabel}>Alerts</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#D97706" }]}>
          <Ionicons name="warning-outline" size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.statusCounts["Pre-swarm"]}</Text>
          <Text style={styles.overviewTileLabel}>2 Queens!</Text>
        </View>
      </Pressable>

      {/* ── Hive State Donut ── */}
      <Pressable style={styles.card} onPress={() => navigation.navigate("Hives", { screen: "HiveList" })}>
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

      {/* ── Pre-swarm Trend ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Pre-swarm Trend</Text>
          <View style={styles.trendRangeRow}>
            {(["24h", "7d", "30d"] as const).map((r) => (
              <Pressable
                key={r}
                style={[styles.trendRangeBtn, trendRange === r && styles.trendRangeBtnActive]}
                onPress={() => setTrendRange(r)}
              >
                <Text style={[styles.trendRangeBtnText, trendRange === r && styles.trendRangeBtnTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TrendLineChart data={activeTrendData} />
      </View>

      {/* ── All Hives Metrics ── */}
      {dashboard.allHives && dashboard.allHives.length > 0 && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Hive Metrics Overview</Text>
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
          <AllHivesMetricsChart allHives={dashboard.allHives} />
        </View>
      )}

      {/* ── Key Metrics ── */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.gridTwo}>
        <MetricCard title="Avg Temperature" value={displayTemperature.toFixed(1)} unit="°C" subtitle={weatherSubtitle} />
        <MetricCard title="Avg Humidity" value={displayHumidity.toFixed(0)} unit="%" subtitle={weatherSubtitle} />
      </View>

      {/* ── Audio Ingestion ── */}
      <Text style={styles.sectionTitle}>Audio Ingestion</Text>
      <View style={styles.gridTwo}>
        <View style={styles.infoCard}>
          <Ionicons name="mic-outline" size={22} color={THEME.primary} />
          <Text style={styles.infoCardValue}>{dashboard.recordingsToday}</Text>
          <Text style={styles.infoCardLabel}>Recordings Today</Text>
          <Text style={styles.infoCardSub}>Across all hives</Text>
        </View>
        <View style={[styles.infoCard, dashboard.silentHives.length > 0 && styles.infoCardWarn]}>
          <Ionicons name="volume-mute-outline" size={22} color={dashboard.silentHives.length > 0 ? "#EF4444" : "#22C55E"} />
          <Text style={[styles.infoCardValue, { color: dashboard.silentHives.length > 0 ? "#EF4444" : "#22C55E" }]}>
            {dashboard.silentHives.length}
          </Text>
          <Text style={styles.infoCardLabel}>Silent Hives</Text>
          <Text style={styles.infoCardSub}>No audio in 8h+</Text>
        </View>
      </View>

      {dashboard.silentHives.length > 0 && (
        <View style={styles.silentHivesList}>
          {dashboard.silentHives.map((h) => (
            <View key={h.hiveId} style={styles.silentHiveRow}>
              <Ionicons name="radio-button-off-outline" size={14} color="#EF4444" />
              <Text style={styles.silentHiveText}>{h.hiveId}</Text>
              <Text style={styles.silentHiveTime}>Last seen {h.lastSeenHoursAgo}h ago</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Environmental Correlation ── */}
      {dashboard.highTempPreSwarmHives.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠ High Temp + Pre-swarm</Text>
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Hives showing elevated temperature alongside pre-swarm state</Text>
            {dashboard.highTempPreSwarmHives.map((h) => (
              <View key={h.hiveId} style={styles.corrRow}>
                <View style={styles.corrHiveChip}>
                  <Text style={styles.corrHiveChipText}>{h.hiveId}</Text>
                </View>
                <View style={styles.corrTempBar}>
                  <View style={[styles.corrTempFill, { width: `${Math.min(((h.temperatureC - 30) / 15) * 100, 100)}%` as any }]} />
                </View>
                <Text style={styles.corrTempValue}>{h.temperatureC}°C</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── System Health ── */}
      <Text style={styles.sectionTitle}>System Health</Text>
      <View style={styles.gridTwo}>
        <View style={[styles.infoCard, dashboard.lowConfidenceInferences > 0 && styles.infoCardWarn]}>
          <Ionicons name="help-circle-outline" size={22} color={dashboard.lowConfidenceInferences > 0 ? "#EF4444" : "#22C55E"} />
          <Text style={[styles.infoCardValue, { color: dashboard.lowConfidenceInferences > 0 ? "#EF4444" : "#22C55E" }]}>
            {dashboard.lowConfidenceInferences}
          </Text>
          <Text style={styles.infoCardLabel}>Low-Confidence Inferences</Text>
          <Text style={styles.infoCardSub}>Score &lt; 0.6</Text>
        </View>
      </View>
    </ScrollView>
  );
}
