/**
 * Alert service
 * Handles alert listing, details, and acknowledgments
 */

import { apiRequest } from "../client";
import { AlertItem, AlertDetailData, Advisory } from "../types";
import {
  normalizeAlertItem,
  normalizeHiveAlertItem,
  normalizeSeverity,
} from "../utils/normalizers";
import { fetchHiveDetail } from "./hive.service";

export async function fetchHiveAlerts(hiveId: string): Promise<AlertItem[]> {
  // Use the mobile alerts endpoint which properly formats data for mobile
  const raw = await apiRequest<any[]>(
    `/alerts?hive_id=${encodeURIComponent(hiveId)}`,
  );
  if (!Array.isArray(raw)) return [];
  console.log("Raw API Response:fetchHiveAlerts()", raw);

  return raw.map((item, i) => normalizeAlertItem(item, i));
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const raw = await apiRequest<any[]>("/alerts");
  if (!Array.isArray(raw)) return [];
  console.log("Raw API Response: /fetchAlerts()", raw);

  // Fetch hive details for each alert to get hive names
  const alertsWithHiveNames = await Promise.all(
    raw.map(async (item, i) => {
      const hiveId = item.hive_id ?? item.hiveId ?? "";
      let hiveName = item.hive_name ?? item.hiveName ?? "";

      // If hive name not provided, fetch it
      if (!hiveName && hiveId) {
        try {
          const hive = await fetchHiveDetail(hiveId);
          hiveName = hive.name;
          console.log(`Fetched hive name for ${hiveId}:`, hiveName);
        } catch (error) {
          console.warn(`Failed to fetch hive name for ${hiveId}:`, error);
          hiveName = hiveId; // Fallback to hive ID
        }
      }

      return normalizeAlertItem({ ...item, hiveName }, i);
    })
  );

  return alertsWithHiveNames;
}

export async function fetchAlertDetail(
  alertId: string,
): Promise<AlertDetailData> {
  const raw = await apiRequest<any>(`/alerts/${encodeURIComponent(alertId)}`);

  return {
    id: String(raw.id ?? alertId),
    hiveId: String(raw.hive_id ?? raw.hiveId ?? ""),
    hiveName: String(
      raw.hive_name ?? raw.hiveName ?? raw.hive_id ?? raw.hiveId ?? "",
    ),
    severity: normalizeSeverity(
      String(raw.severity ?? raw.level ?? raw.severity_level ?? "info"),
    ),
    title: String(raw.title ?? raw.alert ?? "Alert"),
    time: String(raw.time ?? raw.createdAt ?? raw.created_at ?? ""),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    details: String(
      raw.details ?? raw.summary ?? raw.message ?? raw.recommended_action ?? "",
    ),
    acknowledged: Boolean(
      raw.acknowledged ??
      raw.is_acknowledged ??
      raw.action_status === "acknowledged",
    ),
    audioRecording: raw.audio_recording
      ? {
          id: String(raw.audio_recording.id),
          file_path: String(raw.audio_recording.file_path),
          duration_seconds: Number(raw.audio_recording.duration_seconds ?? 30),
          recorded_at: String(raw.audio_recording.recorded_at),
        }
      : null,
    advisory: raw.advisory,
  };
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiRequest<void>(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: "POST",
  });
}

export async function fetchAdvisory(alertId: string): Promise<Advisory | null> {
  try {
    const raw = await apiRequest<any>(
      `/alerts/${encodeURIComponent(alertId)}/advisory`,
    );
    if (!raw) return null;

    return {
      id: String(raw.id ?? `advisory_${alertId}`),
      alertId: String(raw.alert_id ?? alertId),
      type:
        raw.type === "Preventive" || raw.type === "Reactive"
          ? raw.type
          : "Reactive",
      summary: String(raw.summary ?? ""),
      actions: Array.isArray(raw.actions)
        ? raw.actions.map((action: any) => ({
            id: String(action.id),
            description: String(action.description),
            priority:
              action.priority === "High" ||
              action.priority === "Medium" ||
              action.priority === "Low"
                ? action.priority
                : "Medium",
          }))
        : [],
    };
  } catch {
    return null;
  }
}
