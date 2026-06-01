import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { THEME } from "../theme";

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>
        {value}
        <Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "49%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 12,
    color: THEME.accent,
    fontWeight: "700",
    marginBottom: 8,
  },
  value: {
    fontSize: 32,
    color: THEME.primary,
    fontWeight: "800",
  },
  unit: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    color: "#9AA6B5",
    marginTop: 6,
  },
});
