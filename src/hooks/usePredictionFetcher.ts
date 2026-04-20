import { useEffect, useRef, useState } from "react";
import { ClassificationAlert } from "../utils/sampleClassificationData";
import {
  getPrediction,
  getHivePredictions,
  getPredictionForClassification,
} from "../api/mockPredictionApi";
import { showClassificationAlert } from "../utils/alertNotification";

interface UsePredictionFetcherOptions {
  hiveIds: string[];
  enabled?: boolean;
  interval?: number; // milliseconds between fetches
  showAlerts?: boolean; // Show toast alerts for each prediction
}

interface PredictionState {
  predictions: ClassificationAlert[];
  loading: boolean;
  error: string | null;
  lastFetchTime: Date | null;
}

/**
 * Hook to fetch predictions from the API periodically
 * Integrates with alert system to display notifications
 */
export function usePredictionFetcher(
  options: UsePredictionFetcherOptions
) {
  const {
    hiveIds,
    enabled = true,
    interval = 30000, // 30 seconds default
    showAlerts = true,
  } = options;

  const [state, setState] = useState<PredictionState>({
    predictions: [],
    loading: false,
    error: null,
    lastFetchTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch predictions for all hives
  const fetchPredictions = async () => {
    if (hiveIds.length === 0) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const predictions = await getHivePredictions(hiveIds);

      setState({
        predictions,
        loading: false,
        error: null,
        lastFetchTime: new Date(),
      });

      // Show alerts for new predictions
      if (showAlerts) {
        predictions.forEach((prediction) => {
          showClassificationAlert(prediction);
        });
      }

      return predictions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  // Start periodic fetching
  const startFetching = () => {
    if (intervalRef.current) return; // Already running

    // Fetch immediately
    fetchPredictions();

    // Then fetch at intervals
    intervalRef.current = setInterval(() => {
      fetchPredictions();
    }, interval);
  };

  // Stop periodic fetching
  const stopFetching = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Fetch a single hive prediction on demand
  const fetchSinglePrediction = async (hiveId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const prediction = await getPrediction(hiveId);

      setState((prev) => ({
        ...prev,
        predictions: [prediction, ...prev.predictions],
        loading: false,
        error: null,
        lastFetchTime: new Date(),
      }));

      if (showAlerts) {
        showClassificationAlert(prediction);
      }

      return prediction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const fetchSinglePredictionForClassification = async (
    hiveId: string,
    classification: string
  ) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const prediction = await getPredictionForClassification(hiveId, classification);

      setState((prev) => ({
        ...prev,
        predictions: [prediction, ...prev.predictions],
        loading: false,
        error: null,
        lastFetchTime: new Date(),
      }));

      if (showAlerts) {
        showClassificationAlert(prediction);
      }

      return prediction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  // Setup and cleanup
  useEffect(() => {
    if (enabled) {
      startFetching();
    } else {
      stopFetching();
    }

    return () => {
      stopFetching();
    };
  }, [enabled, interval, hiveIds.length]);

  return {
    ...state,
    fetchPredictions,
    fetchSinglePrediction,
    fetchSinglePredictionForClassification,
    startFetching,
    stopFetching,
  };
}
