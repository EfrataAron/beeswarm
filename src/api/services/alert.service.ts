/**
 * Alert service
 * Handles alert listing, details, and acknowledgments
 */

import { apiRequest } from "../client";
import { AlertItem, AlertDetailData, Advisory } from "../types";
import { normalizeAlertItem, normalizeHiveAlertItem, normalizeSeverity } from "../utils/normalizers";

export async function fetchHiveAlerts(hiveId: string): Promise<AlertItem[]> {
  const raw = await apiRequest<any[]>(`/hives/${encodeURIComponent(hiveId)}/alerts`);
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeHiveAlertItem(item, i, hiveId));
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const raw = await apiRequest<any[]>("/alerts");
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeAlertItem(item, i));
}

export async function fetchAlertDetail(
  alertId: string,
): Promise<AlertDetailData> {
  const raw = await apiRequest<any>(`/alerts/${encodeURIComponent(alertId)}`);
  return {
    id: String(raw.id ?? alertId),
    hiveId: String(raw.hive_id ?? raw.hiveId ?? ""),
    severity: normalizeSeverity(String(raw.severity ?? raw.level ?? "info")),
    title: String(raw.title ?? raw.alert ?? "Alert"),
    time: String(raw.time ?? raw.createdAt ?? raw.created_at ?? ""),
    details: String(raw.details ?? raw.summary ?? raw.message ?? ""),
    acknowledged: Boolean(raw.acknowledged ?? raw.is_acknowledged ?? false),
  };
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiRequest<void>(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
    method: "POST",
  });
}

export async function fetchAdvisory(
  _alertId: string,
): Promise<Advisory | null> {
  // Advisory endpoint does not exist in the Railway backend OpenAPI spec
  return null;
}
