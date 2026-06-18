import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AlertItem, AlertSeverity, fetchAlerts } from "../../../api";
import { THEME } from "../../../theme";
import { AlertsStackParamList } from "../../../navigation/types";
import { alertsListStyles as styles } from "./AlertsListScreen.styles";
import { useTheme } from "../../../hooks/useTheme";
import { usePolling } from "../../../hooks/usePolling";

type Props = NativeStackScreenProps<AlertsStackParamList, "AlertsList">;

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  Critical: "#DC2626",
  Warning: "#D97706",
  Info: "#2563EB",
};
const SEVERITY_BG: Record<AlertSeverity, string> = {
  Critical: "#FEF2F2",
  Warning: "#FFFBEB",
  Info: "#EFF6FF",
};
const SEVERITY_ICON: Record<AlertSeverity, keyof typeof Ionicons.glyphMap> = {
  Critical: "alert-circle",
  Warning: "warning",
  Info: "information-circle",
};
const ALL_SEVERITIES: AlertSeverity[] = ["Critical", "Warning", "Info"];

export function AlertsListScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPollingEnabled, setIsPollingEnabled] = useState(true);

  // Track which alerts have been opened to update the badge correctly
  const markAlertOpened = (alertId: string) => {
    if (!openedIds.has(alertId)) {
      setOpenedIds((prev) => new Set([...prev, alertId]));
      route.params?.onAlertOpened?.();
    }
  };

  const [openAlertMenu, setOpenAlertMenu] = useState<
  "severity" | "hive" | "latest" | null
>(null);

const [severityFilter, setSeverityFilter] =
  useState<AlertSeverity | "All">("All");

const [hiveFilter, setHiveFilter] = useState("All");

const [latestFilter, setLatestFilter] = useState(false);

const [selectedAlertId, setSelectedAlertId] =
  useState<string | null>(null);

  const [alertsError, setAlertsError] = useState<string | null>(null);
  
  const dashboardSeverityColor: Record<AlertSeverity, string> = {
  Critical: "#DC2626",
  Warning: "#D97706",
  Info: "#2563EB",
  };
  
  const severityCounts = useMemo(
  () => ({
    Critical: alerts.filter((a) => a.severity === "Critical").length,
    Warning: alerts.filter((a) => a.severity === "Warning").length,
    Info: alerts.filter((a) => a.severity === "Info").length,
  }),
  [alerts]
);

const hiveOptions = useMemo(() => {
  const counts = new Map<string, number>();

  alerts.forEach((alert) => {
    counts.set(
      alert.hiveName,
      (counts.get(alert.hiveName) ?? 0) + 1
    );
  });

  return Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
}, [alerts]);

const latestAlerts = useMemo(
  () =>
    [...alerts]
      .sort((a, b) => {
        const aTime = Date.parse(a.date.replace(" ", "T"));
        const bTime = Date.parse(b.date.replace(" ", "T"));

        return (
          (Number.isFinite(bTime) ? bTime : 0) -
          (Number.isFinite(aTime) ? aTime : 0)
        );
      })
      .slice(0, 6),
  [alerts]
);

const filteredDashboardAlerts = useMemo(
  () => {
    let result = alerts.filter((alert) => {
      const passesSeverity =
        severityFilter === "All" ||
        alert.severity === severityFilter;

      const passesHive =
        hiveFilter === "All" ||
        alert.hiveName === hiveFilter;

      return passesSeverity && passesHive;
    });

    if (latestFilter) {
      result = [...result]
        .sort((a, b) => {
          const aTime = Date.parse(a.date.replace(" ", "T"));
          const bTime = Date.parse(b.date.replace(" ", "T"));
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
        })
        .slice(0, 6);
    }

    return result;
  },
  [alerts, severityFilter, hiveFilter, latestFilter]
);

const selectedDashboardAlert = useMemo(() => {
  if (filteredDashboardAlerts.length === 0) return null;

  return (
    filteredDashboardAlerts.find(
      (a) => a.id === selectedAlertId
    ) ?? filteredDashboardAlerts[0]
  );
}, [filteredDashboardAlerts, selectedAlertId]);
  

  const loadAlerts = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError(null);
    setAlertsError(null);
    try {
      const data = await fetchAlerts();
      let finalAlerts = data;
      
      // Add sample alerts if none are returned (for testing)
      if (finalAlerts.length === 0) {
        finalAlerts = [
          {
            id: "sample-alert-1",
            hiveId: "hive-1",
            hiveName: "Sunny Side Hive",
            severity: "Warning" as AlertSeverity,
            title: "Pre-swarm Activity Detected",
            date: new Date().toLocaleString(),
            summary: "Model detected pre-swarm behavior patterns. Monitor closely for swarm preparations.",
            alertStatus: "pending"
          },
          {
            id: "sample-alert-2",
            hiveId: "hive-2",
            hiveName: "Forest Hive",
            severity: "Critical" as AlertSeverity,
            title: "Swarm Alert!",
            date: new Date(Date.now() - 3600000).toLocaleString(),
            summary: "Swarm activity detected! Immediate action may be required.",
            alertStatus: "pending"
          },
          {
            id: "sample-alert-3",
            hiveId: "hive-3",
            hiveName: "Orchard Hive",
            severity: "Info" as AlertSeverity,
            title: "Hive Status Normal",
            date: new Date(Date.now() - 7200000).toLocaleString(),
            summary: "Hive is operating normally with no issues detected.",
            alertStatus: "pending"
          },
        ];
      }
      
      setAlerts(finalAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts");
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  const { isPolling, lastUpdated } = usePolling({
    callback: loadAlerts,
    interval: 30000,
    enabled: isPollingEnabled,
  });

  useFocusEffect(
    useCallback(() => {
      setIsPollingEnabled(true);
      void loadAlerts(true);
      return () => setIsPollingEnabled(false);
    }, [])
  );

  const onRefreshAlerts = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  // useEffect(() => { void loadAlerts(); }, [loadAlerts]);

  // Clean up old filter variable usage
  const filtered = filteredDashboardAlerts;

  const activeFilterLabel = useMemo(() => {
    let label = "All alerts";
    if (severityFilter !== "All") {
      label = severityFilter + " alerts";
    }
    if (hiveFilter !== "All") {
      label = hiveFilter + " alerts";
    }
    if (latestFilter) {
      label = "Latest alerts";
    }
    return label;
  }, [severityFilter, hiveFilter, latestFilter]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.stateText}>Loading alerts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load alerts</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.primaryButtonSmall} onPress={() => void loadAlerts()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={[styles.appPage, { flexGrow: 1 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefreshAlerts()}
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
                  onPress={() => {
                    setSeverityFilter("All");
                    setHiveFilter("All");
                    setLatestFilter(false);
                    setOpenAlertMenu(null);
                  }}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, severityFilter === "All" && styles.dashboardAlertSubMenuItemTextActive]}>
                    All ({alerts.length})
                  </Text>
                </Pressable>
                {(["Critical", "Warning", "Info"] as AlertSeverity[]).map((severity) => (
                  <Pressable
                    key={severity}
                    style={[styles.dashboardAlertSubMenuItem, severityFilter === severity && styles.dashboardAlertSubMenuItemActive]}
                    onPress={() => {
                      setSeverityFilter(severity);
                      setHiveFilter("All");
                      setLatestFilter(false);
                      setOpenAlertMenu(null);
                    }}
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
                  onPress={() => {
                    setHiveFilter("All");
                    setSeverityFilter("All");
                    setLatestFilter(false);
                    setOpenAlertMenu(null);
                  }}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, hiveFilter === "All" && styles.dashboardAlertSubMenuItemTextActive]}>
                    All hives
                  </Text>
                </Pressable>
                {hiveOptions.map(([hiveName, count]) => (
                  <Pressable
                    key={hiveName}
                    style={[styles.dashboardAlertSubMenuItem, hiveFilter === hiveName && styles.dashboardAlertSubMenuItemActive]}
                    onPress={() => {
                      setHiveFilter(hiveName);
                      setSeverityFilter("All");
                      setLatestFilter(false);
                      setOpenAlertMenu(null);
                    }}
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
                <Pressable
                  style={[styles.dashboardAlertSubMenuItem, !latestFilter && styles.dashboardAlertSubMenuItemActive]}
                  onPress={() => {
                    setLatestFilter(false);
                    setSeverityFilter("All");
                    setHiveFilter("All");
                    setOpenAlertMenu(null);
                  }}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, !latestFilter && styles.dashboardAlertSubMenuItemTextActive]}>
                    Show all
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.dashboardAlertSubMenuItem, latestFilter && styles.dashboardAlertSubMenuItemActive]}
                  onPress={() => {
                    setLatestFilter(true);
                    setSeverityFilter("All");
                    setHiveFilter("All");
                    setOpenAlertMenu(null);
                  }}
                >
                  <Text style={[styles.dashboardAlertSubMenuItemText, latestFilter && styles.dashboardAlertSubMenuItemTextActive]}>
                    Show only latest 6
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {alertsError && <Text style={styles.dashboardAlertsInlineError}>{alertsError}</Text>}
        
        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dashboardAlertScroller}>
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
        </ScrollView> */}

        {/* {selectedDashboardAlert && (
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
                navigation.navigate("AlertDetails", {
  alertId: selectedDashboardAlert.id,
})
              }
            >
              <Text style={styles.dashboardAlertDetailsLinkText}>Open Full Details</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.primary} />
            </Pressable>
          </View>
        )} */}
      </View>

      {/* Filter pills */}
      <View style={styles.hiveSummaryStrip}>
        <Pressable
          style={[styles.hiveSummaryPill, (severityFilter === "All" && hiveFilter === "All" && !latestFilter) && styles.hiveSummaryPillActive]}
          onPress={() => {
            setSeverityFilter("All");
            setHiveFilter("All");
            setLatestFilter(false);
          }}
        >
          <Text style={[styles.hiveSummaryPillText, (severityFilter === "All" && hiveFilter === "All" && !latestFilter) && styles.hiveSummaryPillTextActive]}>
            All {alerts.length}
          </Text>
        </Pressable>
        {ALL_SEVERITIES.map((s) => {
          const count = alerts.filter((a) => a.severity === s).length;
          if (count === 0) return null;
          const active = severityFilter === s && hiveFilter === "All" && !latestFilter;
          return (
            <Pressable
              key={s}
              style={[
                styles.hiveSummaryPill,
                { borderColor: SEVERITY_COLOR[s] },
                active && { backgroundColor: SEVERITY_BG[s] },
              ]}
              onPress={() => {
                setSeverityFilter(active ? "All" : s);
                setHiveFilter("All");
                setLatestFilter(false);
              }}
            >
              <View style={[styles.hiveSummaryDot, { backgroundColor: SEVERITY_COLOR[s] }]} />
              <Text style={[styles.hiveSummaryPillText, { color: SEVERITY_COLOR[s] }]}>
                {s} {count}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[
            styles.hiveSummaryPill,
            { borderColor: THEME.primary },
            hiveFilter !== "All" && !latestFilter && { backgroundColor: THEME.surfaceSoft },
          ]}
          onPress={() => {
            setOpenAlertMenu(openAlertMenu === "hive" ? null : "hive");
            setSeverityFilter("All");
            setLatestFilter(false);
          }}
        >
          <Ionicons name="cube-outline" size={14} color={THEME.primary} />
          <Text style={[styles.hiveSummaryPillText, { color: THEME.primary }]}>
            Hive
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.hiveSummaryPill,
            { borderColor: THEME.primary },
            latestFilter && { backgroundColor: THEME.surfaceSoft },
          ]}
          onPress={() => {
            setLatestFilter(!latestFilter);
            setSeverityFilter("All");
            setHiveFilter("All");
            setOpenAlertMenu(null);
          }}
        >
          <Ionicons name="time-outline" size={14} color={THEME.primary} />
          <Text style={[styles.hiveSummaryPillText, { color: THEME.primary }]}>
            Latest
          </Text>
        </Pressable>

      </View>

      <Text style={styles.hiveListCount}>
        {filtered.length} {activeFilterLabel}
      </Text>

      {filtered.length === 0 && (
        <View style={styles.inlineState}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
          <Text style={styles.stateTextSmall}>No alerts</Text>
        </View>
      )}

      {filtered.map((alert) => (
        <Pressable
          key={alert.id}
          style={({ pressed }) => [styles.alertCard, pressed && styles.pressedRow]}
          onPress={() => {
            // Decrement badge only the first time this alert is opened
            markAlertOpened(alert.id);
            navigation.navigate("AlertDetails", {
              alertId: alert.id,
              onAlertOpened: () => markAlertOpened(alert.id),
            });
          }}
        >
          <View style={styles.alertCardBody}>
            <View style={styles.alertCardTopRow}>
              <View style={styles.alertCardIconWrap}>
                <Ionicons name={SEVERITY_ICON[alert.severity]} size={20} color={SEVERITY_COLOR[alert.severity]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertCardTitle}>{alert.title}</Text>
                <View style={styles.alertCardMeta}>
                  <Ionicons name="cube-outline" size={11} color={THEME.textMuted} />
                  <Text style={styles.alertCardMetaText}>{alert.hiveName}</Text>
                  <Text style={styles.alertCardMetaDot}>·</Text>
                  <Text style={styles.alertCardMetaText}>{alert.date}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={THEME.placeholder} />
            </View>
            <Text style={styles.alertCardSummary} numberOfLines={2}>{alert.summary}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
