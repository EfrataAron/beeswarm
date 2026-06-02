import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { THEME } from "../theme";

type Props = {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
};

export function MetricCard({ title, value, unit, subtitle }: Props) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    width: "49%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  metricTitle: {
    fontSize: 12,
    color: THEME.accent,
    fontWeight: "700",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    color: THEME.primary,
    fontWeight: "800",
  },
  metricUnit: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: "700",
  },
  metricSubtitle: {
    fontSize: 11,
    color: "#9AA6B5",
    marginTop: 6,
  },
});
