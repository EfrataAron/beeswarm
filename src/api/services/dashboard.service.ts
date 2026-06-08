/**
 * Dashboard service
 * Handles dashboard statistics and metrics
 */

import { apiRequest } from "../client";
import { DashboardData } from "../types";

export async function fetchDashboard(): Promise<DashboardData> {
  const raw = await apiRequest<any>("/dashboard");

  const counts = raw?.status_counts ?? raw?.statusCounts ?? {};
  const metrics = raw?.key_metrics ?? raw?.keyMetrics ?? {};

  return {
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
    allHives: Array.isArray(raw?.all_hives ?? raw?.allHives)
      ? (raw?.all_hives ?? raw?.allHives)
      : [],
    pendingAdvisoryActions: Number(
      raw?.pending_advisory_actions ?? raw?.pendingAdvisoryActions ?? 0,
    ),
    lowConfidenceInferences: Number(
      raw?.low_confidence_inferences ?? raw?.lowConfidenceInferences ?? 0,
    ),
  };
}
