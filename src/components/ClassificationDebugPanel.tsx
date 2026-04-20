import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import { usePredictionFetcher } from "../hooks/usePredictionFetcher";
import { CLASSIFICATION_TYPES } from "../utils/sampleClassificationData";
import { isMockApiEnabled } from "../api/mockPredictionApi";

interface ClassificationDebugPanelProps {
  hiveIds: string[];
  visible?: boolean;
}

/**
 * Debug panel for testing classification alerts
 * Remove this component once model integration is complete
 */
export function ClassificationDebugPanel({
  hiveIds,
  visible = true,
}: ClassificationDebugPanelProps) {
  const effectiveHiveIds = hiveIds.length > 0 ? hiveIds : ["Hive-001"];

  const {
    startFetching,
    stopFetching,
    fetchPredictions,
    fetchSinglePrediction,
    fetchSinglePredictionForClassification,
    predictions,
  } = usePredictionFetcher({
    hiveIds: effectiveHiveIds,
    enabled: false,
    interval: 15000,
    showAlerts: true,
  });

  const [isApiFetching, setIsApiFetching] = useState(false);
  const mockApiEnabled = isMockApiEnabled();

  const handleFetchSpecificPrediction = async (classification: string) => {
    setIsApiFetching(true);
    try {
      const prediction = await fetchSinglePredictionForClassification(
        effectiveHiveIds[0],
        classification
      );
      console.log("Fetched prediction:", prediction);
    } catch (error) {
      console.error("Failed to fetch prediction:", error);
    } finally {
      setIsApiFetching(false);
    }
  };

  if (!visible) return null;

  const buttonStyle = StyleSheet.create({
    container: {
      padding: 10,
      backgroundColor: "#f5f5f5",
      borderTopWidth: 1,
      borderTopColor: "#ddd",
    },
    section: {
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
      paddingBottom: 10,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 8,
      color: "#333",
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      marginVertical: 5,
      borderRadius: 5,
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: "#49B25C",
    },
    warningButton: {
      backgroundColor: "#F2A93B",
    },
    criticalButton: {
      backgroundColor: "#D45353",
    },
    infoButton: {
      backgroundColor: "#4B8DC4",
    },
    text: {
      color: "white",
      fontWeight: "600",
      fontSize: 13,
    },
    smallText: {
      fontSize: 11,
      marginTop: 8,
      color: "#666",
    },
    badge: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: "#e0e0e0",
      borderRadius: 4,
      marginTop: 8,
    },
    badgeText: {
      fontSize: 11,
      color: "#333",
    },
  });

  return (
    <ScrollView style={buttonStyle.container}>
      <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 10 }}>
        Classification Alert Simulator (Remove in Production)
      </Text>

      <View style={buttonStyle.section}>
        <Text style={buttonStyle.sectionTitle}>Direct Alert Simulation</Text>

        <Pressable
          style={[buttonStyle.button, buttonStyle.primaryButton]}
          onPress={() => fetchSinglePrediction(effectiveHiveIds[0])}
        >
          <Text style={buttonStyle.text}>Generate Random Alert</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.infoButton]}
          onPress={() =>
            handleFetchSpecificPrediction(CLASSIFICATION_TYPES.HEALTHY)
          }
        >
          <Text style={buttonStyle.text}>Healthy Status</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.warningButton]}
          onPress={() =>
            handleFetchSpecificPrediction(CLASSIFICATION_TYPES.PRESSWARM)
          }
        >
          <Text style={buttonStyle.text}>Pre-swarm Alert</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.criticalButton]}
          onPress={() => handleFetchSpecificPrediction(CLASSIFICATION_TYPES.SWARM)}
        >
          <Text style={buttonStyle.text}>Swarm Alert</Text>
        </Pressable>
      </View>

      <View style={buttonStyle.section}>
        <Text style={buttonStyle.sectionTitle}>Mock Prediction API</Text>

        <Pressable
          style={[buttonStyle.button, buttonStyle.primaryButton]}
          onPress={async () => {
            setIsApiFetching(true);
            try {
              await fetchPredictions();
            } finally {
              setIsApiFetching(false);
            }
          }}
          disabled={isApiFetching}
        >
          <Text style={buttonStyle.text}>
            {isApiFetching ? "Fetching..." : "Fetch All Predictions"}
          </Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.infoButton]}
          onPress={() => handleFetchSpecificPrediction(CLASSIFICATION_TYPES.HEALTHY)}
          disabled={isApiFetching}
        >
          <Text style={buttonStyle.text}>Get Healthy Prediction</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.warningButton]}
          onPress={() => handleFetchSpecificPrediction(CLASSIFICATION_TYPES.PRESSWARM)}
          disabled={isApiFetching}
        >
          <Text style={buttonStyle.text}>Get Pre-swarm Prediction</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, buttonStyle.criticalButton]}
          onPress={() => handleFetchSpecificPrediction(CLASSIFICATION_TYPES.SWARM)}
          disabled={isApiFetching}
        >
          <Text style={buttonStyle.text}>Get Swarm Prediction</Text>
        </Pressable>

        <View style={buttonStyle.badge}>
          <Text style={buttonStyle.badgeText}>
            API Status: {mockApiEnabled ? "Mock (Testing)" : "Real (Production)"}
          </Text>
        </View>
      </View>

      <View style={buttonStyle.section}>
        <Text style={buttonStyle.sectionTitle}>Continuous Polling</Text>

        <Pressable
          style={[buttonStyle.button, { backgroundColor: "#666A73" }]}
          onPress={() => startFetching()}
        >
          <Text style={buttonStyle.text}>Start Polling Predictions</Text>
        </Pressable>

        <Pressable
          style={[buttonStyle.button, { backgroundColor: "#D4756B" }]}
          onPress={() => stopFetching()}
        >
          <Text style={buttonStyle.text}>Stop Polling</Text>
        </Pressable>

        <Text style={buttonStyle.smallText}>Fetches predictions every 15 seconds</Text>
      </View>

      <View style={buttonStyle.section}>
        <Text style={buttonStyle.sectionTitle}>
          Recent Predictions: {predictions.length}
        </Text>

        {predictions.length === 0 ? (
          <Text style={buttonStyle.smallText}>
            No predictions yet. Tap "Fetch All Predictions" or any specific prediction button.
          </Text>
        ) : (
          predictions.slice(0, 3).map((pred) => (
            <View
              key={pred.id}
              style={{
                padding: 8,
                marginVertical: 4,
                backgroundColor: "#fff",
                borderLeftWidth: 3,
                borderLeftColor:
                  pred.severity === "Critical"
                    ? "#D45353"
                    : pred.severity === "Warning"
                      ? "#F2A93B"
                      : "#49B25C",
                borderRadius: 3,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600" }}>{pred.title}</Text>
              <Text style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                {pred.classification}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
