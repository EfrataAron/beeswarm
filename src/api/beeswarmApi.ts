import AsyncStorage from "@react-native-async-storage/async-storage";

export type HiveStatus = "Healthy" | "Pre-swarm" | "Swarm" | "Abscondment";

export type BeekeeperProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  profile_photo_url: string | null;
  api_key: string | null;
};

export type AuthResponse = {
  token: string;
  beekeeper: BeekeeperProfile;
};

const AUTH_TOKEN_KEY = "@bsads/auth_token";
const AUTH_USER_KEY  = "@bsads/auth_user";

let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

export async function initAuthFromStorage(): Promise<BeekeeperProfile | null> {
  try {
    const [token, raw] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      AsyncStorage.getItem(AUTH_USER_KEY),
    ]);
    if (!token) return null;
    _authToken = token;
    return raw ? (JSON.parse(raw) as BeekeeperProfile) : null;
  } catch {
    return null;
  }
}

function normalizeProfile(raw: Record<string, unknown>): BeekeeperProfile {
  return {
    id:                String(raw.id ?? ""),
    name:              String(raw.name ?? "Beekeeper"),
    email:             raw.email != null ? String(raw.email) : null,
    phone:             String(raw.phone ?? ""),
    address:           raw.address != null ? String(raw.address) : null,
    profile_photo_url: raw.profile_photo_url != null ? String(raw.profile_photo_url) : null,
    api_key:           raw.api_key != null ? String(raw.api_key) : null,
  };
}

export type Hive = {
  id: string;
  status: HiveStatus;
  latitude?: number;
  longitude?: number;
  stateSince?: string; // ISO timestamp when the hive entered its current state
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
  
  pendingAlerts: number;
  acknowledgedAlerts: number;
  // Pre-swarm trend (last 7 days)
  preSwarmTrend: Array<{ day: string; count: number }>;
  // Audio ingestion
  recordingsToday: number;
  silentHives: Array<{ hiveId: string; lastSeenHoursAgo: number }>;
  // Environmental correlation
  highTempPreSwarmHives: Array<{ hiveId: string; temperatureC: number }>;
  // All hives metrics
  allHives: Array<{ hiveId: string; temperatureC: number; humidityPercent: number }>;
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
  stateSince?: string;
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

export type AdvisoryAction = {
  id: string;
  description: string;
  priority: "High" | "Medium" | "Low";
};

export type Advisory = {
  id: string;
  alertId: string;
  type: "Preventive" | "Reactive";
  summary: string;
  actions: AdvisoryAction[];
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

export type AmbientWeather = {
  temperatureC: number;
  humidityPercent: number;
  observedAt: string;
  source: "open-meteo";
};

const BASE_URL =
  String((globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.EXPO_PUBLIC_API_BASE_URL ?? "")
    .replace(/\/$/, "")
    .trim();

const LOCAL_HIVES: Hive[] = [
  { id: "Hive A01", status: "Healthy",      latitude: 0.3476, longitude: 32.5825, stateSince: "2026-05-11T08:00:00Z" },
  { id: "Hive A02", status: "Pre-swarm",    latitude: 0.3492, longitude: 32.5851, stateSince: "2026-05-12T14:30:00Z" },
  { id: "Hive A03", status: "Healthy",      latitude: 0.3459, longitude: 32.5798, stateSince: "2026-05-09T06:00:00Z" },
  { id: "Hive A04", status: "Swarm",        latitude: 0.3511, longitude: 32.5883, stateSince: "2026-05-13T07:45:00Z" },
  { id: "Hive A05", status: "Abscondment",  latitude: 0.3438, longitude: 32.5774, stateSince: "2026-05-10T11:00:00Z" },
  { id: "Hive A06", status: "Healthy",      latitude: 0.3526, longitude: 32.5817, stateSince: "2026-05-08T09:00:00Z" },
  { id: "Hive A07", status: "Healthy",      latitude: 0.3467, longitude: 32.5902, stateSince: "2026-05-10T07:00:00Z" },
  { id: "Hive A08", status: "Pre-swarm",    latitude: 0.3419, longitude: 32.5844, stateSince: "2026-05-13T05:15:00Z" },
  { id: "Hive A09", status: "Healthy",      latitude: 0.3543, longitude: 32.5768, stateSince: "2026-05-07T10:00:00Z" },
  { id: "Hive A10", status: "Healthy",      latitude: 0.3485, longitude: 32.5739, stateSince: "2026-05-11T12:00:00Z" },
  { id: "Hive A11", status: "Swarm",        latitude: 0.3446, longitude: 32.5916, stateSince: "2026-05-13T09:00:00Z" },
  { id: "Hive A12", status: "Healthy",      latitude: 0.3504, longitude: 32.5791, stateSince: "2026-05-12T08:00:00Z" },
];

const LOCAL_ALERTS: AlertItem[] = [
  {
    id: "ALT-001",
    hiveId: "Hive A04",
    severity: "Critical",
    title: "Swarming risk detected",
    date: "2026-04-21 08:14",
    summary: "Rapid population rise and high queen cell activity detected. Immediate inspection recommended.",
  },
  {
    id: "ALT-002",
    hiveId: "Hive A02",
    severity: "Warning",
    title: "Pre-swarm pattern",
    date: "2026-04-21 07:30",
    summary: "Brood chamber congestion and reduced laying space. Monitor closely.",
  },
  {
    id: "ALT-003",
    hiveId: "Hive A09",
    severity: "Info",
    title: "Humidity deviation",
    date: "2026-04-20 15:00",
    summary: "Humidity trending above recommended threshold. Check ventilation.",
  },
  {
    id: "ALT-004",
    hiveId: "Hive A04",
    severity: "Warning",
    title: "Temperature spike",
    date: "2026-04-20 13:45",
    summary: "Internal hive temperature exceeded 37°C. Possible overcrowding.",
  },
  {
    id: "ALT-005",
    hiveId: "Hive A04",
    severity: "Info",
    title: "Acoustic anomaly",
    date: "2026-04-19 10:00",
    summary: "Unusual acoustic pattern detected. Model confidence: 72%.",
  },
  {
    id: "ALT-006",
    hiveId: "Hive A08",
    severity: "Warning",
    title: "Pre-swarm behaviour",
    date: "2026-04-21 06:50",
    summary: "Increased bee clustering near entrance. Pre-swarm indicators present.",
  },
  {
    id: "ALT-007",
    hiveId: "Hive A11",
    severity: "Critical",
    title: "Swarm detected",
    date: "2026-04-21 09:00",
    summary: "Active swarm event detected. Immediate action required.",
  },
];

const DEFAULT_WEATHER_COORDS = {
  latitude: 0.3476,
  longitude: 32.5825,
};

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
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

function getAverageHiveCoordinates() {
  const withCoords = LOCAL_HIVES.filter(
    (hive) =>
      typeof hive.latitude === "number" &&
      Number.isFinite(hive.latitude) &&
      typeof hive.longitude === "number" &&
      Number.isFinite(hive.longitude),
  );

  if (withCoords.length === 0) {
    return DEFAULT_WEATHER_COORDS;
  }

  const latitude =
    withCoords.reduce((sum, hive) => sum + (hive.latitude ?? 0), 0) /
    withCoords.length;
  const longitude =
    withCoords.reduce((sum, hive) => sum + (hive.longitude ?? 0), 0) /
    withCoords.length;

  return {
    latitude,
    longitude,
  };
}

export async function fetchAmbientWeather(
  latitude?: number,
  longitude?: number,
): Promise<AmbientWeather> {
  const coords =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
      ? { latitude, longitude }
      : getAverageHiveCoordinates();

  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current: "temperature_2m,relative_humidity_2m",
    timezone: "auto",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Weather API request failed (${response.status})`);
  }

  const raw = await response.json();
  const current = raw?.current;
  const temperatureC = Number(current?.temperature_2m);
  const humidityPercent = Number(current?.relative_humidity_2m);

  if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPercent)) {
    throw new Error("Weather API returned invalid weather values");
  }

  return {
    temperatureC,
    humidityPercent,
    observedAt: String(current?.time ?? new Date().toISOString()),
    source: "open-meteo",
  };
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
    allHives: LOCAL_HIVES.map((hive, idx) => {
      // Create varying temperatures: some cool, some normal, some warm, some hot
      const hiveNum = parseInt(hive.id.slice(-2), 10); // Extract numeric part (01-12)
      
      // Distribute 12 hives across different temperature ranges
      let baseTemp: number;
      if (hiveNum <= 3) {
        // Hives A01-A03: Cool (28-31°C)
        baseTemp = 28.5 + Math.random() * 2.5;
      } else if (hiveNum <= 6) {
        // Hives A04-A06: Normal (32-34.5°C)
        baseTemp = 32 + Math.random() * 2.5;
      } else if (hiveNum <= 9) {
        // Hives A07-A09: Warm (35-37°C) - slightly abnormal
        baseTemp = 35 + Math.random() * 2;
      } else {
        // Hives A10-A12: Hot (37-39°C) - abnormal
        baseTemp = 37 + Math.random() * 2;
      }
      
      // Humidity varies per hive - create natural variation
      let baseHumidity: number;
      if (hiveNum % 3 === 1) {
        // Lower humidity: 50-60%
        baseHumidity = 50 + Math.random() * 10;
      } else if (hiveNum % 3 === 2) {
        // Medium humidity: 60-70%
        baseHumidity = 60 + Math.random() * 10;
      } else {
        // Higher humidity: 70-80%
        baseHumidity = 70 + Math.random() * 10;
      }
      
      return {
        hiveId: hive.id,
        temperatureC: parseFloat(Math.min(39.9, Math.max(28, baseTemp)).toFixed(1)),
        humidityPercent: parseFloat(Math.min(100, Math.max(40, baseHumidity)).toFixed(0)),
      };
    }),
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
    pendingAlerts: Number(raw.pendingAlerts ?? raw.pending_alerts ?? 0),
    acknowledgedAlerts: Number(raw.acknowledgedAlerts ?? raw.acknowledged_alerts ?? 0),
    preSwarmTrend: Array.isArray(raw.preSwarmTrend ?? raw.pre_swarm_trend) ? (raw.preSwarmTrend ?? raw.pre_swarm_trend) : [],
    recordingsToday: Number(raw.recordingsToday ?? raw.recordings_today ?? 0),
    silentHives: Array.isArray(raw.silentHives ?? raw.silent_hives) ? (raw.silentHives ?? raw.silent_hives) : [],
    highTempPreSwarmHives: Array.isArray(raw.highTempPreSwarmHives ?? raw.high_temp_pre_swarm_hives) ? (raw.highTempPreSwarmHives ?? raw.high_temp_pre_swarm_hives) : [],
    allHives: Array.isArray(raw.allHives ?? raw.all_hives) ? (raw.allHives ?? raw.all_hives) : [],
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

      const rawSince = item.stateSince ?? item.state_since ?? item.state_entered_at ?? null;
      return {
        id,
        status,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        stateSince: rawSince ? String(rawSince) : undefined,
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

  const localHive = LOCAL_HIVES.find((h) => h.id === hiveId);
  return {
    id: hiveId,
    name: hiveId,
    location: "North Yard",
    status: localHive?.status ?? "Pre-swarm",
    stateSince: localHive?.stateSince,
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

  const rawSince = raw.stateSince ?? raw.state_since ?? raw.state_entered_at ?? null;
  return {
    id: String(raw.id ?? raw.name ?? hiveId),
    name: String(raw.name ?? raw.id ?? hiveId),
    location: String(raw.location ?? raw.site ?? "Unknown location"),
    status,
    stateSince: rawSince ? String(rawSince) : undefined,
    alertTitle: String(raw.alertTitle ?? raw.alert_title ?? "Pre-swarm risk"),
    alertMessage: String(
      raw.alertMessage ??
        raw.alert_message ??
        raw.message ??
        "Hive activity requires attention."
    ),
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics.map((value: unknown) => Number(value) || 0)
      : metricSeries.map((point: { temperatureC: number }) => point.temperatureC),
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

export async function fetchHiveAlerts(hiveId: string): Promise<AlertItem[]> {
  if (!BASE_URL) {
    return LOCAL_ALERTS.filter((a) => a.hiveId === hiveId);
  }
  try {
    const raw = await requestJson<any[]>(`/hives/${encodeURIComponent(hiveId)}/alerts`);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => ({
      id: String(item.id ?? `ALT-${index + 1}`),
      hiveId: String(item.hiveId ?? item.hive_id ?? hiveId),
      severity: normalizeSeverity(String(item.severity ?? item.level ?? "info")),
      title: String(item.title ?? item.alert ?? "Alert"),
      date: String(item.date ?? item.createdAt ?? item.created_at ?? ""),
      summary: String(item.summary ?? item.message ?? ""),
    }));
  } catch {
    return LOCAL_ALERTS.filter((a) => a.hiveId === hiveId);
  }
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

const LOCAL_ADVISORIES: Advisory[] = [
  {
    id: "ADV-001",
    alertId: "ALT-001",
    type: "Reactive",
    summary: "Swarming is imminent. Immediate intervention is required to prevent colony loss.",
    actions: [
      { id: "ACT-001-1", description: "Inspect hive frames for queen cells and remove excess ones", priority: "High" },
      { id: "ACT-001-2", description: "Add a super or additional brood box to relieve congestion", priority: "High" },
      { id: "ACT-001-3", description: "Consider splitting the colony to simulate a swarm", priority: "Medium" },
      { id: "ACT-001-4", description: "Mark and monitor the queen's activity over the next 48 hours", priority: "Medium" },
    ],
  },
  {
    id: "ADV-002",
    alertId: "ALT-002",
    type: "Preventive",
    summary: "Pre-swarm indicators detected. Act now to prevent a full swarm event.",
    actions: [
      { id: "ACT-002-1", description: "Check brood chamber for congestion and available laying space", priority: "High" },
      { id: "ACT-002-2", description: "Ensure adequate ventilation in the hive", priority: "Medium" },
      { id: "ACT-002-3", description: "Schedule a full hive inspection within 24 hours", priority: "High" },
    ],
  },
  {
    id: "ADV-003",
    alertId: "ALT-003",
    type: "Preventive",
    summary: "Humidity levels are above the recommended range. Address ventilation to avoid disease risk.",
    actions: [
      { id: "ACT-003-1", description: "Open hive entrance reducer to improve airflow", priority: "Medium" },
      { id: "ACT-003-2", description: "Check for water ingress or condensation inside the hive", priority: "Medium" },
      { id: "ACT-003-3", description: "Monitor humidity readings over the next 12 hours", priority: "Low" },
    ],
  },
  {
    id: "ADV-004",
    alertId: "ALT-004",
    type: "Reactive",
    summary: "Temperature spike detected. Overcrowding or disease may be the cause.",
    actions: [
      { id: "ACT-004-1", description: "Inspect hive for signs of disease or pest infestation", priority: "High" },
      { id: "ACT-004-2", description: "Provide shade or relocate hive if in direct sunlight", priority: "Medium" },
      { id: "ACT-004-3", description: "Add ventilation by propping the hive lid slightly", priority: "Low" },
    ],
  },
  {
    id: "ADV-005",
    alertId: "ALT-005",
    type: "Preventive",
    summary: "Acoustic anomaly detected with moderate model confidence. Monitor closely.",
    actions: [
      { id: "ACT-005-1", description: "Perform a visual inspection to rule out obvious issues", priority: "Medium" },
      { id: "ACT-005-2", description: "Re-run acoustic analysis in 6 hours to confirm pattern", priority: "Low" },
    ],
  },
  {
    id: "ADV-006",
    alertId: "ALT-006",
    type: "Preventive",
    summary: "Pre-swarm clustering observed near entrance. Early intervention recommended.",
    actions: [
      { id: "ACT-006-1", description: "Inspect entrance area and remove any clustering bees gently", priority: "High" },
      { id: "ACT-006-2", description: "Check internal space and add frames if needed", priority: "Medium" },
    ],
  },
  {
    id: "ADV-007",
    alertId: "ALT-007",
    type: "Reactive",
    summary: "Active swarm event in progress. Immediate action required to recover the colony.",
    actions: [
      { id: "ACT-007-1", description: "Locate the swarm cluster and prepare a capture box", priority: "High" },
      { id: "ACT-007-2", description: "Capture the swarm and re-hive in a prepared hive body", priority: "High" },
      { id: "ACT-007-3", description: "Inspect the original hive for a new queen or queen cells", priority: "High" },
      { id: "ACT-007-4", description: "Feed the captured swarm with sugar syrup to encourage settling", priority: "Medium" },
    ],
  },
];

// ── Auth & Profile ────────────────────────────────────────────────────────────

async function persistSession(token: string, beekeeper: BeekeeperProfile): Promise<void> {
  _authToken = token;
  await Promise.all([
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(beekeeper)),
  ]);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (!BASE_URL) {
    const beekeeper: BeekeeperProfile = {
      id: "BK0001",
      name: "Beekeeper",
      email,
      phone: "",
      address: null,
      profile_photo_url: null,
      api_key: null,
    };
    const token = `mock-${Date.now()}`;
    await persistSession(token, beekeeper);
    return { token, beekeeper };
  }

  const raw = await requestJson<Record<string, unknown>>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = String(raw.token ?? raw.access_token ?? "");
  const beekeeper = normalizeProfile((raw.beekeeper ?? raw.user ?? raw) as Record<string, unknown>);
  await persistSession(token, beekeeper);
  return { token, beekeeper };
}

export async function register(
  name: string,
  email: string,
  phone: string,
  password: string,
  apiKey: string,
): Promise<AuthResponse> {
  if (!BASE_URL) {
    const beekeeper: BeekeeperProfile = {
      id: `BK${Date.now()}`,
      name,
      email,
      phone,
      address: null,
      profile_photo_url: null,
      api_key: apiKey || null,
    };
    const token = `mock-${Date.now()}`;
    await persistSession(token, beekeeper);
    return { token, beekeeper };
  }

  const raw = await requestJson<Record<string, unknown>>("/auth/register", undefined, {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password, api_key: apiKey }),
  });

  const token = String(raw.token ?? raw.access_token ?? "");
  const beekeeper = normalizeProfile((raw.beekeeper ?? raw.user ?? raw) as Record<string, unknown>);
  await persistSession(token, beekeeper);
  return { token, beekeeper };
}

export async function logout(): Promise<void> {
  if (BASE_URL && _authToken) {
    try {
      await requestJson<void>("/auth/logout", undefined, { method: "POST" });
    } catch {
      // best-effort — always clear local session regardless
    }
  }
  _authToken = null;
  await Promise.all([
    AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    AsyncStorage.removeItem(AUTH_USER_KEY),
  ]);
}

export async function fetchProfile(): Promise<BeekeeperProfile> {
  if (!BASE_URL) {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as BeekeeperProfile) : {
      id: "BK0001", name: "Beekeeper", email: null, phone: "", address: null, profile_photo_url: null, api_key: null,
    };
  }

  const raw = await requestJson<Record<string, unknown>>("/profile");
  const profile = normalizeProfile(raw);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
  return profile;
}

export async function updateProfile(data: {
  name: string;
  email: string;
  phone: string;
  address: string;
  api_key: string;
}): Promise<BeekeeperProfile> {
  if (!BASE_URL) {
    const existing = await AsyncStorage.getItem(AUTH_USER_KEY);
    const base: BeekeeperProfile = existing
      ? (JSON.parse(existing) as BeekeeperProfile)
      : { id: "BK0001", name: "Beekeeper", email: null, phone: "", address: null, profile_photo_url: null, api_key: null };
    const updated: BeekeeperProfile = { ...base, ...data };
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    return updated;
  }

  const raw = await requestJson<Record<string, unknown>>("/profile", undefined, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const profile = normalizeProfile(raw);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
  return profile;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAdvisory(alertId: string): Promise<Advisory | null> {
  if (!BASE_URL) {
    return LOCAL_ADVISORIES.find((a) => a.alertId === alertId) ?? null;
  }
  try {
    const raw = await requestJson<any>(`/alerts/${encodeURIComponent(alertId)}/advisory`);
    return {
      id: String(raw.id ?? ""),
      alertId,
      type: raw.type === "Preventive" ? "Preventive" : "Reactive",
      summary: String(raw.summary ?? ""),
      actions: Array.isArray(raw.actions) ? raw.actions.map((a: any, i: number) => ({
        id: String(a.id ?? `act-${i}`),
        description: String(a.description ?? a.action_description ?? ""),
        priority: (["High", "Medium", "Low"].includes(a.priority) ? a.priority : "Medium") as "High" | "Medium" | "Low",
      })) : [],
    };
  } catch {
    return LOCAL_ADVISORIES.find((a) => a.alertId === alertId) ?? null;
  }
}
