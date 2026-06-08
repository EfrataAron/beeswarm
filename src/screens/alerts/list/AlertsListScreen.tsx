import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AlertItem, AlertSeverity, fetchAlerts } from "../../../api";
import { THEME } from "../../../theme";
import { AlertsStackParamList } from "../../../navigation/types";
import { alertsListStyles as styles } from "./AlertsListScreen.styles";

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

export function AlertsListScreen({ navigation }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertSeverity | "All">("All");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefreshAlerts = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  useEffect(() => { void loadAlerts(); }, [loadAlerts]);

  const filtered = filter === "All" ? alerts : alerts.filter((a) => a.severity === filter);

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
      {/* Filter pills */}
      <View style={styles.hiveSummaryStrip}>
        <Pressable
          style={[styles.hiveSummaryPill, filter === "All" && styles.hiveSummaryPillActive]}
          onPress={() => setFilter("All")}
        >
          <Text style={[styles.hiveSummaryPillText, filter === "All" && styles.hiveSummaryPillTextActive]}>
            All {alerts.length}
          </Text>
        </Pressable>
        {ALL_SEVERITIES.map((s) => {
          const count = alerts.filter((a) => a.severity === s).length;
          if (count === 0) return null;
          const active = filter === s;
          return (
            <Pressable
              key={s}
              style={[
                styles.hiveSummaryPill,
                { borderColor: SEVERITY_COLOR[s] },
                active && { backgroundColor: SEVERITY_BG[s] },
              ]}
              onPress={() => setFilter(active ? "All" : s)}
            >
              <View style={[styles.hiveSummaryDot, { backgroundColor: SEVERITY_COLOR[s] }]} />
              <Text style={[styles.hiveSummaryPillText, { color: SEVERITY_COLOR[s] }]}>
                {s} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hiveListCount}>
        {filtered.length} {filter === "All" ? "alerts" : filter.toLowerCase() + " alerts"}
      </Text>

      {filtered.length === 0 && (
        <View style={styles.inlineState}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
          <Text style={styles.stateTextSmall}>No alerts in this category</Text>
        </View>
      )}

      {filtered.map((alert) => (
        <Pressable
          key={alert.id}
          style={({ pressed }) => [styles.alertCard, pressed && styles.pressedRow]}
          onPress={() => navigation.navigate("AlertDetails", { alertId: alert.id })}
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
                  <Text style={styles.alertCardMetaText}>{alert.hiveId}</Text>
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
