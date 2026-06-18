import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Hive, HiveStatus, fetchHives } from "../../../api";
import {
  THEME,
  STATUS_COLOR,
  displayStatus,
  formatStateDuration,
  formatRelativeTime,
} from "../../../theme";
import { HivesStackParamList } from "../../../navigation/types";
import { hivesListStyles as styles } from "./HivesListScreen.styles";
import { usePolling } from "../../../hooks/usePolling";

type Props = NativeStackScreenProps<HivesStackParamList, "HiveList">;

const STATUS_BG: Record<HiveStatus, string> = {
  active: "#F0FDF4",
  inactive_hive: "#F9FAFB",
  swarming: "#FEF2F2",
  Abscondment: "#F9FAFB",
  external_noise: "#FEF2F2",
  quacking_queens: "#F5F3FF",
  pests: "#FEF2F2",
  queenless: "#FDF2F8",
  unknown: "#F3F4F6",
};
const ALL_STATUSES: HiveStatus[] = [
  "active",
  "inactive_hive",
  "swarming",
  "Abscondment",
  "external_noise",
  "quacking_queens",
  "pests",
  "queenless",
  "unknown",
];

export function HivesListScreen({ navigation, route }: Props) {
  const [hives, setHives] = useState<Hive[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<HiveStatus | "All">("All");
  const [viewMode, setViewMode] = useState<"list" | "tile">("list");
  const [isPollingEnabled, setIsPollingEnabled] = useState(true);

  const loadHives = useCallback(async (search: string, initial = false) => {
    if (initial) setLoading(true);
    setError(null);
    try {
      const data = await fetchHives(search);
      setHives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hives");
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  const { isPolling, lastUpdated } = usePolling({
    callback: () => loadHives(searchText),
    interval: 30000,
    enabled: isPollingEnabled,
  });

  useFocusEffect(
    useCallback(() => {
      setIsPollingEnabled(true);
      void loadHives(searchText, true);
      return () => setIsPollingEnabled(false);
    }, [searchText])
  );

  const onRefreshHives = useCallback(async () => {
    setRefreshing(true);
    await loadHives(searchText);
    setRefreshing(false);
  }, [loadHives, searchText]);

  // Reload hives when returning from CreateHive screen
  useEffect(() => {
    if (route.params?.refresh) {
      void loadHives(searchText, true);
    }
  }, [route.params?.refresh, loadHives, searchText]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadHives(searchText); }, 250);
    return () => clearTimeout(timeout);
  }, [searchText, loadHives]);

  const filtered = filterStatus === "All" ? hives : hives.filter((h) => h.status === filterStatus);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={[styles.appPage, { flexGrow: 1 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefreshHives()}
          colors={[THEME.accent]}
          tintColor={THEME.accent}
        />
      }
    >
      {/* Status summary pills */}
      {!loading && !error && hives.length > 0 && (
        <View style={styles.hiveSummaryStrip}>
          <Pressable
            style={[styles.hiveSummaryPill, filterStatus === "All" && styles.hiveSummaryPillActive]}
            onPress={() => setFilterStatus("All")}
          >
            <Text style={[styles.hiveSummaryPillText, filterStatus === "All" && styles.hiveSummaryPillTextActive]}>
              All {hives.length}
            </Text>
          </Pressable>
          {ALL_STATUSES.map((s) => {
            const count = hives.filter((h) => h.status === s).length;
            if (count === 0) return null;
            const active = filterStatus === s;
            return (
              <Pressable
                key={s}
                style={[
                  styles.hiveSummaryPill,
                  { borderColor: STATUS_COLOR[s] },
                  active && { backgroundColor: STATUS_BG[s] },
                ]}
                onPress={() => setFilterStatus(active ? "All" : s)}
              >
                <View style={[styles.hiveSummaryDot, { backgroundColor: STATUS_COLOR[s] }]} />
                <Text style={[styles.hiveSummaryPillText, { color: STATUS_COLOR[s] }]}>
                  {displayStatus(s)} {count}
                </Text>
              </Pressable>
            );
          })}

        </View>
      )}

      {/* Create Hive Button */}
      <Pressable
        style={styles.createHiveButton}
        onPress={() => navigation.navigate("CreateHive")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.createHiveButtonText}>Create New Hive</Text>
      </Pressable>

      {/* Search + view toggle */}
      <View style={styles.hiveToolbarRow}>
        <View style={styles.searchBarWrap}>
          <Ionicons name="search-outline" size={16} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hives…"
            placeholderTextColor={THEME.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
            </Pressable>
          )}
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons name="list-outline" size={18} color={viewMode === "list" ? THEME.primary : THEME.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.viewToggleBtn, viewMode === "tile" && styles.viewToggleBtnActive]}
            onPress={() => setViewMode("tile")}
          >
            <Ionicons name="grid-outline" size={18} color={viewMode === "tile" ? THEME.primary : THEME.textMuted} />
          </Pressable>
        </View>
      </View>

      {!loading && !error && (
        <Text style={[styles.hiveListCount, { marginTop: 10 }]}>
          {filtered.length} {filterStatus === "All" ? "hives" : filterStatus + " hives"}
        </Text>
      )}

      {loading && (
        <View style={styles.inlineState}>
          <ActivityIndicator color={THEME.accent} />
          <Text style={styles.stateTextSmall}>Loading hives...</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.primaryButtonSmall} onPress={() => void loadHives(searchText)}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && filtered.length === 0 && (
        <View style={styles.inlineState}>
          <Text style={styles.stateTextSmall}>No hives found.</Text>
        </View>
      )}

      {/* Tile view */}
      {!error && viewMode === "tile" && (
        <View style={styles.hiveTileGrid}>
          {filtered.map((hive) => (
            <Pressable
              key={hive.id}
              style={({ pressed }) => [styles.hiveTileCard, pressed && styles.pressedRow]}
              onPress={() => navigation.navigate("HiveDetails", { hiveId: hive.id })}
            >
              <View style={[styles.hiveTileIconWrap, { backgroundColor: STATUS_BG[hive.status] }]}>
                <Ionicons name="cube-outline" size={26} color={STATUS_COLOR[hive.status]} />
              </View>
              <Text style={styles.hiveTileName} numberOfLines={1}>{hive.name}</Text>
              <Text style={styles.hiveRowCondition} numberOfLines={1}>{hive.location}</Text>
              <View style={[styles.hiveStatusBadge, { backgroundColor: STATUS_BG[hive.status] }]}>
                <Text style={[styles.hiveStatusBadgeText, { color: STATUS_COLOR[hive.status] }]}>
                  {displayStatus(hive.status)}
                </Text>
              </View>
              {hive.stateSince && (
                <Text style={styles.hiveRowDuration}>{formatStateDuration(hive.stateSince)}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* List view */}
      {!error && viewMode === "list" &&
        filtered.map((hive, idx) => {
          const duration = formatStateDuration(hive.stateSince);
          const label = displayStatus(hive.status);
          console.log(hive.status)

          return (
            <Pressable
              key={hive.id}
              style={({ pressed }) => [
                styles.hiveRowFlat,
                idx !== filtered.length - 1 && styles.hiveRowFlatBorder,
                pressed && styles.pressedRow,
              ]}
              onPress={() => navigation.navigate("HiveDetails", { hiveId: hive.id })}
            >
              <View style={[styles.hiveRowDot, { backgroundColor: STATUS_COLOR[hive.status] }]} />
              <View style={styles.hiveRowInfo}>
                <View style={styles.hiveRowNameRow}>
                  <Text style={styles.hiveName}>{hive.name}</Text>
                  <View style={[
                    styles.hiveRowStateBadge,
                    { backgroundColor: `${STATUS_COLOR[hive.status]}12` }
                  ]}>
                    <Text style={[styles.hiveRowStateBadgeText, { color: STATUS_COLOR[hive.status] }]}>
                      {label}
                    </Text>
                  </View>

                </View>
                <Text style={styles.hiveRowCondition} numberOfLines={1}>
                  {hive.location} • {hive.type}
                </Text>
                <Text style={styles.hiveRowLastInference}>
                  Last analysis: {formatRelativeTime(hive.lastInferenceAt)}
                </Text>
              </View>
              <View style={styles.hiveRowRight}>
                {duration !== "" && <Text style={styles.hiveRowDuration}>{duration}</Text>}
                <View style={styles.hiveRowMoreBtn}>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#2563EB"
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
    </ScrollView>
  );
}
