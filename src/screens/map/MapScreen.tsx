import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Hive, fetchHives } from "../../api";
import { THEME, STATUS_COLOR } from "../../theme";
import { useTheme } from "../../hooks/useTheme";
import { MainTabParamList } from "../../navigation/types";
import { mapStyles as styles } from "./MapScreen.styles";
import HiveMap from "../../components/HiveMap";

type MapHive = Hive & { latitude: number; longitude: number };

const DEFAULT_MAP_REGION = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

function hasMapCoordinates(hive: Hive): hive is MapHive {
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

function formatCoordinate(value: number) {
  return value.toFixed(4);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHives();
      setHives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hive map data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadHives(); }, [loadHives]);

  const mapHives = useMemo(() => hives.filter(hasMapCoordinates), [hives]);
  const region = useMemo(() => getMapRegion(mapHives), [mapHives]);

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <View style={styles.mapCard}>
        <View style={styles.mapHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Live Hive Map</Text>
            <Text style={styles.mapHeaderSub}>
              {mapHives.length} mapped hives with status-based pins
            </Text>
          </View>
          <Pressable style={styles.mapRefreshButton} onPress={() => void loadHives()}>
            <Text style={styles.mapRefreshText}>Refresh</Text>
          </Pressable>
        </View>

        {Platform.OS === "web" ? (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackTitle}>Interactive map preview is native-only.</Text>
            <Text style={styles.mapFallbackText}>
              Open the app on Android or iOS to see real pins on the map. Hive rows below remain clickable.
            </Text>
            <View style={styles.mapFallbackList}>
              {mapHives.map((hive) => (
                <Pressable
                  key={hive.id}
                  style={styles.mapFallbackRow}
                  onPress={() =>
                    navigation.navigate("Hives", {
                      screen: "HiveDetails",
                      params: { hiveId: hive.id },
                    })
                  }
                >
                  <View>
                    <Text style={styles.mapFallbackRowTitle}>{hive.id}</Text>
                    <Text style={styles.mapFallbackRowSub}>
                      {formatCoordinate(hive.latitude)}, {formatCoordinate(hive.longitude)}
                    </Text>
                  </View>
                  <Text style={[styles.hiveStatus, { color: STATUS_COLOR[hive.status] }]}>
                    {hive.status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.mapViewport}>
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
            {loading && (
              <View style={styles.mapOverlay}>
                <ActivityIndicator color={THEME.accent} />
                <Text style={styles.stateTextSmall}>Loading hive map...</Text>
              </View>
            )}
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && mapHives.length === 0 && (
          <View style={styles.emptyMapState}>
            <Text style={styles.stateTitle}>No mapped hives yet</Text>
            <Text style={styles.stateTextSmall}>
              Add latitude and longitude to the hive data returned by the API.
            </Text>
          </View>
        )}

        <View style={styles.legendWrap}>
          <LegendItem color={STATUS_COLOR.active} text="Active" />
          <LegendItem color={STATUS_COLOR.swarming} text="Swarming" />
          <LegendItem color={STATUS_COLOR.queenless} text="Queenless" />
          <LegendItem color={STATUS_COLOR.Abscondment} text="Absconded" />
        </View>
      </View>
    </ScrollView>
  );
}
