import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Hive, fetchHives, fetchDashboard } from "../../api";
import { THEME, STATUS_COLOR } from "../../theme";
import { useTheme } from "../../hooks/useTheme";
import { MainTabParamList } from "../../navigation/types";
import { mapStyles as styles } from "./MapScreen.styles";
import HiveMap from "../../components/HiveMap";
import type { MapHive } from "../../components/HiveMap.native";

const DEFAULT_MAP_REGION = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

function hasMapCoordinates(hive: Hive): hive is Hive & { latitude: number; longitude: number } {
  return (
    typeof hive.latitude === "number" &&
    Number.isFinite(hive.latitude) &&
    typeof hive.longitude === "number" &&
    Number.isFinite(hive.longitude)
  );
}

function getMapRegion(hives: MapHive[]) {
  if (hives.length === 0) return DEFAULT_MAP_REGION;
  const latitude = hives.reduce((sum, h) => sum + h.latitude, 0) / hives.length;
  const longitude = hives.reduce((sum, h) => sum + h.longitude, 0) / hives.length;
  return { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 };
}


function LegendItem({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

type Props = BottomTabScreenProps<MainTabParamList, "Map">;

export function MapScreen({ navigation }: Props) {
  const theme = useTheme();
  const [hives, setHives] = useState<Hive[]>([]);
  const [sensorMap, setSensorMap] = useState<Record<string, { temperatureC: number; humidityPercent: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch hives and sensor snapshot in parallel
      const [data, dashboard] = await Promise.all([
        fetchHives(),
        fetchDashboard().catch(() => null),
      ]);
      setHives(data);

      // Build a lookup: hiveId → latest temp/humidity
      if (dashboard?.allHives) {
        const map: Record<string, { temperatureC: number; humidityPercent: number }> = {};
        dashboard.allHives.forEach((h) => {
          map[h.hiveId] = { temperatureC: h.temperatureC, humidityPercent: h.humidityPercent };
        });
        setSensorMap(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hive map data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever this tab comes into focus — catches hives created elsewhere
  useFocusEffect(
    useCallback(() => {
      void loadHives();
    }, [loadHives]),
  );

  const mapHives = useMemo(
    () =>
      hives.filter(hasMapCoordinates).map((h) => ({
        ...h,
        temperatureC: sensorMap[h.id]?.temperatureC,
        humidityPercent: sensorMap[h.id]?.humidityPercent,
      })),
    [hives, sensorMap],
  );
  const region = useMemo(() => getMapRegion(mapHives), [mapHives]);

  return (
    <View style={styles.fullScreenContainer}>
      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Live Hive Map</Text>
            <Text style={styles.headerSubtitle}>
              {mapHives.length} {mapHives.length === 1 ? 'hive' : 'hives'} mapped
            </Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void loadHives()}>
            <Text style={styles.refreshButtonText}>⟳</Text>
          </Pressable>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={THEME.accent} />
            <Text style={styles.loadingText}>Loading hive locations...</Text>
          </View>
        )}

        {!loading && mapHives.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Hives With Location Data</Text>
            <Text style={styles.emptyStateText}>
              Add latitude and longitude coordinates to your hives to see them on the map.
            </Text>
          </View>
        )}

        {!loading && mapHives.length > 0 && (
          <HiveMap
            mapHives={mapHives}
            region={region}
            statusColor={STATUS_COLOR}
            onMarkerPress={(hiveId: string) =>
              navigation.navigate("Hives", {
                screen: "HiveDetails",
                params: { hiveId },
              })
            }
          />
        )}

        {!!error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadHives()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Floating Legend */}
      {!loading && mapHives.length > 0 && (
        <View style={styles.floatingLegend}>
          <LegendItem color={STATUS_COLOR.active} text="Harmonious" />
          <LegendItem color={STATUS_COLOR.swarming} text="Swarming" />
          <LegendItem color={STATUS_COLOR.queenless} text="Queenless" />
          <LegendItem color={STATUS_COLOR.Abscondment} text="Absconded" />
        </View>
      )}
    </View>
  );
}