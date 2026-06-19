import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import {
  Advisory,
  AlertDetailData,
  AlertSeverity,
  fetchAdvisory,
  fetchAlertDetail,
  acknowledgeAlert,
} from "../../../api";
import { getServerUrl } from "../../../api";
import { formatAbsoluteTime, formatRelativeTime } from "../../../theme";
import { useTheme } from "../../../hooks/useTheme";
import { AlertsStackParamList } from "../../../navigation/types";
import { createAlertDetailsStyles } from "./AlertDetailsScreen.styles";
import { useMemo } from "react";

type Props = NativeStackScreenProps<AlertsStackParamList, "AlertDetails">;

function severityColor(severity: AlertSeverity, theme: any): string {
  if (severity === "Critical") return theme.primary;
  return theme.accent;
}

function SeverityPill({ severity, theme, styles }: { severity: AlertSeverity; theme: any; styles: any }) {
  return (
    <View style={[styles.severityPill, { backgroundColor: `${severityColor(severity, theme)}20` }]}>
      <Text style={[styles.severityPillText, { color: severityColor(severity, theme) }]}>{severity}</Text>
    </View>
  );
}

function InfoRow({ label, value, valueColor, styles }: { label: string; value: string; valueColor?: string; styles: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function AlertDetailsScreen({ route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createAlertDetailsStyles(theme), [theme]);
  const { alertId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AlertDetailData | null>(null);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);

  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Notify badge to decrement when this alert is first viewed
  useEffect(() => {
    route.params?.onAlertOpened?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PRIORITY_COLOR = { High: "#DC2626", Medium: "#D97706", Low: "#16A34A" };

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlertDetail(alertId);
      setDetail(data);
      
      // Automatically acknowledge the alert when viewing details
      if (!data.acknowledged) {
        try {
          await acknowledgeAlert(alertId);
          // Update local state to reflect acknowledgment
          setDetail({ ...data, acknowledged: true });
        } catch (err) {
          console.warn("Failed to acknowledge alert automatically:", err);
          // Don't block the UI if acknowledgment fails
        }
      }
      
      // Load advisory if available from the detail response
      if (data.advisory) {
        setAdvisory(data.advisory);
      } else {
        // Try fetching advisory separately
        const adv = await fetchAdvisory(alertId);
        setAdvisory(adv);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alert details");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playAudio = async () => {
    if (!detail?.audioRecording) return;

    try {
      setAudioLoading(true);

      // If already playing, pause it
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        setAudioLoading(false);
        return;
      }

      // If sound exists but paused, resume
      if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
        setAudioLoading(false);
        return;
      }

      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: detail.audioRecording.file_path },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
      setAudioLoading(false);
    } catch (err) {
      setAudioLoading(false);
      Alert.alert(
        "Audio Error",
        "Could not play the audio recording. The file may not be available.",
        [{ text: "OK" }]
      );
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={theme.accent} />
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
      style={{ flex: 1, backgroundColor: theme.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero ── */}
      <View style={[styles.detailHeroCard, detail.acknowledged && { opacity: 0.7 }]}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHiveIconWrap}>
            <Ionicons name="alert-circle-outline" size={26} color={theme.accent} />
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.title}</Text>
            <Text style={styles.detailHeroMeta}>
              {/* {detail.hiveId} ·{detail.time} */}
              {formatAbsoluteTime(detail.time)}
            </Text>
          </View>
          <SeverityPill severity={detail.severity} theme={theme} styles={styles} />
        </View>
        {detail.acknowledged && (
          <View style={styles.alertClosedBanner}>
            <Ionicons name="checkmark-circle" size={14} color={theme.isDark ? "#22C55E" : "#16A34A"} />
            <Text style={styles.alertClosedText}>This alert has been acknowledged and closed</Text>
          </View>
        )}
      </View>

      {/* ── Alert Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert Information</Text>
        <InfoRow label="Severity" value={detail.severity} valueColor={severityColor(detail.severity, theme)} styles={styles} />
        <InfoRow label="Hive" value={detail.hiveName} styles={styles} />
        <InfoRow label="Time" value={formatAbsoluteTime(detail.time)} styles={styles} />
        <InfoRow label="Status" value={detail.acknowledged ? "Closed" : "Open"} valueColor={detail.acknowledged ? "#16A34A" : "#D97706"} styles={styles} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <Text style={styles.detailLongText}>{detail.details}</Text>
      </View>

      {/* ── Audio Recording ── */}
      {detail.audioRecording && (
        <View style={styles.card}>
          <View style={styles.audioHeader}>
            <Ionicons name="volume-high-outline" size={20} color={theme.accent} />
            <Text style={styles.cardTitle}>Audio Recording</Text>
          </View>
          <Text style={styles.audioSubtext}>
            {detail.audioRecording.recorded_at 
              ? `Recorded ${formatAbsoluteTime(detail.audioRecording.recorded_at)}`
              : `Listen to the hive recording (Duration: ${detail.audioRecording.duration_seconds}s)`}
          </Text>
          {detail.audioRecording.duration_seconds > 0 && (
            <Text style={styles.audioSubtext}>
             
            </Text>
          )}

          <View style={styles.audioControls}>
            <Pressable
              style={[styles.audioButton, isPlaying && styles.audioButtonPlaying]}
              onPress={playAudio}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.audioButtonText}>
                    {isPlaying ? "Pause" : "Play Recording"}
                  </Text>
                </>
              )}
            </Pressable>

            {sound && (
              <Pressable
                style={styles.audioButtonSecondary}
                onPress={stopAudio}
              >
                <Ionicons name="stop" size={20} color={theme.accent} />
                <Text style={styles.audioButtonSecondaryText}>Stop</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── Advisory ── */}
      {advisory && advisory.actions && advisory.actions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.advisoryHeader}>
            <View style={styles.advisoryTitleRow}>
              <Ionicons name="bulb-outline" size={18} color={theme.accent} />
              <Text style={styles.cardTitle}>Recommended Actions</Text>
            </View>
            <View style={[styles.advisoryTypeBadge, { backgroundColor: theme.isDark ? (advisory.type === "Reactive" ? "#450A0A" : "#064E3B") : (advisory.type === "Reactive" ? "#FEF2F2" : "#F0FDF4") }]}>
              <Text style={[styles.advisoryTypeText, { color: advisory.type === "Reactive" ? "#DC2626" : "#16A34A" }]}>
                {advisory.type}
              </Text>
            </View>
          </View>

          {detail.acknowledged && (
            <View style={styles.audioSubtext}>
              {/* <Ionicons name="information-circle-outline" size={16} color="#6B7280" /> */}
              <Text style={styles.advisoryNoteText}>
                Review these actions even though this alert has been acknowledged.
              </Text>
            </View>
          )}

          <Text style={styles.advisoryActionsTitle}>
            {advisory.actions.length} Action{advisory.actions.length !== 1 ? 's' : ''} to Take
          </Text>

          {advisory.actions.map((action, index) => (
            <View key={action.id} style={styles.advisoryActionRow}>
              <View style={styles.advisoryActionNumber}>
                <Text style={styles.advisoryActionNumberText}>{index + 1}</Text>
              </View>
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