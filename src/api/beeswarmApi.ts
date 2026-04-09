export type HiveStatus = "Healthy" | "Pre-swarm" | "Swarm" | "Abscondment";

export type Hive = {
  id: string;
  status: HiveStatus;
};

export type DashboardData = {
  totalHives: number;
  activeHives: number;
  statusCounts: Record<HiveStatus, number>;
  keyMetrics: {
    temperatureC: number;
    humidityPercent: number;
    populationKBees: number;
    nectarFlowKgPerDay: number;
  };
};

export type HiveDetailData = {
  id: string;
  name: string;
  location: string;
  status: HiveStatus;
  alertTitle: string;
  alertMessage: string;
  metrics: number[];
  mapLabel: string;
  acknowledged: boolean;
};

export type AlertSeverity = "Critical" | "Warning" | "Info";

export type AlertItem = {
  id: string;
  hiveId: string;
  severity: AlertSeverity;
  title: string;
  date: string;
  summary: string;
};

export type AlertDetailData = {
  id: string;
  hiveId: string;
  severity: AlertSeverity;
  title: string;
  time: string;
  details: string;
  acknowledged: boolean;
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

const LOCAL_HIVES: Hive[] = [
  { id: "Hive A01", status: "Healthy" },
  { id: "Hive A02", status: "Pre-swarm" },
  { id: "Hive A03", status: "Healthy" },
  { id: "Hive A04", status: "Swarm" },
  { id: "Hive A05", status: "Abscondment" },
  { id: "Hive A06", status: "Healthy" },
  { id: "Hive A07", status: "Healthy" },
  { id: "Hive A08", status: "Pre-swarm" },
  { id: "Hive A09", status: "Healthy" },
  { id: "Hive A10", status: "Healthy" },
  { id: "Hive A11", status: "Swarm" },
  { id: "Hive A12", status: "Healthy" },
];

const LOCAL_ALERTS: AlertItem[] = [
  {
    id: "ALT-001",
    hiveId: "Hive A04",
    severity: "Critical",
    title: "Swarming risk detected",
    date: "2026-04-09",
    summary: "Rapid population rise and high queen cell activity.",
  },
  {
    id: "ALT-002",
    hiveId: "Hive A02",
    severity: "Warning",
    title: "Pre-swarm pattern",
    date: "2026-04-09",
    summary: "Brood chamber congestion and reduced laying space.",
  },
  {
    id: "ALT-003",
    hiveId: "Hive A09",
    severity: "Info",
    title: "Humidity deviation",
    date: "2026-04-08",
    summary: "Humidity trending above recommended threshold.",
  },
];

async function requestJson<T>(
  path: string,
  query?: Record<string, string>,
  init?: RequestInit
): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_BASE_URL. Add it to your environment to connect to backend API."
    );
  }

  const params = new URLSearchParams(query).toString();
  const url = `${BASE_URL}${path}${params ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

function normalizeStatus(value: string): HiveStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === "healthy" || normalized === "normal") {
    return "Healthy";
  }
  if (
    normalized === "pre-swarm" ||
    normalized === "preswarm" ||
    normalized === "pre_swarm"
  ) {
    return "Pre-swarm";
  }
  if (normalized === "swarm") {
    return "Swarm";
  }

  return "Abscondment";
}

function buildLocalDashboard(): DashboardData {
  const totalHives = LOCAL_HIVES.length;
  const activeHives = LOCAL_HIVES.filter((hive) => hive.status !== "Abscondment").length;

  return {
    totalHives,
    activeHives,
    statusCounts: {
      Healthy: LOCAL_HIVES.filter((hive) => hive.status === "Healthy").length,
      "Pre-swarm": LOCAL_HIVES.filter((hive) => hive.status === "Pre-swarm").length,
      Swarm: LOCAL_HIVES.filter((hive) => hive.status === "Swarm").length,
      Abscondment: LOCAL_HIVES.filter((hive) => hive.status === "Abscondment").length,
    },
    keyMetrics: {
      temperatureC: 34.5,
      humidityPercent: 68,
      populationKBees: 120,
      nectarFlowKgPerDay: 1.2,
    },
  };
}

export async function fetchDashboard(): Promise<DashboardData> {
  if (!BASE_URL) {
    return buildLocalDashboard();
  }

  const raw = await requestJson<any>("/dashboard");

  const totalHives = Number(raw.totalHives ?? raw.total_hives ?? 0);
  const activeHives = Number(raw.activeHives ?? raw.active_hives ?? 0);
  const counts = raw.statusCounts ?? raw.status_counts ?? {};
  const metrics = raw.keyMetrics ?? raw.key_metrics ?? {};

  return {
    totalHives,
    activeHives,
    statusCounts: {
      Healthy: Number(counts.Healthy ?? counts.healthy ?? counts.normal ?? 0),
      "Pre-swarm": Number(
        counts["Pre-swarm"] ?? counts.preSwarm ?? counts.pre_swarm ?? 0
      ),
      Swarm: Number(counts.Swarm ?? counts.swarm ?? 0),
      Abscondment: Number(
        counts.Abscondment ?? counts.abscondment ?? counts.absconded ?? 0
      ),
    },
    keyMetrics: {
      temperatureC: Number(
        metrics.temperatureC ?? metrics.temperature_c ?? metrics.avg_temp ?? 0
      ),
      humidityPercent: Number(
        metrics.humidityPercent ?? metrics.humidity_percent ?? metrics.avg_humidity ?? 0
      ),
      populationKBees: Number(
        metrics.populationKBees ?? metrics.population_k_bees ?? metrics.population ?? 0
      ),
      nectarFlowKgPerDay: Number(
        metrics.nectarFlowKgPerDay ??
          metrics.nectar_flow_kg_per_day ??
          metrics.nectar_flow ??
          0
      ),
    },
  };
}

export async function fetchHives(search = ""): Promise<Hive[]> {
  if (!BASE_URL) {
    const q = search.trim().toLowerCase();
    return LOCAL_HIVES.filter((hive) => hive.id.toLowerCase().includes(q));
  }

  const raw = await requestJson<any[]>("/hives", search ? { search } : undefined);

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      const id = String(item.id ?? item.name ?? item.hiveId ?? `Hive-${index + 1}`);
      const status = normalizeStatus(String(item.status ?? item.state ?? "Healthy"));
      return { id, status };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function buildLocalHiveDetail(hiveId: string): HiveDetailData {
  return {
    id: hiveId,
    name: hiveId,
    location: "North Yard",
    status: "Pre-swarm",
    alertTitle: "Pre-swarm risk",
    alertMessage:
      "Activity and space usage indicate a pre-swarm pattern. Review frames and queen status.",
    metrics: [18, 22, 28, 30, 35, 40, 47],
    mapLabel: hiveId,
    acknowledged: false,
  };
}

export async function fetchHiveDetail(hiveId: string): Promise<HiveDetailData> {
  if (!BASE_URL) {
    return buildLocalHiveDetail(hiveId);
  }

  const raw = await requestJson<any>(`/hives/${encodeURIComponent(hiveId)}`);
  const status = normalizeStatus(String(raw.status ?? raw.state ?? "Pre-swarm"));

  return {
    id: String(raw.id ?? raw.name ?? hiveId),
    name: String(raw.name ?? raw.id ?? hiveId),
    location: String(raw.location ?? raw.site ?? "Unknown location"),
    status,
    alertTitle: String(raw.alertTitle ?? raw.alert_title ?? "Pre-swarm risk"),
    alertMessage: String(
      raw.alertMessage ??
        raw.alert_message ??
        raw.message ??
        "Hive activity requires attention."
    ),
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics.map((value: unknown) => Number(value) || 0)
      : [18, 22, 28, 30, 35, 40, 47],
    mapLabel: String(raw.mapLabel ?? raw.map_label ?? hiveId),
    acknowledged: Boolean(raw.acknowledged ?? raw.isAcknowledged ?? false),
  };
}

export async function acknowledgeHiveAlert(hiveId: string): Promise<void> {
  if (!BASE_URL) {
    return;
  }

  await requestJson<void>(`/hives/${encodeURIComponent(hiveId)}/acknowledge`, undefined, {
    method: "POST",
  });
}

function normalizeSeverity(value: string): AlertSeverity {
  const normalized = value.trim().toLowerCase();
  if (normalized === "critical") {
    return "Critical";
  }
  if (normalized === "warning") {
    return "Warning";
  }
  return "Info";
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  if (!BASE_URL) {
    return LOCAL_ALERTS;
  }

  const raw = await requestJson<any[]>("/alerts");
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item, index) => ({
    id: String(item.id ?? `ALT-${index + 1}`),
    hiveId: String(item.hiveId ?? item.hive_id ?? item.hive ?? "Unknown hive"),
    severity: normalizeSeverity(String(item.severity ?? item.level ?? "info")),
    title: String(item.title ?? item.alert ?? "Alert"),
    date: String(item.date ?? item.createdAt ?? item.created_at ?? ""),
    summary: String(item.summary ?? item.message ?? ""),
  }));
}

export async function fetchAlertDetail(alertId: string): Promise<AlertDetailData> {
  if (!BASE_URL) {
    const local = LOCAL_ALERTS.find((alert) => alert.id === alertId);
    return {
      id: local?.id ?? alertId,
      hiveId: local?.hiveId ?? "Hive A01",
      severity: local?.severity ?? "Info",
      title: local?.title ?? "Alert",
      time: local?.date ?? "2026-04-09 09:00",
      details:
        local?.summary ??
        "Sensor patterns indicate a potential issue. Review hive conditions and schedule inspection.",
      acknowledged: false,
    };
  }

  const raw = await requestJson<any>(`/alerts/${encodeURIComponent(alertId)}`);
  return {
    id: String(raw.id ?? alertId),
    hiveId: String(raw.hiveId ?? raw.hive_id ?? raw.hive ?? "Unknown hive"),
    severity: normalizeSeverity(String(raw.severity ?? raw.level ?? "info")),
    title: String(raw.title ?? raw.alert ?? "Alert"),
    time: String(raw.time ?? raw.createdAt ?? raw.created_at ?? ""),
    details: String(raw.details ?? raw.summary ?? raw.message ?? ""),
    acknowledged: Boolean(raw.acknowledged ?? raw.isAcknowledged ?? false),
  };
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  if (!BASE_URL) {
    return;
  }

  await requestJson<void>(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, undefined, {
    method: "POST",
  });
}
