/**
 * TypeScript type definitions for BSADS API
 */

export type HiveStatus = 
  | "active" 
  | "inactive_hive" 
  | "swarming" 
  | "Abscondment" 
  | "external_noise" 
  | "quacking_queens" 
  | "pests" 
  | "queenless";

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
  name: string;
  location: string;
  type: string;
  installationDate: string;
  status: HiveStatus;
  latitude?: number;
  longitude?: number;
  stateSince?: string;
  lastInferenceAt?: string | null;
};

export type WeatherData = {
  temperature: number;
  humidity: number;
  timestamp: string;
  weatherDescription?: string;
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
  lastInferenceAt?: string | null;
  weather?: WeatherData;
  lastAnalysisTime?: string | null;
};

export type AlertItem = {
  id: string;
  hiveId: string;
  severity: AlertSeverity;
  title: string;
  date: string;
  summary: string;
  alertStatus:string;
};

export type AudioRecording = {
  id: string;
  file_path: string;
  duration_seconds: number;
  recorded_at: string;
};

export type AlertDetailData = {
  id: string;
  hiveId: string;
  hiveName?: string;
  severity: AlertSeverity;
  title: string;
  time: string;
  createdAt?: string;
  details: string;
  acknowledged: boolean;
  audioRecording?: AudioRecording | null;
  advisory?: Advisory | null;
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
  allHives: Array<{
    hiveId: string;
    temperatureC: number;
    humidityPercent: number;
  }>;
  allHivesHistory?: Array<{
    hiveId: string;
    history: Array<{
      timeLabel: string;
      temperatureC: number;
      humidityPercent: number;
    }>;
  }>;
  pendingAdvisoryActions: number;
  lowConfidenceInferences: number;
};

export type AmbientWeather = {
  temperatureC: number;
  humidityPercent: number;
  observedAt: string;
  source: "open-meteo";
};
