import { HiveStatus, AlertSeverity } from "./api/beeswarmApi";

const LIGHT_THEME = {
  primary: "#001E37",
  accent: "#FFB268",
  page: "#F8F9FB",
  surface: "#FFFFFF",
  surfaceSoft: "#FFF5EA",
  line: "#DCE2EA",
  text: "#1F2A37",
  textMuted: "#667085",
  placeholder: "#98A2B3",
};

const DARK_THEME = {
  primary: "#E5E7EB",
  accent: "#FFB268",
  page: "#0B1220",
  surface: "#111827",
  surfaceSoft: "#1F2937",
  line: "#334155",
  text: "#E5E7EB",
  textMuted: "#94A3B8",
  placeholder: "#64748B",
};

export const THEME = { ...LIGHT_THEME };

export function applyThemeMode(isDarkMode: boolean): void {
  const nextTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;
  Object.assign(THEME, nextTheme);
}

export const STATUS_COLOR: Record<HiveStatus, string> = {
  Healthy: "#16A34A",
  "Pre-swarm": "#D97706",
  Swarm: "#DC2626",
  Abscondment: "#6B7280",
};

export function displayStatus(status: HiveStatus): string {
  if (status === "Healthy") return "Harmonious";
  if (status === "Pre-swarm") return "2 Queens!";
  if (status === "Swarm") return "Swarming";
  return "Empty";
}

export function statusCondition(status: HiveStatus): string {
  if (status === "Healthy") return "Colony stable";
  if (status === "Pre-swarm") return "Queen cells detected · Supercedure risk";
  if (status === "Swarm") return "Colony splitting · Immediate action needed";
  return "Missing queen · Colony may have departed";
}

export function formatStateDuration(since?: string): string {
  if (!since) return "";
  const ms = Date.now() - Date.parse(since);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function severityColor(severity: AlertSeverity): string {
  if (severity === "Critical") return "#DC2626";
  if (severity === "Warning") return "#D97706";
  return "#2563EB";
}
