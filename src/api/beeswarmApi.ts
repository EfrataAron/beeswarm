export type HiveStatus = "Healthy" | "Pre-swarm" | "Swarm" | "Abscondment";

export type Hive = {
  id: string;
  status: HiveStatus;
  latitude?: number;
  longitude?: number;
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
  // Alerts section
  mostAtRiskHive: { hiveId: string; alertCount: number };
  avgAcknowledgeTimeMinutes: number;
  pendingAlerts: number;
  acknowledgedAlerts: number;
  // Pre-swarm trend (last 7 days)
  preSwarmTrend: Array<{ day: string; count: number }>;
  // Audio ingestion
  recordingsToday: number;
  silentHives: Array<{ hiveId: string; lastSeenHoursAgo: number }>;
  // Environmental correlation
  highTempPreSwarmHives: Array<{ hiveId: string; temperatureC: number }>;
  // Advisory
  pendingAdvisoryActions: number;
  // ML confidence
  lowConfidenceInferences: number;
};

export type HiveDetailData = {
  id: string;
  name: string;
  location: string;
  status: HiveStatus;
  alertTitle: string;
  alertMessage: string;
  metrics: number[];
  metricSeries: Array<{
    timeLabel: string;
    temperatureC: number;
    humidityPercent: number;
  }>;
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

const BASE_URL =
  String((globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.EXPO_PUBLIC_API_BASE_URL ?? "")
    .replace(/\/$/, "")
    .trim();

const LOCAL_HIVES: Hive[] = [
  { id: "Hive A01", status: "Healthy", latitude: 0.3476, longitude: 32.5825 },
  { id: "Hive A02", status: "Pre-swarm", latitude: 0.3492, longitude: 32.5851 },
  { id: "Hive A03", status: "Healthy", latitude: 0.3459, longitude: 32.5798 },
  { id: "Hive A04", status: "Swarm", latitude: 0.3511, longitude: 32.5883 },
  { id: "Hive A05", status: "Abscondment", latitude: 0.3438, longitude: 32.5774 },
  { id: "Hive A06", status: "Healthy", latitude: 0.3526, longitude: 32.5817 },
  { id: "Hive A07", status: "Healthy", latitude: 0.3467, longitude: 32.5902 },
  { id: "Hive A08", status: "Pre-swarm", latitude: 0.3419, longitude: 32.5844 },
  { id: "Hive A09", status: "Healthy", latitude: 0.3543, longitude: 32.5768 },
  { id: "Hive A10", status: "Healthy", latitude: 0.3485, longitude: 32.5739 },
  { id: "Hive A11", status: "Swarm", latitude: 0.3446, longitude: 32.5916 },
  { id: "Hive A12", status: "Healthy", latitude: 0.3504, longitude: 32.5791 },
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
    mostAtRiskHive: { hiveId: "Hive A04", alertCount: 7 },
    avgAcknowledgeTimeMinutes: 42,
    pendingAlerts: 5,
    acknowledgedAlerts: 11,
    preSwarmTrend: [
      { day: "Mon", count: 1 },
      { day: "Tue", count: 1 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 2 },
      { day: "Fri", count: 3 },
      { day: "Sat", count: 2 },
      { day: "Sun", count: 2 },
    ],
    recordingsToday: 34,
    silentHives: [
      { hiveId: "Hive A05", lastSeenHoursAgo: 14 },
      { hiveId: "Hive A11", lastSeenHoursAgo: 9 },
    ],
    highTempPreSwarmHives: [
      { hiveId: "Hive A02", temperatureC: 37.2 },
      { hiveId: "Hive A08", temperatureC: 36.8 },
    ],
    pendingAdvisoryActions: 8,
    lowConfidenceInferences: 3,
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
    mostAtRiskHive: raw.mostAtRiskHive ?? raw.most_at_risk_hive ?? { hiveId: "N/A", alertCount: 0 },
    avgAcknowledgeTimeMinutes: Number(raw.avgAcknowledgeTimeMinutes ?? raw.avg_ack_time_minutes ?? 0),
    pendingAlerts: Number(raw.pendingAlerts ?? raw.pending_alerts ?? 0),
    acknowledgedAlerts: Number(raw.acknowledgedAlerts ?? raw.acknowledged_alerts ?? 0),
    preSwarmTrend: Array.isArray(raw.preSwarmTrend ?? raw.pre_swarm_trend) ? (raw.preSwarmTrend ?? raw.pre_swarm_trend) : [],
    recordingsToday: Number(raw.recordingsToday ?? raw.recordings_today ?? 0),
    silentHives: Array.isArray(raw.silentHives ?? raw.silent_hives) ? (raw.silentHives ?? raw.silent_hives) : [],
    highTempPreSwarmHives: Array.isArray(raw.highTempPreSwarmHives ?? raw.high_temp_pre_swarm_hives) ? (raw.highTempPreSwarmHives ?? raw.high_temp_pre_swarm_hives) : [],
    pendingAdvisoryActions: Number(raw.pendingAdvisoryActions ?? raw.pending_advisory_actions ?? 0),
    lowConfidenceInferences: Number(raw.lowConfidenceInferences ?? raw.low_confidence_inferences ?? 0),
  };
}

export async function fetchHives(search = ""): Promise<Hive[]> {
  if (!BASE_URL) {
    const q = search.trim().toLowerCase();
    return LOCAL_HIVES.filter((hive) => hive.id.toLowerCase().includes(q));
  }

  const raw = await requestJson<any>("/hives", search ? { search } : undefined);

  const rows: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.results)
          ? raw.results
          : [];

  const mapped = rows
    .map((item: any, index: number) => {
      const id = String(item.id ?? item.name ?? item.hiveId ?? `Hive-${index + 1}`);
      const status = normalizeStatus(String(item.status ?? item.state ?? "Healthy"));
      const fallbackLocation =
        LOCAL_HIVES.find((localHive) => localHive.id === id) ??
        LOCAL_HIVES[index % LOCAL_HIVES.length];
      const latitude = Number(
        item.latitude ??
          item.lat ??
          item.location?.latitude ??
          item.coordinates?.latitude ??
          item.coordinates?.lat ??
          item.position?.latitude ??
          item.position?.lat ??
          fallbackLocation?.latitude
      );
      const longitude = Number(
        item.longitude ??
          item.lng ??
          item.location?.longitude ??
          item.coordinates?.longitude ??
          item.coordinates?.lng ??
          item.position?.longitude ??
          item.position?.lng ??
          fallbackLocation?.longitude
      );

      return {
        id,
        status,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
      };
    })
    .sort((a: Hive, b: Hive) => a.id.localeCompare(b.id));

  if (mapped.length > 0) {
    return mapped;
  }

  const q = search.trim().toLowerCase();
  return LOCAL_HIVES.filter((hive) => hive.id.toLowerCase().includes(q));
}

function buildLocalHiveDetail(hiveId: string): HiveDetailData {
  const metricSeries = [
    { timeLabel: "09:00", temperatureC: 32.4, humidityPercent: 63 },
    { timeLabel: "10:00", temperatureC: 33.1, humidityPercent: 64 },
    { timeLabel: "11:00", temperatureC: 33.8, humidityPercent: 66 },
    { timeLabel: "12:00", temperatureC: 34.5, humidityPercent: 68 },
    { timeLabel: "13:00", temperatureC: 35.2, humidityPercent: 69 },
    { timeLabel: "14:00", temperatureC: 34.8, humidityPercent: 67 },
    { timeLabel: "15:00", temperatureC: 34.1, humidityPercent: 65 },
  ];

  return {
    id: hiveId,
    name: hiveId,
    location: "North Yard",
    status: "Pre-swarm",
    alertTitle: "Pre-swarm risk",
    alertMessage:
      "Activity and space usage indicate a pre-swarm pattern. Review frames and queen status.",
    metrics: metricSeries.map((point) => point.temperatureC),
    metricSeries,
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
  const rawMetricSeries = Array.isArray(raw.metricSeries)
    ? raw.metricSeries
    : Array.isArray(raw.metric_series)
      ? raw.metric_series
      : Array.isArray(raw.history)
        ? raw.history
        : [];

  const metricSeries =
    rawMetricSeries.length > 0
      ? rawMetricSeries.map((point: any, index: number) => ({
          timeLabel: String(
            point.timeLabel ?? point.time_label ?? point.time ?? `R${index + 1}`
          ),
          temperatureC: Number(
            point.temperatureC ?? point.temperature_c ?? point.temp ?? 0
          ),
          humidityPercent: Number(
            point.humidityPercent ?? point.humidity_percent ?? point.humidity ?? 0
          ),
        }))
      : [
          { timeLabel: "09:00", temperatureC: 32.4, humidityPercent: 63 },
          { timeLabel: "10:00", temperatureC: 33.1, humidityPercent: 64 },
          { timeLabel: "11:00", temperatureC: 33.8, humidityPercent: 66 },
          { timeLabel: "12:00", temperatureC: 34.5, humidityPercent: 68 },
          { timeLabel: "13:00", temperatureC: 35.2, humidityPercent: 69 },
          { timeLabel: "14:00", temperatureC: 34.8, humidityPercent: 67 },
          { timeLabel: "15:00", temperatureC: 34.1, humidityPercent: 65 },
        ];

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
      : metricSeries.map((point) => point.temperatureC),
    metricSeries,
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
