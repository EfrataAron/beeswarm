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
  Advisory,
  AlertDetailData,
  AlertSeverity,
  fetchAdvisory,
  fetchAlertDetail,
} from "../../../api";
import { THEME } from "../../../theme";
import { AlertsStackParamList } from "../../../navigation/types";
import { alertDetailsStyles as styles } from "./AlertDetailsScreen.styles";

type Props = NativeStackScreenProps<AlertsStackParamList, "AlertDetails">;

function severityColor(severity: AlertSeverity): string {
  if (severity === "Critical") return THEME.primary;
  return THEME.accent;
}

function SeverityPill({ severity }: { severity: AlertSeverity }) {
  return (
    <View style={[styles.severityPill, { backgroundColor: `${severityColor(severity)}20` }]}>
      <Text style={[styles.severityPillText, { color: severityColor(severity) }]}>{severity}</Text>
    </View>
  );
}

function InfoRow({ label, value, valueColor = "#1F2A37" }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function AlertDetailsScreen({ route }: Props) {
  const { alertId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AlertDetailData | null>(null);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);

  const PRIORITY_COLOR = { High: "#DC2626", Medium: "#D97706", Low: "#16A34A" };

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, adv] = await Promise.all([
        fetchAlertDetail(alertId),
        fetchAdvisory(alertId),
      ]);
      setDetail(data);
      setAdvisory(adv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alert details");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.stateText}>Loading alert details...</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load alert</Text>
        <Text style={styles.errorBody}>{error ?? "No detail returned from API"}</Text>
        <Pressable style={styles.primaryButtonSmall} onPress={() => void loadDetail()}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero ── */}
      <View style={[styles.detailHeroCard, detail.acknowledged && { opacity: 0.7 }]}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHiveIconWrap}>
            <Ionicons name="alert-circle-outline" size={26} color={THEME.accent} />
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.title}</Text>
            <Text style={styles.detailHeroMeta}>
              {detail.hiveId} · {detail.time}
            </Text>
          </View>
          <SeverityPill severity={detail.severity} />
        </View>
        {detail.acknowledged && (
          <View style={styles.alertClosedBanner}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.alertClosedText}>This alert has been acknowledged and closed</Text>
          </View>
        )}
      </View>

      {/* ── Alert Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert Information</Text>
        <InfoRow label="Severity" value={detail.severity} valueColor={severityColor(detail.severity)} />
        <InfoRow label="Hive" value={detail.hiveId} />
        <InfoRow label="Time" value={detail.time} />
        <InfoRow label="Status" value={detail.acknowledged ? "Closed" : "Open"} valueColor={detail.acknowledged ? "#16A34A" : "#D97706"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <Text style={styles.detailLongText}>{detail.details}</Text>
      </View>

      {/* ── Advisory ── */}
      {advisory && !detail.acknowledged && (
        <View style={styles.card}>
          <View style={styles.advisoryHeader}>
            <View style={styles.advisoryTitleRow}>
              <Ionicons name="bulb-outline" size={18} color={THEME.accent} />
              <Text style={styles.cardTitle}>Advisory</Text>
            </View>
            <View style={[styles.advisoryTypeBadge, { backgroundColor: advisory.type === "Reactive" ? "#FEF2F2" : "#F0FDF4" }]}>
              <Text style={[styles.advisoryTypeText, { color: advisory.type === "Reactive" ? "#DC2626" : "#16A34A" }]}>
                {advisory.type}
              </Text>
            </View>
          </View>

          <Text style={styles.advisorySummary}>{advisory.summary}</Text>
          <Text style={styles.advisoryActionsTitle}>Recommended Actions</Text>

          {advisory.actions.map((action) => (
            <View key={action.id} style={styles.advisoryActionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.advisoryActionText}>{action.description}</Text>
              </View>
              <View style={[styles.advisoryPriorityDot, { backgroundColor: PRIORITY_COLOR[action.priority] }]} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
