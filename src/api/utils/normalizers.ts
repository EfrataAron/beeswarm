/**
 * Data normalization utilities
 * Transforms raw API responses into typed application models
 */

import {
  HiveStatus,
  AlertSeverity,
  BeekeeperProfile,
  AlertItem
} from "../types";

export function normalizeStatus(raw: string): HiveStatus {
  const s = raw.trim().toLowerCase();
  
  // If empty or "unknown", treat as inactive (no sensor data)
  if (!s || s === "" || s === "unknown" || s === "null" || s === "undefined")
    return "inactive_hive";
  
  if (
    s === "healthy" ||
    s === "normal" ||
    s === "active_colony" ||
    s === "active"

  )
    return "active";
  if (s === "inactive" || s === "inactive_hive") return "inactive_hive";
  if (
    s === "swarm" ||
    s === "swarming" ||
    s === "pre-swarm" ||
    s === "preswarm" ||
    s === "pre_swarm"
    
  )
    return "swarming";
  if (s === "abscondment") return "Abscondment";
  if (s === "external_noise" || s === "noise") return "external_noise";
  if (s === "quacking_queens" || s === "quacking" || s === "queenbee_present") return "quacking_queens";
  if (s === "pests" || s === "pest") return "pests";
  if (s === "queenless" || s === "no_queen") return "queenless";
  
  // Default fallback for unknown statuses - treat as inactive (no sensor data)
  return "inactive_hive";
}

export function normalizeSeverity(raw: string): AlertSeverity {
  const s = raw.trim().toLowerCase();
  if (s === "critical") return "Critical";
  if (s === "warning") return "Warning";
  return "Info";
}

export function normalizeProfile(
  raw: Record<string, unknown>
): BeekeeperProfile {
  return {
    id: String(raw.user_id ?? raw.id ?? ""),
    name: String(raw.full_name ?? raw.name ?? "Beekeeper"),
    email: raw.email != null ? String(raw.email) : null,
    phone: String(raw.phone ?? ""),
    address: raw.address != null ? String(raw.address) : null,
    profile_photo_url:
      raw.profile_photo_url != null ? String(raw.profile_photo_url) : null,
    api_key: raw.api_key != null ? String(raw.api_key) : null,
    server_url:
      raw.server_url != null ? normalizeUrl(String(raw.server_url)) : null,
  };
}

export function normalizeAlertItem(
  item: any,
  index: number,
  fallbackHiveId = "",
): AlertItem { 
  return {
    id: String(item.id ?? `ALT-${index + 1}`),
    hiveId: String(item.hive_id ?? item.hiveId ?? fallbackHiveId),
    severity: normalizeSeverity(String(item.severity ?? item.level ?? "info")),
    title: String(item.title ?? item.alert ?? "Alert"),
    date: String(item.date ?? item.createdAt ?? item.created_at ?? ""),
    summary: String(item.summary ?? item.message ?? ""),
    alertStatus: String(item.alertStatus ?? item.action_status ?? "pending"),
    hiveName: String(item.hive_name ?? item.hiveName ?? ""),
  };
}

export function normalizeHiveAlertItem(
  item: any,
  index: number,
  fallbackHiveId = "",
): AlertItem {
  return {
    id: String(item.alert_id ?? item.id ?? `ALT-${index + 1}`),
    hiveId: String(item.hive_id ?? item.hiveId ?? fallbackHiveId),
    severity: normalizeSeverity(
      String(item.severity_level ?? item.severity ?? item.level ?? "info"),
    ),
    title: String(
      item.title ?? item.recommended_action ?? item.action_status ?? "Alert",
    ),
    date: String(
      item.alert_timestamp ??
        item.date ??
        item.createdAt ??
        item.created_at ??
        "",
    ), 
    summary: String(
      item.recommended_action ?? item.summary ?? item.message ?? "",
    ),
    alertStatus: String(item.action_status ?? ""),
    hiveName: String(item.hive_name ?? item.hiveName ?? ""),
  };
}

export function normalizeUrl(url: string | null | undefined): string | null {
  const s = String(url ?? "")
    .trim()
    .replace(/\/$/, "");
  return s || null;
}

export function toFiniteOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function validateServerUrl(
  url: string | null | undefined,
): string | null {
  const s = normalizeUrl(url);
  if (!s) return "Server URL is required.";
  try {
    new URL(s);
    return null;
  } catch {
    return "Enter a valid URL, e.g. https://jockstrap-boxlike-revisable.ngrok-free.dev";
  }
}