/**
 * Hive management service
 * Handles hive CRUD operations and related data
 */

import { apiRequest } from "../client";
import { Hive, HiveDetailData, WeatherData } from "../types";
import {
  normalizeStatus,
  parseHiveCoordinates,
  hasValidMapCoordinates,
} from "../utils/normalizers";
import {
  mergeCachedCoordinates,
  saveHiveCoordinates,
} from "../utils/hiveCoordinatesCache";
import {
  buildHourlyMetricHistory,
  normalizeMetricPoint,
} from "../utils/metricsHistory";

export async function fetchHives(search = ""): Promise<Hive[]> {
  const raw = await apiRequest<any>(
    "/hives",
    search ? { query: { search } } : undefined,
  );

  const rows: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.results)
          ? raw.results
          : [];

  const hives = await mergeCachedCoordinates(
    rows
    .map((item: any, i: number) => {
      const coords = parseHiveCoordinates(item);
      return {
      id: String(item.hive_id ?? item.id ?? `Hive-${i + 1}`),
      name: String(
        item.hive_name ?? item.name ?? item.hive_id ?? `Hive ${i + 1}`,
      ),
      location: String(item.hive_location ?? item.location ?? "Unknown"),
      type: String(item.hive_type ?? item.type ?? "Unknown"),
      installationDate: String(
        item.installation_date ?? item.installationDate ?? "",
      ),
      status: normalizeStatus(
        String(item.current_state ?? item.status ?? item.state ?? ""),
      ),
      latitude: coords.latitude,
      longitude: coords.longitude,
      stateSince:
        item.state_since ??
        item.stateSince ??
        item.state_entered_at ??
        undefined,
      lastInferenceAt: item.last_inference_at,
    };
    })
    .sort((a, b) => a.name.localeCompare(b.name)),
  );

  void Promise.all(
    hives
      .filter((h) => hasValidMapCoordinates(h.latitude, h.longitude))
      .map((h) => saveHiveCoordinates(h.id, h.latitude!, h.longitude!)),
  );

  return hives;
}

/** Fill in coordinates from cache or hive detail when the list API omits them. */
export async function enrichHivesWithCoordinates(hives: Hive[]): Promise<Hive[]> {
  const withCache = await mergeCachedCoordinates(hives);
  const missing = withCache.filter(
    (h) => !hasValidMapCoordinates(h.latitude, h.longitude),
  );
  if (missing.length === 0) return withCache;

  const detailCoords = await Promise.all(
    missing.map(async (hive) => {
      try {
        const detail = await fetchHiveDetail(hive.id);
        if (!hasValidMapCoordinates(detail.latitude, detail.longitude)) {
          return null;
        }
        await saveHiveCoordinates(
          hive.id,
          detail.latitude!,
          detail.longitude!,
        );
        return {
          id: hive.id,
          latitude: detail.latitude!,
          longitude: detail.longitude!,
        };
      } catch {
        return null;
      }
    }),
  );

  const byId = new Map(
    detailCoords
      .filter((row): row is { id: string; latitude: number; longitude: number } => row !== null)
      .map((row) => [row.id, row]),
  );

  if (byId.size === 0) return withCache;

  return withCache.map((hive) => {
    const coords = byId.get(hive.id);
    return coords ? { ...hive, ...coords } : hive;
  });
}

export async function fetchHiveDetail(hiveId: string): Promise<HiveDetailData> {
  const raw = await apiRequest<any>(`/hives/${encodeURIComponent(hiveId)}`);

  const rawSeries: any[] = raw.metric_series ?? raw.metricSeries ?? [];
  let metricSeries = rawSeries.map((p: any, i: number) =>
    normalizeMetricPoint(p, i),
  );
  // Don't generate fake history for new hives
  // if (metricSeries.length < 24) {
  //   const weather = raw.weather ?? {};
  //   const baseTemp = Number(
  //     metricSeries.at(-1)?.temperatureC ??
  //       weather.temperature ??
  //       raw.temperature_c ??
  //       34,
  //   );
  //   const baseHum = Number(
  //     metricSeries.at(-1)?.humidityPercent ??
  //       weather.humidity ??
  //       raw.humidity_percent ??
  //       60,
  //   );
  //   const seed = hiveId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  //   metricSeries = buildHourlyMetricHistory(baseTemp, baseHum, 24 * 30, seed);
  // }

  const weatherData: WeatherData | undefined = raw.weather
    ? {
        temperature: Number(raw.weather.temperature ?? 0),
        humidity: Number(raw.weather.humidity ?? 0),
        timestamp: String(raw.weather.timestamp ?? ""),
        weatherDescription:
          raw.weather.weather_description ?? raw.weather.weatherDescription ?? undefined,
      }
    : undefined;

  const coords = parseHiveCoordinates(raw);

  return {
    id: String(raw.hive_id ?? raw.id ?? hiveId),
    name: String(raw.hive_name ?? raw.name ?? hiveId),
    location: String(raw.hive_location ?? raw.location ?? raw.site ?? ""),
    status: normalizeStatus(
      String(raw.current_state ?? raw.status ?? raw.state ?? "normal"),
    ),
    stateSince: raw.state_since ?? raw.stateSince ?? undefined,
    alertTitle: String(raw.alert_title ?? raw.alertTitle ?? ""),
    alertMessage: String(
      raw.alert_message ?? raw.alertMessage ?? raw.message ?? "",
    ),
    metrics: metricSeries.map((p) => p.temperatureC),
    metricSeries,
    mapLabel: String(raw.hive_name ?? raw.hive_id ?? hiveId),
    acknowledged: Boolean(raw.acknowledged ?? raw.is_acknowledged ?? false),
    lastInferenceAt: raw.last_inference_at,
    weather: weatherData,
    lastAnalysisTime: raw.last_analysis_time ?? raw.lastAnalysisTime ?? undefined,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export async function createHive(data: {
  hive_location: string;
  hive_type: string;
  hive_name: string;
  installation_date: string;
  latitude: number;
  longitude: number;
  owner_id: string;
}): Promise<Hive> {
  const raw = await apiRequest<any>("/hives", {
    method: "POST",
    body: JSON.stringify(data),
  });

  const coords = parseHiveCoordinates(raw);
  const latitude =
    coords.latitude ??
    (hasValidMapCoordinates(data.latitude, data.longitude)
      ? data.latitude
      : undefined);
  const longitude =
    coords.longitude ??
    (hasValidMapCoordinates(data.latitude, data.longitude)
      ? data.longitude
      : undefined);

  const hive: Hive = {
    id: String(raw.hive_id ?? raw.id ?? raw.hive_name ?? ""),
    name: String(raw.hive_name ?? raw.name ?? raw.hive_id ?? "New Hive"),
    location: String(raw.hive_location ?? raw.location ?? ""),
    type: String(raw.hive_type ?? raw.type ?? ""),
    installationDate: String(
      raw.installation_date ?? raw.installationDate ?? "",
    ),
    status: normalizeStatus(
      String(raw.current_state ?? raw.status ?? "normal"),
    ),
    latitude,
    longitude,
    stateSince: raw.state_since ?? raw.stateSince ?? undefined,
  };

  if (hasValidMapCoordinates(hive.latitude, hive.longitude)) {
    await saveHiveCoordinates(hive.id, hive.latitude!, hive.longitude!);
  }

  return hive;
}

export async function acknowledgeHiveAlert(hiveId: string): Promise<void> {
  await apiRequest<void>(`/hives/${encodeURIComponent(hiveId)}/acknowledge`, {
    method: "POST",
  });
}

export async function deleteHive(hiveId: string): Promise<void> {
  await apiRequest<void>(`/hives/${encodeURIComponent(hiveId)}`, {
    method: "DELETE",
  });
}