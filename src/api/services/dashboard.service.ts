/**
 * Dashboard service
 * Handles dashboard statistics and metrics
 */

import { apiRequest } from "../client";
import { DashboardData } from "../types";
import { fetchHiveDetail, fetchHives } from "./hive.service";
import {
  buildHourlyMetricHistory,
  normalizeHiveHistory,
  normalizeMetricPoint,
  MetricPoint,
} from "../utils/metricsHistory";

type HiveSnapshot = {
  hiveId: string;
  hiveName: string;
  temperatureC: number;
  humidityPercent: number;
};

type HiveHistoryEntry = {
  hiveId: string;
  hiveName: string;
  history: MetricPoint[];
};

/** Load metric_series from each hive (dashboard API does not include this). */
export async function fetchFleetMetricsFromHives(): Promise<{
  allHives: HiveSnapshot[];
  allHivesHistory: HiveHistoryEntry[];
}> {
  const hives = await fetchHives();
  if (hives.length === 0) {
    return { allHives: [], allHivesHistory: [] };
  }

  const details = await Promise.all(
    hives.map((hive) =>
      fetchHiveDetail(hive.id).catch(() => null),
    ),
  );

  const allHivesHistory: HiveHistoryEntry[] = [];
  const allHives: HiveSnapshot[] = [];

  details.forEach((detail, i) => {
    if (!detail) return;
    const hiveId = detail.id;
    const history =
      detail.metricSeries.length > 0
        ? detail.metricSeries
        : buildHourlyMetricHistory(
            34,
            60,
            24 * 30,
            hiveId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + i,
          );

    allHivesHistory.push({ hiveId, hiveName: detail.name, history });

    const last = history[history.length - 1];
    allHives.push({
      hiveId,
      hiveName: detail.name,
      temperatureC: last?.temperatureC ?? 0,
      humidityPercent: last?.humidityPercent ?? 0,
    });
  });

  return { allHives, allHivesHistory };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const raw = await apiRequest<any>("/dashboard");

  const counts = raw?.status_counts ?? raw?.statusCounts ?? {};
  const metrics = raw?.key_metrics ?? raw?.keyMetrics ?? {};

  const result: DashboardData = {
    totalHives: Number(raw?.total_hives ?? raw?.totalHives ?? 0),
    activeHives: Number(raw?.active_hives ?? raw?.activeHives ?? 0),
    statusCounts: {
      active: Number(counts.normal ?? counts.active ?? counts.healthy ?? 0),
      inactive_hive: Number(counts.inactive_hive ?? counts.inactive ?? 0),
      swarming: Number(
        counts.pre_swarm ?? counts.swarming ?? counts.swarm ?? counts.preSwarm ?? 0,
      ),
      Abscondment: Number(counts.abscondment ?? counts.Abscondment ?? 0),
      external_noise: Number(counts.external_noise ?? counts.noise ?? 0),
      quacking_queens: Number(counts.quacking_queens ?? counts.quacking ?? 0),
      pests: Number(counts.pests ?? counts.pest ?? 0),
      queenless: Number(counts.queenless ?? counts.no_queen ?? 0),
    },
    keyMetrics: {
      temperatureC: Number(metrics.temperature_c ?? metrics.temperatureC ?? 0),
      humidityPercent: Number(
        metrics.humidity_percent ?? metrics.humidityPercent ?? 0,
      ),
      populationKBees: Number(
        metrics.population_k_bees ?? metrics.populationKBees ?? 0,
      ),
      nectarFlowKgPerDay: Number(
        metrics.nectar_flow_kg_per_day ?? metrics.nectarFlowKgPerDay ?? 0,
      ),
    },
    pendingAlerts: Number(raw?.pending_alerts ?? raw?.pendingAlerts ?? 0),
    acknowledgedAlerts: Number(
      raw?.acknowledged_alerts ?? raw?.acknowledgedAlerts ?? 0,
    ),
    preSwarmTrend: Array.isArray(raw?.pre_swarm_trend ?? raw?.preSwarmTrend)
      ? (raw?.pre_swarm_trend ?? raw?.preSwarmTrend)
      : [],
    recordingsToday: Number(raw?.recordings_today ?? raw?.recordingsToday ?? 0),
    silentHives: Array.isArray(raw?.silent_hives ?? raw?.silentHives)
      ? (raw?.silent_hives ?? raw?.silentHives)
      : [],
    highTempPreSwarmHives: Array.isArray(
      raw?.high_temp_pre_swarm_hives ?? raw?.highTempPreSwarmHives,
    )
      ? (raw?.high_temp_pre_swarm_hives ?? raw?.highTempPreSwarmHives)
      : [],
    allHives: [],
    allHivesHistory: [],
    pendingAdvisoryActions: Number(
      raw?.pending_advisory_actions ?? raw?.pendingAdvisoryActions ?? 0,
    ),
    lowConfidenceInferences: Number(
      raw?.low_confidence_inferences ?? raw?.lowConfidenceInferences ?? 0,
    ),
  };

  // /dashboard does not return per-hive metrics — load from each hive detail endpoint.
  try {
    const fleet = await fetchFleetMetricsFromHives();
    if (fleet.allHivesHistory.length > 0) {
      result.allHivesHistory = fleet.allHivesHistory;
      result.allHives = fleet.allHives;
    }
  } catch {
    // Fall back to any inline dashboard payload if present.
    const rawHistory = raw?.all_hives_history ?? raw?.allHivesHistory;
    const allHivesRaw = raw?.all_hives ?? raw?.allHives;

    if (Array.isArray(rawHistory) && rawHistory.length > 0) {
      result.allHivesHistory = rawHistory.map((h: Record<string, unknown>, i: number) => {
        const normalized = normalizeHiveHistory(h, i);
        if (normalized.history.length > 0) return normalized;
        const baseTemp = Number(h.temperatureC ?? h.temperature_c ?? h.temperature ?? 34);
        const baseHum = Number(h.humidityPercent ?? h.humidity_percent ?? h.humidity ?? 60);
        return {
          hiveId: normalized.hiveId,
          history: buildHourlyMetricHistory(baseTemp, baseHum, 24 * 30, i + 1),
        };
      });
    } else if (Array.isArray(allHivesRaw) && allHivesRaw.length > 0) {
      result.allHivesHistory = allHivesRaw.map((h: Record<string, unknown>, i: number) => {
        const hiveId = String(h.hiveId ?? h.hive_id ?? h.id ?? `Hive-${i + 1}`);
        const baseTemp = Number(h.temperatureC ?? h.temperature_c ?? h.temperature ?? 34);
        const baseHum = Number(h.humidityPercent ?? h.humidity_percent ?? h.humidity ?? 60);
        const embedded = h.history ?? h.metric_series ?? h.metricSeries;
        const history =
          Array.isArray(embedded) && embedded.length > 0
            ? embedded.map((p: Record<string, unknown>, pi: number) =>
                normalizeMetricPoint(p, pi),
              )
            : buildHourlyMetricHistory(baseTemp, baseHum, 24 * 30, i + 1);
        return { hiveId, history };
      });
      result.allHives = allHivesRaw.map((h: Record<string, unknown>, i: number) => ({
        hiveId: String(h.hiveId ?? h.hive_id ?? h.id ?? `Hive-${i + 1}`),
        hiveName: String(h.hiveName ?? h.hive_name ?? h.name ?? h.hiveId ?? h.hive_id ?? `Hive ${i + 1}`),
        temperatureC: Number(h.temperatureC ?? h.temperature_c ?? h.temperature ?? 34),
        humidityPercent: Number(h.humidityPercent ?? h.humidity_percent ?? h.humidity ?? 60),
      }));
    }
  }

  return result;
}