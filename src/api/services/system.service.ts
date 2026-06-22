/**
 * System monitoring service
 * Handles fetching real-time system monitoring data from the database
 */

import { apiRequest } from "../client";
import { fetchHives } from "./hive.service";
import { fetchAlerts } from "./alert.service";

export type RecordingDetail = {
  id: string;
  hiveId: string;
  hiveName?: string;
  durationSeconds: number;
  recordedAt: string;
};

export type SilentHiveDetail = {
  hiveId: string;
  lastSeenHoursAgo: number;
  hiveName?: string;
  lastInferenceAt?: string | null;
};

export type LowConfidenceInference = {
  hiveId: string;
  hiveName?: string;
  inferenceScore: number;
  time: string;
};

export async function fetchRecordingsToday(): Promise<RecordingDetail[]> {
  try {
    const [raw, hives, alerts] = await Promise.all([
      apiRequest<any>("/recordings/today").catch(() => null),
      fetchHives(),
      fetchAlerts().catch(() => []),
    ]);

    const hiveById = new Map(hives.map((h) => [h.id, h]));
    
    // First try the dedicated recordings endpoint
    if (raw) {
      const recordings: any[] = Array.isArray(raw) ? raw : raw?.recordings || raw?.data || [];
      if (recordings.length > 0) {
        return recordings.map((r) => ({
          id: String(r.id),
          hiveId: String(r.hive_id || r.hiveId),
          hiveName: hiveById.get(String(r.hive_id || r.hiveId))?.name,
          durationSeconds: Number(r.duration_seconds || r.durationSeconds || 30),
          recordedAt: String(r.recorded_at || r.recordedAt),
        }));
      }
    }

    // Fallback: get recordings from alerts with audio recordings from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recordingsFromAlerts: RecordingDetail[] = [];
    for (const alert of alerts) {
      // We need to fetch alert details for audio info
      try {
        const { fetchAlertDetail } = await import("./alert.service");
        const alertDetail = await fetchAlertDetail(alert.id);
        if (alertDetail.audioRecording) {
          const recordedAt = new Date(alertDetail.audioRecording.recorded_at);
          if (recordedAt >= today) {
            recordingsFromAlerts.push({
              id: alertDetail.audioRecording.id,
              hiveId: alertDetail.hiveId,
              hiveName: alertDetail.hiveName,
              durationSeconds: alertDetail.audioRecording.duration_seconds,
              recordedAt: alertDetail.audioRecording.recorded_at,
            });
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return recordingsFromAlerts;
  } catch {
    return [];
  }
}

export async function fetchSilentHives(): Promise<SilentHiveDetail[]> {
  try {
    const hives = await fetchHives();
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    const silentHives = hives
      .filter((hive) => {
        if (!hive.lastInferenceAt) return true;
        const lastInference = new Date(hive.lastInferenceAt);
        return lastInference < eightHoursAgo;
      })
      .map((hive) => {
        let lastSeenHoursAgo = 8;
        if (hive.lastInferenceAt) {
          const diffMs = Date.now() - new Date(hive.lastInferenceAt).getTime();
          lastSeenHoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
        }
        return {
          hiveId: hive.id,
          hiveName: hive.name,
          lastSeenHoursAgo,
          lastInferenceAt: hive.lastInferenceAt,
        };
      });

    return silentHives;
  } catch {
    return [];
  }
}

export async function fetchLowConfidenceInferences(): Promise<LowConfidenceInference[]> {
  try {
    // First, let's fetch all recent inferences (adjust endpoint as needed)
    const [raw, hives] = await Promise.all([
      apiRequest<any>("/inferences").catch(() => null), // Or /inferences/recent
      fetchHives(),
    ]);

    const hiveById = new Map(hives.map((h) => [h.id, h]));
    const inferences: any[] = Array.isArray(raw) ? raw : raw?.inferences || raw?.data || [];

    // Filter for low confidence scores (< 0.6) and map to our structure
    return inferences
      .filter((inf) => Number(inf.confidence_score) < 0.6)
      .map((inf) => ({
        hiveId: String(inf.hive_id),
        hiveName: hiveById.get(String(inf.hive_id))?.name,
        inferenceScore: Number(inf.confidence_score || 0),
        time: String(inf.created_at),
      }));
  } catch {
    return [];
  }
}
