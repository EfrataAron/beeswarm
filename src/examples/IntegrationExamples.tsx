/**
 * EXAMPLE: How to use prediction alerts in your Dashboard
 *
 * This is example code - copy the patterns to your actual screens
 */

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { usePredictionFetcher } from "../hooks/usePredictionFetcher";
import { ClassificationDebugPanel } from "../components/ClassificationDebugPanel";
import type { Hive, DashboardData } from "../api/beeswarmApi";
import { getPrediction } from "../api/mockPredictionApi";
import { showClassificationAlert } from "../utils/alertNotification";

/**
 * OPTION 1: Simple Integration
 * Just add the debug panel to any screen for testing
 */
export function Example_SimpleDebugPanel() {
  const exampleHiveIds = ["hive-1", "hive-2", "hive-3"];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ padding: 20, fontSize: 18, fontWeight: "bold" }}>
          Dashboard Content
        </Text>
      </ScrollView>

      {/* Just add this component at the bottom */}
      <ClassificationDebugPanel
        hiveIds={exampleHiveIds}
        visible={true} // Hide in production
      />
    </View>
  );
}

/**
 * OPTION 2: Auto-polling Integration
 * Continuously fetch predictions and show alerts
 */
export function Example_AutoPollingDashboard({
  dashboard,
}: {
  dashboard: DashboardData | null;
}) {
  const hiveIds = ["hive-1", "hive-2", "hive-3"];

  // This hook automatically fetches predictions every 30 seconds
  const { predictions, startFetching, stopFetching } = usePredictionFetcher({
    hiveIds,
    enabled: true, // Start immediately
    interval: 30000, // Every 30 seconds
    showAlerts: true, // Show toast notifications
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Recent Alerts: {predictions.length}
      </Text>

      {predictions.map((pred) => (
        <View
          key={pred.id}
          style={{
            padding: 10,
            marginVertical: 8,
            backgroundColor:
              pred.severity === "Critical"
                ? "#3D0A0A"
                : pred.severity === "Warning"
                  ? "#3D1F00"
                  : "#1A1000",
            borderLeftWidth: 4,
            borderLeftColor:
              pred.severity === "Critical"
                ? "#C0392B"
                : pred.severity === "Warning"
                  ? "#E8873A"
                  : "#FFB268",
            borderRadius: 4,
          }}
        >
          <Text style={{ fontWeight: "600", fontSize: 14 }}>{pred.title}</Text>
          <Text style={{ fontSize: 12, marginTop: 4, color: "#FFD4A8" }}>
            {pred.message}
          </Text>
        </View>
      ))}

      {/* Control buttons */}
      <View style={{ marginTop: 20 }}>
        <Pressable
          style={{
            padding: 12,
            backgroundColor: "#FFB268",
            borderRadius: 4,
            marginBottom: 8,
          }}
          onPress={() => startFetching()}
        >
          <Text
            style={{ color: "#001E37", textAlign: "center", fontWeight: "600" }}
          >
            Start Polling
          </Text>
        </Pressable>

        <Pressable
          style={{
            padding: 12,
            backgroundColor: "#C0392B",
            borderRadius: 4,
          }}
          onPress={() => stopFetching()}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Stop Polling
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/**
 * OPTION 3: Manual Alert Trigger
 * Fetch predictions manually when user takes an action
 */
export async function Example_ManualFetch() {
  const hiveId = "hive-1";

  try {
    const prediction = await getPrediction(hiveId);
    showClassificationAlert(prediction);
    console.log("Alert triggered:", prediction);
  } catch (error) {
    console.error("Failed to fetch prediction:", error);
  }
}

/**
 * OPTION 4: Full Dashboard with Predictions
 * Complete example showing all features
 */
export function Example_FullDashboard({
  dashboard,
}: {
  dashboard: DashboardData | null;
}) {
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const hiveIds = ["hive-1", "hive-2", "hive-3"];

  const { predictions, fetchPredictions } = usePredictionFetcher({
    hiveIds,
    enabled: true,
    interval: 30000,
    showAlerts: true,
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Header with controls */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Hive Overview</Text>
        <Pressable
          onPress={() => setShowDebugPanel(!showDebugPanel)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#FFF0E0",
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600" }}>
            {showDebugPanel ? "Hide" : "Show"} Debug
          </Text>
        </Pressable>
      </View>

      {/* Dashboard metrics */}
      {dashboard && (
        <View style={{ marginBottom: 20 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#FFB268" }}
              >
                {dashboard.totalHives}
              </Text>
              <Text style={{ fontSize: 12, color: "#5A6A7A" }}>Total Hives</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#E8873A" }}
              >
                {dashboard.statusCounts["Pre-swarm"] || 0}
              </Text>
              <Text style={{ fontSize: 12, color: "#5A6A7A" }}>Pre-swarm</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#C0392B" }}
              >
                {dashboard.statusCounts.Swarm || 0}
              </Text>
              <Text style={{ fontSize: 12, color: "#5A6A7A" }}>Swarms</Text>
            </View>
          </View>
        </View>
      )}

      {/* Alert predictions list */}
      {predictions.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 10 }}>
            Recent Predictions ({predictions.length})
          </Text>
          {predictions.slice(0, 5).map((pred) => (
            <View
              key={pred.id}
              style={{
                padding: 12,
                marginVertical: 6,
                backgroundColor:
                  pred.severity === "Critical"
                    ? "#3D0A0A"
                    : pred.severity === "Warning"
                      ? "#3D1F00"
                      : "#1A1000",
                borderLeftWidth: 4,
                borderLeftColor:
                  pred.severity === "Critical"
                    ? "#C0392B"
                    : pred.severity === "Warning"
                      ? "#E8873A"
                      : "#FFB268",
                borderRadius: 4,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 13 }}>
                {pred.title}
              </Text>
              <Text style={{ fontSize: 11, marginTop: 4, color: "#FFD4A8" }}>
                Hive: {pred.hiveId}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Fetch button */}
      <Pressable
        onPress={() => fetchPredictions()}
        style={{
          padding: 12,
          backgroundColor: "#FFB268",
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        <Text
          style={{ color: "#001E37", textAlign: "center", fontWeight: "600" }}
        >
          Fetch Predictions Now
        </Text>
      </Pressable>

      {/* Debug panel */}
      {showDebugPanel && <ClassificationDebugPanel hiveIds={hiveIds} />}
    </ScrollView>
  );
}
