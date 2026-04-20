import { useEffect, useRef, useState } from "react";
import {
  ClassificationAlert,
  generateSampleClassification,
} from "../utils/sampleClassificationData";
import { showClassificationAlert } from "../utils/alertNotification";

interface UseClassificationAlertsOptions {
  hiveIds: string[];
  enabled?: boolean;
  interval?: number; // milliseconds between generating sample classifications
  simulateOnStart?: boolean; // Generate one alert immediately on mount
}

export function useClassificationAlerts(
  options: UseClassificationAlertsOptions
) {
  const {
    hiveIds,
    enabled = true,
    interval = 30000, // Every 30 seconds by default
    simulateOnStart = false,
  } = options;

  const [alerts, setAlerts] = useState<ClassificationAlert[]>([]);
  const [isSimulating, setIsSimulating] = useState(enabled && simulateOnStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate and display a random classification alert
  const triggerRandomAlert = (specificHiveId?: string) => {
    if (hiveIds.length === 0) return;

    const hiveId = specificHiveId || hiveIds[Math.floor(Math.random() * hiveIds.length)];
    const alert = generateSampleClassification(hiveId);

    setAlerts((prev) => [alert, ...prev]);
    showClassificationAlert(alert);

    return alert;
  };

  // Start periodic alert simulation
  const startSimulation = () => {
    setIsSimulating(true);

    // Clear existing interval if any
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Generate first alert immediately
    triggerRandomAlert();

    // Then generate at regular intervals
    intervalRef.current = setInterval(() => {
      triggerRandomAlert();
    }, interval);
  };

  // Stop periodic alert simulation
  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle enabled/disabled state changes
  useEffect(() => {
    if (enabled && isSimulating && !intervalRef.current) {
      startSimulation();
    } else if (!enabled && intervalRef.current) {
      stopSimulation();
    }
  }, [enabled]);

  return {
    alerts,
    isSimulating,
    triggerRandomAlert,
    startSimulation,
    stopSimulation,
    clearAlerts: () => setAlerts([]),
  };
}
