/**
 * BSADS API client — Railway production backend only.
 *
 * Base URL: https://bsads-api-production.up.railway.app
 *
 * All functions make real HTTP requests. There is no mock data fallback.
 * Screens handle loading/error states themselves.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HiveStatus = "Healthy" | "Pre-swarm" | "Swarm" | "Abscondment";
export type AlertSeverity = "Critical" | "Warning" | "Info";

export type BeekeeperProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  profile_photo_url: string | null;
  api_key: string | null;
  server_url: string | null;
};

export type AuthResponse = {
  token: string;
  beekeeper: BeekeeperProfile;
};

export type Hive = {
  id: string;
  status: HiveStatus;
  latitude?: number;
  longitude?: number;
  stateSince?: string;
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
  pendingAlerts: number;
  acknowledgedAlerts: number;
  preSwarmTrend: Array<{ day: string; count: number }>;
  recordingsToday: number;
  silentHives: Array<{ hiveId: string; lastSeenHoursAgo: number }>;
  highTempPreSwarmHives: Array<{ hiveId: string; temperatureC: number }>;
  allHives: Array<{ hiveId: string; temperatureC: number; humidityPercent: number }>;
  pendingAdvisoryActions: number;
  lowConfidenceInferences: number;
};

export type AmbientWeather = {
  temperatureC: number;
  humidityPercent: number;
  observedAt: string;
  source: "open-meteo";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RAILWAY_URL = "https://bsads-api-production.up.railway.app";

const AUTH_TOKEN_KEY = "@bsads/auth_token";
const AUTH_USER_KEY  = "@bsads/auth_user";
const SERVER_URL_KEY = "@bsads/server_url";

// ─── In-memory state ──────────────────────────────────────────────────────────

let _authToken: string | null = null;
let _serverUrl: string = RAILWAY_URL;

// Called when the backend returns 401 — allows App.tsx to redirect to login
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  _onUnauthorized = handler;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function normalizeUrl(url: string | null | undefined): string | null {
  const s = String(url ?? "").trim().replace(/\/$/, "");
  return s || null;
}

export function getServerUrl(): string {
  return _serverUrl;
}

export function setServerUrl(url: string | null): void {
  _serverUrl = normalizeUrl(url) ?? RAILWAY_URL;
}

export function getAuthToken(): string | null {
  return _authToken;
}

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

// ─── Core HTTP function ───────────────────────────────────────────────────────

async function api<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> },
): Promise<T> {
  const base = _serverUrl || RAILWAY_URL;
  const qs = init?.query
    ? "?" + new URLSearchParams(init.query).toString()
    : "";
  const url = `${base}${path}${qs}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      body: init?.body,
    });
  } catch (networkErr) {
    // fetch() itself threw — no network, DNS failure, or CORS
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    if (msg.toLowerCase().includes("network request failed") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network error")) {
      throw new Error(
        "Cannot reach the server. Check your internet connection and try again."
      );
    }
    throw new Error(`Network error: ${msg}`);
  }

  // Empty response
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text.trim()) return undefined as T;

  // Error response — try to extract FastAPI detail message
  if (!response.ok) {
    // 401 = token expired or invalid → clear session and redirect to login
    if (response.status === 401) {
      _authToken = null;
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]).catch(() => {});
      _onUnauthorized?.();
    }

    let message = `Request failed (${response.status})`;
    try {
      const err = JSON.parse(text);
      if (typeof err?.detail === "string") message = err.detail;
      else if (Array.isArray(err?.detail))
        message = err.detail.map((d: any) => d?.msg ?? d).join(", ");
    } catch {}
    throw new Error(message);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 100)}`);
  }
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normalizeStatus(raw: string): HiveStatus {
  const s = raw.trim().toLowerCase();
  if (s === "healthy" || s === "normal" || s === "active_colony") return "Healthy";
  if (s === "pre-swarm" || s === "preswarm" || s === "pre_swarm" ||
      s === "queenbee_present") return "Pre-swarm";
  if (s === "swarm" || s === "swarming") return "Swarm";
  return "Abscondment";
}

function normalizeSeverity(raw: string): AlertSeverity {
  const s = raw.trim().toLowerCase();
  if (s === "critical") return "Critical";
  if (s === "warning")  return "Warning";
  return "Info";
}

function normalizeProfile(raw: Record<string, unknown>): BeekeeperProfile {
  return {
    // Backend returns user_id, not id
    id:                String(raw.user_id ?? raw.id ?? ""),
    // Backend returns full_name, not name
    name:              String(raw.full_name ?? raw.name ?? "Beekeeper"),
    email:             raw.email != null ? String(raw.email) : null,
    phone:             String(raw.phone ?? ""),
    address:           raw.address != null ? String(raw.address) : null,
    profile_photo_url: raw.profile_photo_url != null ? String(raw.profile_photo_url) : null,
    api_key:           raw.api_key != null ? String(raw.api_key) : null,
    server_url:        raw.server_url != null ? normalizeUrl(String(raw.server_url)) : null,
  };
}

function normalizeAlertItem(item: any, index: number, fallbackHiveId = ""): AlertItem {
  return {
    id:       String(item.id ?? `ALT-${index + 1}`),
    // Backend sends hive_id (MobileAlertResponse schema)
    hiveId:   String(item.hive_id ?? item.hiveId ?? fallbackHiveId),
    severity: normalizeSeverity(String(item.severity ?? item.level ?? "info")),
    title:    String(item.title ?? item.alert ?? "Alert"),
    date:     String(item.date ?? item.createdAt ?? item.created_at ?? ""),
    summary:  String(item.summary ?? item.message ?? ""),
  };
}

// AlertResponse (from GET /hives/{id}/alerts) uses different field names
// than MobileAlertResponse (from GET /alerts)
function normalizeHiveAlertItem(item: any, index: number, fallbackHiveId = ""): AlertItem {
  return {
    // AlertResponse uses alert_id not id
    id:       String(item.alert_id ?? item.id ?? `ALT-${index + 1}`),
    hiveId:   String(item.hive_id  ?? item.hiveId ?? fallbackHiveId),
    // AlertResponse uses severity_level not severity
    severity: normalizeSeverity(String(item.severity_level ?? item.severity ?? item.level ?? "info")),
    // AlertResponse has no title — use recommended_action or action_status
    title:    String(item.title ?? item.recommended_action ?? item.action_status ?? "Alert"),
    // AlertResponse uses alert_timestamp not date
    date:     String(item.alert_timestamp ?? item.date ?? item.createdAt ?? item.created_at ?? ""),
    summary:  String(item.recommended_action ?? item.summary ?? item.message ?? ""),
  };
}

// ─── Session persistence ──────────────────────────────────────────────────────

async function persistSession(token: string, profile: BeekeeperProfile): Promise<void> {
  _authToken = token;
  await Promise.all([
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile)),
  ]);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function initAuthFromStorage(): Promise<BeekeeperProfile | null> {
  try {
    const [token, raw] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      AsyncStorage.getItem(AUTH_USER_KEY),
    ]);
    if (!token || !raw) return null;
    _authToken = token;
    return JSON.parse(raw) as BeekeeperProfile;
  } catch {
    return null;
  }
}

/**
 * POST /auth/login
 * Router: api/routers/auth.py
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const raw = await api<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // Backend response: { access_token: string, token_type: string, user: UserResponse }
  const token = String(raw.access_token ?? raw.token ?? "");
  if (!token) throw new Error("Login succeeded but no token was returned.");

  // Backend user object: { user_id, full_name, email, role, created_at }
  const userRaw = (raw.user ?? raw.beekeeper ?? raw) as Record<string, unknown>;
  const beekeeper = normalizeProfile(userRaw);

  await persistSession(token, beekeeper);
  return { token, beekeeper };
}

/**
 * POST /auth/register
 * Router: api/routers/auth.py
 */
export async function register(
  name: string,
  email: string,
  phone: string,
  password: string,
  apiKey?: string | null,
): Promise<AuthResponse> {
  const raw = await api<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: name,   // backend expects full_name not name
      email,
      phone,
      password,
      ...(apiKey?.trim() ? { api_key: apiKey.trim() } : {}),
    }),
  });

  // Backend response: { access_token: string, token_type: string, user: UserResponse }
  const token = String(raw.access_token ?? raw.token ?? "");
  if (!token) throw new Error("Registration succeeded but no token was returned.");

  const userRaw = (raw.user ?? raw.beekeeper ?? raw) as Record<string, unknown>;
  const beekeeper = normalizeProfile(userRaw);

  await persistSession(token, beekeeper);
  return { token, beekeeper };
}

/**
 * POST /auth/logout
 * Router: api/routers/auth.py
 */
export async function logout(): Promise<void> {
  try {
    if (_authToken) {
      await api<void>("/auth/logout", { method: "POST" });
    }
  } catch {
    // Always clear local session even if server call fails
  } finally {
    _authToken = null;
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * GET /auth/me
 * Router: api/routers/auth.py
 */
export async function fetchProfile(): Promise<BeekeeperProfile> {
  const raw = await api<any>("/auth/me");
  const profile = normalizeProfile(raw);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
  return profile;
}

/**
 * PUT /auth/me
 * Router: api/routers/auth.py
 * Backend ProfileUpdate only accepts: full_name, phone, address
 */
export async function updateProfile(data: {
  name: string;
  email?: string;
  phone: string;
  address: string;
  api_key?: string;
  server_url?: string;
}): Promise<BeekeeperProfile> {
  const raw = await api<any>("/auth/me", {
    method: "PUT",
    body: JSON.stringify({
      full_name: data.name,   // backend field is full_name
      phone:     data.phone,
      address:   data.address,
    }),
  });
  const profile = normalizeProfile(raw);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
  return profile;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * GET /dashboard
 * Router: api/routers/dashboard.py
 * Backend schema: DashboardResponse → { total_hives, active_hives, status_counts, key_metrics }
 */
export async function fetchDashboard(): Promise<DashboardData> {
  const raw = await api<any>("/dashboard");

  // Backend: DashboardStatusCounts { normal, pre_swarm, swarm, abscondment, other }
  const counts  = raw?.status_counts ?? raw?.statusCounts ?? {};
  // Backend: DashboardKeyMetrics { temperature_c, humidity_percent, population_k_bees, nectar_flow_kg_per_day }
  const metrics = raw?.key_metrics   ?? raw?.keyMetrics   ?? {};

  return {
    totalHives:  Number(raw?.total_hives  ?? raw?.totalHives  ?? 0),
    activeHives: Number(raw?.active_hives ?? raw?.activeHives ?? 0),
    statusCounts: {
      // Backend uses "normal" not "Healthy"
      Healthy:     Number(counts.normal      ?? counts.Healthy     ?? counts.healthy ?? 0),
      "Pre-swarm": Number(counts.pre_swarm   ?? counts["Pre-swarm"] ?? counts.preSwarm ?? 0),
      Swarm:       Number(counts.swarm       ?? counts.Swarm       ?? 0),
      Abscondment: Number(counts.abscondment ?? counts.Abscondment ?? 0),
    },
    keyMetrics: {
      temperatureC:       Number(metrics.temperature_c        ?? metrics.temperatureC       ?? 0),
      humidityPercent:    Number(metrics.humidity_percent     ?? metrics.humidityPercent    ?? 0),
      populationKBees:    Number(metrics.population_k_bees   ?? metrics.populationKBees    ?? 0),
      nectarFlowKgPerDay: Number(metrics.nectar_flow_kg_per_day ?? metrics.nectarFlowKgPerDay ?? 0),
    },
    // Fields not in DashboardResponse schema — default to 0/[]
    // Backend may add these later or they come from separate endpoints
    pendingAlerts:           Number(raw?.pending_alerts           ?? raw?.pendingAlerts           ?? 0),
    acknowledgedAlerts:      Number(raw?.acknowledged_alerts      ?? raw?.acknowledgedAlerts      ?? 0),
    preSwarmTrend:           Array.isArray(raw?.pre_swarm_trend   ?? raw?.preSwarmTrend)    ? (raw?.pre_swarm_trend ?? raw?.preSwarmTrend) : [],
    recordingsToday:         Number(raw?.recordings_today         ?? raw?.recordingsToday         ?? 0),
    silentHives:             Array.isArray(raw?.silent_hives      ?? raw?.silentHives)      ? (raw?.silent_hives   ?? raw?.silentHives)   : [],
    highTempPreSwarmHives:   Array.isArray(raw?.high_temp_pre_swarm_hives ?? raw?.highTempPreSwarmHives)
      ? (raw?.high_temp_pre_swarm_hives ?? raw?.highTempPreSwarmHives) : [],
    allHives:                Array.isArray(raw?.all_hives         ?? raw?.allHives)         ? (raw?.all_hives      ?? raw?.allHives)       : [],
    pendingAdvisoryActions:  Number(raw?.pending_advisory_actions  ?? raw?.pendingAdvisoryActions  ?? 0),
    lowConfidenceInferences: Number(raw?.low_confidence_inferences ?? raw?.lowConfidenceInferences ?? 0),
  };
}

// ─── Hives ────────────────────────────────────────────────────────────────────

/**
 * GET /hives
 * Router: api/routers/hives.py
 * Backend schema: HiveResponse { hive_id, owner_id, hive_name, hive_location,
 *   hive_type, installation_date, current_state, latitude, longitude }
 */
export async function fetchHives(search = ""): Promise<Hive[]> {
  const raw = await api<any>("/hives", search ? { query: { search } } : undefined);

  const rows: any[] = Array.isArray(raw)      ? raw
    : Array.isArray(raw?.items)               ? raw.items
    : Array.isArray(raw?.data)                ? raw.data
    : Array.isArray(raw?.results)             ? raw.results
    : [];

  return rows
    .map((item: any, i: number) => ({
      // Backend uses hive_id not id
      id:        String(item.hive_id ?? item.id ?? item.name ?? `Hive-${i + 1}`),
      // Backend uses current_state not status/state
      status:    normalizeStatus(String(item.current_state ?? item.status ?? item.state ?? "normal")),
      latitude:  toFiniteOrUndefined(item.latitude  ?? item.lat),
      longitude: toFiniteOrUndefined(item.longitude ?? item.lng),
      // Not in HiveResponse schema but keep for forward compat
      stateSince: item.state_since ?? item.stateSince ?? item.state_entered_at ?? undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * GET /hives/{id}
 * Router: api/routers/hives.py
 * Backend schema: HiveDetailResponse { hive_id, hive_name, hive_location,
 *   current_state, latitude, longitude, alert_title, alert_message,
 *   acknowledged, metric_series: MetricPoint[] }
 */
export async function fetchHiveDetail(hiveId: string): Promise<HiveDetailData> {
  const raw = await api<any>(`/hives/${encodeURIComponent(hiveId)}`);

  // Backend: metric_series: [{ time_label, temperature_c, humidity_percent }]
  const rawSeries: any[] = raw.metric_series ?? raw.metricSeries ?? [];
  const metricSeries = rawSeries.map((p: any, i: number) => ({
    timeLabel:       String(p.time_label   ?? p.timeLabel  ?? p.time ?? `R${i + 1}`),
    temperatureC:    Number(p.temperature_c   ?? p.temperatureC  ?? p.temp     ?? 0),
    humidityPercent: Number(p.humidity_percent ?? p.humidityPercent ?? p.humidity ?? 0),
  }));

  return {
    id:           String(raw.hive_id   ?? raw.id   ?? hiveId),
    name:         String(raw.hive_name ?? raw.name ?? hiveId),
    location:     String(raw.hive_location ?? raw.location ?? raw.site ?? ""),
    status:       normalizeStatus(String(raw.current_state ?? raw.status ?? raw.state ?? "normal")),
    stateSince:   raw.state_since ?? raw.stateSince ?? undefined,
    alertTitle:   String(raw.alert_title   ?? raw.alertTitle   ?? ""),
    alertMessage: String(raw.alert_message ?? raw.alertMessage ?? raw.message ?? ""),
    metrics:      metricSeries.map((p) => p.temperatureC),
    metricSeries,
    mapLabel:     String(raw.hive_name ?? raw.hive_id ?? hiveId),
    acknowledged: Boolean(raw.acknowledged ?? raw.is_acknowledged ?? false),
  };
}

/**
 * POST /hives/{id}/acknowledge
 * Router: api/routers/hives.py
 */
export async function acknowledgeHiveAlert(hiveId: string): Promise<void> {
  await api<void>(`/hives/${encodeURIComponent(hiveId)}/acknowledge`, { method: "POST" });
}

/**
 * GET /hives/{id}/alerts
 * Router: api/routers/alerts.py (hive_alerts_router)
 * Backend schema: AlertResponse { alert_id, hive_id, severity_level,
 *   recommended_action, action_status, alert_timestamp }
 */
export async function fetchHiveAlerts(hiveId: string): Promise<AlertItem[]> {
  const raw = await api<any[]>(`/hives/${encodeURIComponent(hiveId)}/alerts`);
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeHiveAlertItem(item, i, hiveId));
}

/**
 * GET /alerts
 * Router: api/routers/alerts.py (mobile_alerts_router)
 * Backend schema: MobileAlertResponse { id, hive_id, severity, title, date, summary }
 */
export async function fetchAlerts(): Promise<AlertItem[]> {
  const raw = await api<any[]>("/alerts");
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeAlertItem(item, i));
}

/**
 * GET /alerts/{id}
 * Router: api/routers/alerts.py (mobile_alerts_router)
 * Backend schema: MobileAlertDetailResponse { id, hive_id, severity, title, time, details, acknowledged }
 */
export async function fetchAlertDetail(alertId: string): Promise<AlertDetailData> {
  const raw = await api<any>(`/alerts/${encodeURIComponent(alertId)}`);
  return {
    id:           String(raw.id ?? alertId),
    hiveId:       String(raw.hive_id ?? raw.hiveId ?? ""),
    severity:     normalizeSeverity(String(raw.severity ?? raw.level ?? "info")),
    title:        String(raw.title ?? raw.alert ?? "Alert"),
    time:         String(raw.time  ?? raw.createdAt ?? raw.created_at ?? ""),
    details:      String(raw.details ?? raw.summary ?? raw.message ?? ""),
    acknowledged: Boolean(raw.acknowledged ?? raw.is_acknowledged ?? false),
  };
}

/**
 * POST /alerts/{id}/acknowledge
 * Router: api/routers/alerts.py (mobile_alerts_router)
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  await api<void>(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: "POST" });
}

// ─── Advisory ─────────────────────────────────────────────────────────────────

/**
 * Advisory endpoint does not exist in the Railway backend OpenAPI spec.
 * Returns null to prevent crashes in AlertDetailsScreen.
 */
export async function fetchAdvisory(_alertId: string): Promise<Advisory | null> {
  return null;
}

// ─── Ambient weather (Open-Meteo, no backend needed) ─────────────────────────

export async function fetchAmbientWeather(
  latitude = 0.3476,
  longitude = 32.5825,
): Promise<AmbientWeather> {
  const params = new URLSearchParams({
    latitude:  String(latitude),
    longitude: String(longitude),
    current:   "temperature_2m,relative_humidity_2m",
    timezone:  "auto",
  });

  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error(`Weather API failed (${resp.status})`);

  const data = await resp.json();
  const cur  = data?.current;
  const tempC = Number(cur?.temperature_2m);
  const hum   = Number(cur?.relative_humidity_2m);

  if (!Number.isFinite(tempC) || !Number.isFinite(hum)) {
    throw new Error("Weather API returned unexpected values");
  }

  return {
    temperatureC:    tempC,
    humidityPercent: hum,
    observedAt:      String(cur?.time ?? new Date().toISOString()),
    source:          "open-meteo",
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function toFiniteOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function validateServerUrl(url: string | null | undefined): string | null {
  const s = normalizeUrl(url);
  if (!s) return "Server URL is required.";
  try { new URL(s); return null; }
  catch { return "Enter a valid URL, e.g. https://bsads-api-production.up.railway.app"; }
}
