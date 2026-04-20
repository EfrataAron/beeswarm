import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import {
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  BottomTabScreenProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import {
  AlertDetailData,
  AlertItem,
  AlertSeverity,
  DashboardData,
  Hive,
  HiveDetailData,
  HiveStatus,
  acknowledgeAlert,
  acknowledgeHiveAlert,
  fetchAlertDetail,
  fetchAlerts,
  fetchDashboard,
  fetchHiveDetail,
  fetchHives,
} from "./src/api/beeswarmApi";
import HiveMap from "./src/components/HiveMap";
import { ClassificationDebugPanel } from "./src/components/ClassificationDebugPanel";
import AntDesign from '@expo/vector-icons/AntDesign';

const beeLogo = require("./assets/images/bee.png");

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
};

type MainTabParamList = {
  Dashboard: undefined;
  Hives: NavigatorScreenParams<HivesStackParamList>;
  Alerts: NavigatorScreenParams<AlertsStackParamList>;
  Map: undefined;
};

type HivesStackParamList = {
  HiveList: undefined;
  HiveDetails: { hiveId: string };
};

type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetails: { alertId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HivesStack = createNativeStackNavigator<HivesStackParamList>();
const AlertsStack = createNativeStackNavigator<AlertsStackParamList>();

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  primary: "#FFB268",       // Tranquil Orange
  primaryDark: "#E8873A",   // Darker orange for hover/active
  primaryLight: "#FFF5EB",  // Light orange tint
  primaryBorder: "#FFD4A8", // Orange border
  dark: "#001E37",          // Maastricht Blue
  darkMid: "#0A2E4A",       // Slightly lighter dark
  darkSurface: "#0D3352",   // Card surface on dark bg
  surface: "#FFFFFF",
  pageBg: "#FFFFFF",        // White page background
  text: "#001E37",          // Maastricht Blue — sharp, not dull
  textMuted: "#3D4F60",     // Mid-tone — readable, not washed out
  textLight: "#6B7A8D",     // Subtle labels
  border: "#E8D5C0",
  borderLight: "#F5EDE3",
  // Status colours
  statusHealthy: "#FFB268",
  statusPreswarm: "#E8873A",
  statusSwarm: "#C0392B",
  statusAbscondment: "#5A6A7A",
};

const STATUS_COLOR: Record<HiveStatus, string> = {
  Healthy: C.statusHealthy,
  "Pre-swarm": C.statusPreswarm,
  Swarm: C.statusSwarm,
  Abscondment: C.statusAbscondment,
};

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
  if (hives.length === 0) {
    return DEFAULT_MAP_REGION;
  }

  const latitude =
    hives.reduce((sum, hive) => sum + hive.latitude, 0) / hives.length;
  const longitude =
    hives.reduce((sum, hive) => sum + hive.longitude, 0) / hives.length;

  return {
    latitude,
    longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <NavigationContainer>
        <ExpoStatusBar style="dark" />
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.dark },
            animation: "slide_from_right",
          }}
        >
          {!isAuthenticated ? (
            <>
              <RootStack.Screen name="Welcome" component={WelcomeScreen} />
              <RootStack.Screen name="Login">
                {(props) => (
                  <LoginScreen
                    {...props}
                    onAuthSuccess={() => setIsAuthenticated(true)}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen name="Signup">
                {(props) => (
                  <SignupScreen
                    {...props}
                    onAuthSuccess={() => setIsAuthenticated(true)}
                  />
                )}
              </RootStack.Screen>
            </>
          ) : (
            <RootStack.Screen name="MainTabs">
              {(props) => (
                <MainTabsScreen
                  {...props}
                  onLogout={() => setIsAuthenticated(false)}
                />
              )}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}

function MainTabsScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.dark },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: "800" },
        tabBarStyle: {
          backgroundColor: C.dark,
          borderTopColor: C.darkMid,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          headerRight: () => (
            <Pressable style={styles.headerAction} onPress={onLogout}>
              <AntDesign name="logout" size={14} color={C.dark} />
              <Text style={styles.headerActionText}>Logout</Text>
            </Pressable>
          ),
        }}
      />
      <Tab.Screen
        name="Hives"
        component={HivesStackScreen}
        options={{ title: "All Hives", tabBarLabel: "Hives" }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsStackScreen}
        options={{ title: "Alerts", tabBarLabel: "Alerts" }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: "Map", tabBarLabel: "Map" }}
      />
    </Tab.Navigator>
  );
}

function WelcomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <View style={styles.welcomeShell}>
      <View style={styles.welcomeCard}>
        <View style={styles.logoFrame}>
          <Image
            source={beeLogo}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tagline}>Smart Beekeeping, Healthier Hives.</Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </View>

      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />
    </View>
  );
}

function LoginScreen({
  navigation,
  onAuthSuccess,
}: NativeStackScreenProps<RootStackParamList, "Login"> & {
  onAuthSuccess: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.formPage}
      keyboardShouldPersistTaps="handled"
    >
      {/* <Pressable
        onPress={() => navigation.navigate("Welcome")}
        style={styles.backChip}
      >
        <Text style={styles.backChipText}>Back</Text>
      </Pressable> */}

      <View style={styles.formCard}>
        <View style={styles.brandMark}>
          <Image
            source={beeLogo}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandText}>BSADS</Text>
        <Text style={styles.heading}>Welcome Back</Text>

        <TextInput
          placeholder="Email or Username"
          placeholderTextColor="#97A1B2"
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#97A1B2"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.primaryButtonWide,
            pressed && styles.pressed,
          ]}
          onPress={onAuthSuccess}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>or</Text>
          <View style={styles.separatorLine} />
        </View>

        <Pressable onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.linkAction}>Create an Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SignupScreen({
  navigation,
  onAuthSuccess,
}: NativeStackScreenProps<RootStackParamList, "Signup"> & {
  onAuthSuccess: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.formPage}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => navigation.navigate("Login")}
        style={styles.backChip}
      >
        <Text style={styles.backChipText}>Back</Text>
      </Pressable>

      <View style={styles.formCard}>
        <View style={styles.brandMark}>
          <Image
            source={beeLogo}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandText}>BSADS</Text>
        <Text style={styles.heading}>Create Your Account</Text>

        <TextInput
          placeholder="John Doe"
          placeholderTextColor="#97A1B2"
          style={styles.input}
        />
        <TextInput
          placeholder="john.doe@example.com"
          placeholderTextColor="#97A1B2"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#97A1B2"
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="Confirm your password"
          placeholderTextColor="#97A1B2"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.primaryButtonWide,
            pressed && styles.pressed,
          ]}
          onPress={onAuthSuccess}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Text style={styles.footerPrompt}>
          Already have an account?{" "}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate("Login")}
          >
            Login
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

function HivesStackScreen() {
  return (
    <HivesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.dark },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <HivesStack.Screen
        name="HiveList"
        component={HivesListScreen}
        options={{ title: "All Hives" }}
      />
      <HivesStack.Screen
        name="HiveDetails"
        component={HiveDetailsScreen}
        options={({ route }) => ({ title: route.params.hiveId })}
      />
    </HivesStack.Navigator>
  );
}

function AlertsStackScreen() {
  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.dark },
        headerTintColor: C.primary,
        headerTitleStyle: { fontWeight: "800" },
      }}
    >
      <AlertsStack.Screen
        name="AlertsList"
        component={AlertsListScreen}
        options={{ title: "Recent Alerts" }}
      />
      <AlertsStack.Screen
        name="AlertDetails"
        component={AlertDetailsScreen}
        options={{ title: "Alert Details" }}
      />
    </AlertsStack.Navigator>
  );
}

function AlertsListScreen({
  navigation,
}: NativeStackScreenProps<AlertsStackParamList, "AlertsList">) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.stateText}>Loading alerts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load alerts</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable
          style={styles.primaryButtonSmall}
          onPress={() => void loadAlerts()}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <Text style={styles.pageTitle}>Recent Alerts</Text>

      {alerts.map((alert) => (
        <Pressable
          key={alert.id}
          style={({ pressed }) => [
            styles.alertRowCard,
            pressed && styles.pressedRow,
          ]}
          onPress={() =>
            navigation.navigate("AlertDetails", { alertId: alert.id })
          }
        >
          <View style={styles.alertRowHeader}>
            <SeverityPill severity={alert.severity} />
            <Text style={styles.alertRowArrow}>→</Text>
          </View>
          <Text style={styles.alertRowHive}>{alert.hiveId}</Text>
          <Text style={styles.alertRowSummary}>{alert.summary}</Text>
          <View style={styles.alertRowFooter}>
            <Text style={styles.alertRowDate}>{alert.date}</Text>
            <Text style={styles.alertRowAction}>View details</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function AlertDetailsScreen({
  route,
}: NativeStackScreenProps<AlertsStackParamList, "AlertDetails">) {
  const { alertId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AlertDetailData | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlertDetail(alertId);
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load alert details",
      );
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleAcknowledge = useCallback(async () => {
    if (!detail || acknowledging) {
      return;
    }

    setAcknowledging(true);
    try {
      await acknowledgeAlert(detail.id);
      setDetail((current) =>
        current ? { ...current, acknowledged: true } : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not acknowledge alert",
      );
    } finally {
      setAcknowledging(false);
    }
  }, [acknowledging, detail]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.stateText}>Loading alert details...</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load alert</Text>
        <Text style={styles.errorBody}>
          {error ?? "No detail returned from API"}
        </Text>
        <Pressable
          style={styles.primaryButtonSmall}
          onPress={() => void loadDetail()}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.detailPage}>
      <View style={styles.detailHeroCard}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.alertIconCircle}>
            <Text style={styles.alertIconText}>!</Text>
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailAlertTitle}>{detail.title}</Text>
            <Text style={styles.detailAlertSubtitle}>{detail.hiveId}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Alert Information</Text>
        <InfoRow
          label="Severity"
          value={detail.severity}
          valueColor={severityColor(detail.severity)}
        />
        <InfoRow label="Hive" value={detail.hiveId} />
        <InfoRow label="Time" value={detail.time} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.detailLongText}>{detail.details}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          styles.actionButton,
          pressed && styles.pressed,
          detail.acknowledged && styles.actionButtonDisabled,
        ]}
        onPress={handleAcknowledge}
        disabled={acknowledging || detail.acknowledged}
      >
        <Text style={styles.primaryButtonText}>
          {detail.acknowledged
            ? "Alert acknowledged"
            : acknowledging
              ? "Acknowledging..."
              : "Acknowledge Alert"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function SeverityPill({ severity }: { severity: AlertSeverity }) {
  return (
    <View
      style={[
        styles.severityPill,
        { backgroundColor: `${severityColor(severity)}20` },
      ]}
    >
      <Text
        style={[styles.severityPillText, { color: severityColor(severity) }]}
      >
        {severity}
      </Text>
    </View>
  );
}

function severityColor(severity: AlertSeverity): string {
  if (severity === "Critical") {
    return C.statusSwarm;
  }
  if (severity === "Warning") {
    return C.statusPreswarm;
  }
  return C.primary;
}

function DashboardScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Dashboard">) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.stateText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load dashboard</Text>
        <Text style={styles.errorBody}>
          {error ?? "No data returned from API"}
        </Text>
        <Pressable
          style={styles.primaryButtonSmall}
          onPress={() => void loadDashboard()}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const debugHiveIds = ["Hive-001", "Hive-002", "Hive-003"];

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Hive Overview</Text>
          <View style={styles.healthPill}>
            <Text style={styles.healthPillText}>Live API</Text>
          </View>
        </View>

        <View style={styles.overviewRow}>
          <View>
            <Text style={styles.metricBigGreen}>{dashboard.totalHives}</Text>
            <Text style={styles.metricCaption}>Total Hives</Text>
          </View>
          <View>
            <Text style={styles.metricBigOrange}>{dashboard.activeHives}</Text>
            <Text style={styles.metricCaption}>Active Hives</Text>
          </View>
        </View>
      </View>

      <View style={styles.alertBanner}>
        <View style={styles.alertBannerIcon}>
          <Text style={styles.alertBannerIconText}>!</Text>
        </View>
        <View style={styles.alertBannerTextWrap}>
          <Text style={styles.alertBannerTitle}>Pre-swarm risk</Text>
          <Text style={styles.alertBannerSubtitle}>
            {dashboard.statusCounts["Pre-swarm"]} hives need attention right
            now.
          </Text>
        </View>
        <Pressable
          style={styles.alertBannerButton}
          onPress={() => navigation.navigate("Hives", { screen: "HiveList" })}
        >
          <Text style={styles.alertBannerButtonText}>Review</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Alerts</Text>
      <View style={styles.gridTwo}>
        <StatCard
          label="Normal"
          value={dashboard.statusCounts.Healthy}
          color={C.statusHealthy}
          icon="N"
        />
        <StatCard
          label="Pre-swarm"
          value={dashboard.statusCounts["Pre-swarm"]}
          color={C.statusPreswarm}
          icon="P"
        />
        <StatCard
          label="Swarm"
          value={dashboard.statusCounts.Swarm}
          color={C.statusSwarm}
          icon="S"
        />
        <StatCard
          label="Abscondment"
          value={dashboard.statusCounts.Abscondment}
          color={C.statusAbscondment}
          icon="A"
        />
      </View>

      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.gridTwo}>
        <MetricCard
          title="Average Temperature"
          value={dashboard.keyMetrics.temperatureC.toFixed(1)}
          unit=" C"
          subtitle="Last 24 hours"
        />
        <MetricCard
          title="Average Humidity"
          value={dashboard.keyMetrics.humidityPercent.toFixed(0)}
          unit="%"
          subtitle="Last 24 hours"
        />
        <MetricCard
          title="Estimated Population"
          value={dashboard.keyMetrics.populationKBees.toFixed(0)}
          unit="k bees"
          subtitle="Across all hives"
        />
        <MetricCard
          title="Avg. Nectar Flow"
          value={dashboard.keyMetrics.nectarFlowKgPerDay.toFixed(1)}
          unit="kg/day"
          subtitle="Based on hive weight"
        />
      </View>

      <View style={styles.quickActionsRow}>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("Hives", { screen: "HiveList" })}
        >
          <Text style={styles.quickActionText}>All Hives</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={styles.quickActionText}>Map</Text>
        </Pressable>
      </View>

      <ClassificationDebugPanel hiveIds={debugHiveIds} visible />
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statLabel, { color }]}>
        {icon} {label}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MetricCard({
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

function HivesListScreen({
  navigation,
}: NativeStackScreenProps<HivesStackParamList, "HiveList">) {
  const [hives, setHives] = useState<Hive[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHives = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHives(search);
      setHives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hives");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadHives(searchText);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchText, loadHives]);

  const title = useMemo(() => `All Hives (${hives.length})`, [hives.length]);

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <Text style={styles.pageTitle}>{title}</Text>

      <View style={styles.searchBarWrap}>
        <Text style={styles.searchIcon}>Q</Text>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          placeholder="Search hives"
          placeholderTextColor="#95A0AE"
        />
      </View>

      {loading && (
        <View style={styles.inlineState}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.stateTextSmall}>Loading hives...</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable
            style={styles.primaryButtonSmall}
            onPress={() => void loadHives(searchText)}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && hives.length === 0 && (
        <View style={styles.inlineState}>
          <Text style={styles.stateTextSmall}>
            No hives found for this search.
          </Text>
        </View>
      )}

      {!error &&
        hives.map((hive) => (
          <Pressable
            key={hive.id}
            style={({ pressed }) => [
              styles.hiveRowCard,
              pressed && styles.pressedRow,
            ]}
            onPress={() =>
              navigation.navigate("HiveDetails", { hiveId: hive.id })
            }
          >
            <View>
              <Text style={styles.hiveName}>{hive.id}</Text>
              <Text
                style={[
                  styles.hiveStatus,
                  { color: STATUS_COLOR[hive.status] },
                ]}
              >
                {hive.status}
              </Text>
            </View>
            <Pressable
              style={styles.mapChip}
              onPress={() =>
                navigation.navigate("HiveDetails", { hiveId: hive.id })
              }
            >
              <Text style={styles.mapChipText}>View details</Text>
            </Pressable>
          </Pressable>
        ))}
    </ScrollView>
  );
}

function HiveDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<HivesStackParamList, "HiveDetails">) {
  const { hiveId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<HiveDetailData | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHiveDetail(hiveId);
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load hive details",
      );
    } finally {
      setLoading(false);
    }
  }, [hiveId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleAcknowledge = useCallback(async () => {
    if (!detail || acknowledging) {
      return;
    }

    setAcknowledging(true);
    try {
      await acknowledgeHiveAlert(detail.id);
      setDetail((current) =>
        current ? { ...current, acknowledged: true } : current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not acknowledge alert",
      );
    } finally {
      setAcknowledging(false);
    }
  }, [acknowledging, detail]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.stateText}>Loading hive details...</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Failed to load hive</Text>
        <Text style={styles.errorBody}>
          {error ?? "No detail returned from API"}
        </Text>
        <Pressable
          style={styles.primaryButtonSmall}
          onPress={() => void loadDetail()}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const metricSeries =
    detail.metricSeries.length > 0
      ? detail.metricSeries
      : detail.metrics.map((value, index) => ({
        timeLabel: `R${index + 1}`,
        temperatureC: value,
        humidityPercent: 60 + index,
      }));

  const temperatureValues = metricSeries.map((point) => point.temperatureC);
  const humidityValues = metricSeries.map((point) => point.humidityPercent);
  const chartMax = Math.max(...temperatureValues, ...humidityValues, 1);
  const chartHeight = 120;
  const latestTemperature =
    temperatureValues[temperatureValues.length - 1] ?? 0;
  const latestHumidity = humidityValues[humidityValues.length - 1] ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.detailPage}>
      <View style={styles.detailHeroCard}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.alertIconCircle}>
            <Text style={styles.alertIconText}>!</Text>
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailAlertTitle}>{detail.alertTitle}</Text>
            <Text style={styles.detailAlertSubtitle}>
              {detail.alertMessage}
            </Text>
          </View>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.detailStatusRow}>
          <StatusPill status={detail.status} />
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("HiveList")}
          >
            <Text style={styles.secondaryButtonText}>Back to list</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Hive Information</Text>
        <InfoRow label="Name" value={detail.name} />
        <InfoRow label="Location" value={detail.location} />
        <InfoRow
          label="Status"
          value={detail.status}
          valueColor={STATUS_COLOR[detail.status]}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Metrics</Text>
        <Text style={styles.metricsSubtitle}>
          Temperature and humidity against time
        </Text>

        <View style={styles.metricsHighlightsRow}>
          <View style={styles.metricHighlightCard}>
            <Text style={styles.metricHighlightLabel}>Latest Temp</Text>
            <Text style={styles.metricHighlightValue}>
              {latestTemperature.toFixed(1)} C
            </Text>
          </View>
          <View style={styles.metricHighlightCard}>
            <Text style={styles.metricHighlightLabel}>Latest Humidity</Text>
            <Text style={styles.metricHighlightValue}>
              {latestHumidity.toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricsLegendRow}>
          <View style={styles.metricsLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
            <Text style={styles.legendText}>Temperature</Text>
          </View>
          <View style={styles.metricsLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.dark }]} />
            <Text style={styles.legendText}>Humidity</Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          <View style={styles.chartYAxis} />
          <View style={styles.chartArea}>
            {metricSeries.map((point, index) => (
              <View
                key={`${detail.id}-metric-${index}`}
                style={styles.chartColumn}
              >
                <Text style={styles.chartPointValue}>
                  {point.temperatureC.toFixed(1)} C
                </Text>
                <View style={styles.chartBarPair}>
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartBarTemperature,
                      {
                        height: Math.max(
                          12,
                          (point.temperatureC / chartMax) * chartHeight,
                        ),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartBarHumidity,
                      {
                        height: Math.max(
                          12,
                          (point.humidityPercent / chartMax) * chartHeight,
                        ),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartPointSubValue}>
                  {point.humidityPercent.toFixed(0)}%
                </Text>
                <Text style={styles.chartPointLabel}>{point.timeLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Map</Text>
        <View style={styles.detailMapPreview}>
          <View style={styles.detailMapCrossOne} />
          <View style={styles.detailMapCrossTwo} />
          <View style={styles.detailMapLabel}>
            <Text style={styles.mapLabelTitle}>{detail.mapLabel}</Text>
            <Text style={styles.mapLabelSub}>{detail.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.actionButton,
            pressed && styles.pressed,
            detail.acknowledged && styles.actionButtonDisabled,
          ]}
          onPress={handleAcknowledge}
          disabled={acknowledging || detail.acknowledged}
        >
          <Text style={styles.primaryButtonText}>
            {detail.acknowledged
              ? "Alert acknowledged"
              : acknowledging
                ? "Acknowledging..."
                : "Acknowledge alert"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatusPill({ status }: { status: HiveStatus }) {
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: `${STATUS_COLOR[status]}20` },
      ]}
    >
      <Text style={[styles.statusPillText, { color: STATUS_COLOR[status] }]}>
        {status}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueColor = "#1F2A37",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function MapScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Map">) {
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHives = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchHives();
      setHives(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load hive map data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHives();
  }, [loadHives]);

  const mapHives = useMemo(() => hives.filter(hasMapCoordinates), [hives]);
  const region = useMemo(() => getMapRegion(mapHives), [mapHives]);
  const selectedHive = useMemo(
    () => mapHives.find((hive) => hive.id === selectedHiveId) ?? null,
    [mapHives, selectedHiveId],
  );

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
          <Pressable
            style={styles.mapRefreshButton}
            onPress={() => void loadHives()}
          >
            <Text style={styles.mapRefreshText}>Refresh</Text>
          </Pressable>
        </View>

        {Platform.OS === "web" ? (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackTitle}>
              Interactive map preview is native-only.
            </Text>
            <Text style={styles.mapFallbackText}>
              Open the app on Android or iOS to see real pins on the map. Hive
              rows below remain clickable.
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
                      {formatCoordinate(hive.latitude)},{" "}
                      {formatCoordinate(hive.longitude)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.hiveStatus,
                      { color: STATUS_COLOR[hive.status] },
                    ]}
                  >
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
              onMarkerPress={(hiveId: string) => setSelectedHiveId(hiveId)}
            />

            {loading && (
              <View style={styles.mapOverlay}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.stateTextSmall}>Loading hive map...</Text>
              </View>
            )}
          </View>
        )}

        {!!selectedHive && (
          <View style={styles.mapSelectionCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.mapSelectionTitle}>{selectedHive.id}</Text>
              <Text
                style={[
                  styles.hiveStatus,
                  { color: STATUS_COLOR[selectedHive.status] },
                ]}
              >
                {selectedHive.status}
              </Text>
            </View>
            <Text style={styles.mapSelectionMeta}>
              {formatCoordinate(selectedHive.latitude)},{" "}
              {formatCoordinate(selectedHive.longitude)}
            </Text>
            <View style={styles.mapSelectionActions}>
              <Pressable
                style={styles.mapSelectionButton}
                onPress={() =>
                  navigation.navigate("Hives", {
                    screen: "HiveDetails",
                    params: { hiveId: selectedHive.id },
                  })
                }
              >
                <Text style={styles.mapSelectionButtonText}>Open Details</Text>
              </Pressable>
              <Pressable
                style={styles.mapSelectionSecondaryButton}
                onPress={() => setSelectedHiveId(null)}
              >
                <Text style={styles.mapSelectionSecondaryText}>Close</Text>
              </Pressable>
            </View>
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
          <LegendItem color={STATUS_COLOR.Healthy} text="Healthy" />
          <LegendItem color={STATUS_COLOR["Pre-swarm"]} text="Pre-swarm" />
          <LegendItem color={STATUS_COLOR.Swarm} text="Swarm" />
          <LegendItem color={STATUS_COLOR.Abscondment} text="Abscondment" />
        </View>
      </View>
    </ScrollView>
  );
}

function LegendItem({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeShell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: C.dark,
  },
  welcomeCard: {
    width: "100%",
    maxWidth: 360,
    minHeight: 420,
    backgroundColor: C.darkSurface,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  logoFrame: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  welcomeLogo: {
    width: 168,
    height: 154,
    // color:'#FFB268',
    backgroundColor: '#FFB268',
    borderRadius: 20,       // 💡 Adjust this number for more or less rounding
    overflow: 'hidden',
  },
  tagline: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonSmall: {
    marginTop: 12,
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  primaryButtonWide: {
    marginTop: 6,
  },
  primaryButtonText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 15,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  backgroundOrbOne: {
    position: "absolute",
    top: 40,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: "rgba(255, 178, 104, 0.08)",
  },
  backgroundOrbTwo: {
    position: "absolute",
    bottom: 22,
    right: -56,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: "rgba(255, 178, 104, 0.1)",
  },
  formPage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: C.dark,
  },
  backChip: {
    alignSelf: "flex-start",
    marginBottom: 12,
    backgroundColor: C.darkSurface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  backChipText: {
    color: C.primary,
    fontWeight: "600",
  },
  formCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.darkSurface,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brandMark: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandText: {
    textAlign: "center",
    color: C.primary,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 20,
  },
  heading: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: C.surface,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: C.surface,
    backgroundColor: C.darkMid,
    marginBottom: 14,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.primaryBorder,
  },
  separatorText: {
    marginHorizontal: 12,
    color: C.textMuted,
    fontWeight: "600",
  },
  linkAction: {
    textAlign: "center",
    color: C.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  footerPrompt: {
    textAlign: "center",
    color: C.textMuted,
    marginTop: 18,
  },
  footerLink: {
    color: C.primary,
    fontWeight: "700",
  },
  headerAction: {
    backgroundColor: C.primaryLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActionText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 5,
  },
  appPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: C.pageBg,
  },
  detailPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: C.pageBg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  healthPill: {
    backgroundColor: C.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  healthPillText: {
    color: C.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 2,
  },
  metricBigGreen: {
    fontSize: 32,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: -0.5,
  },
  metricBigOrange: {
    fontSize: 32,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: -0.5,
  },
  metricCaption: {
    color: C.textMuted,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
  },
  gridTwo: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    color: C.text,
    fontWeight: "800",
  },
  metricCard: {
    width: "48.5%",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  metricTitle: {
    fontSize: 12,
    color: C.textLight,
    fontWeight: "700",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    color: C.dark,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 16,
    color: C.primaryDark,
    fontWeight: "700",
  },
  metricSubtitle: {
    fontSize: 11,
    color: C.textLight,
    marginTop: 6,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickActionText: {
    color: C.dark,
    fontWeight: "800",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  alertBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBannerIconText: {
    color: C.dark,
    fontWeight: "800",
    fontSize: 18,
  },
  alertBannerTextWrap: {
    flex: 1,
  },
  alertBannerTitle: {
    color: C.dark,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 2,
  },
  alertBannerSubtitle: {
    color: C.primaryDark,
    fontWeight: "600",
    fontSize: 12,
  },
  alertBannerButton: {
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  alertBannerButtonText: {
    color: C.dark,
    fontWeight: "800",
    fontSize: 12,
  },
  alertRowCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  alertRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  alertRowArrow: {
    color: C.textLight,
    fontSize: 20,
    fontWeight: "700",
  },
  alertRowHive: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  alertRowSummary: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  alertRowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertRowDate: {
    color: C.textLight,
    fontWeight: "700",
    fontSize: 12,
  },
  alertRowAction: {
    color: C.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  severityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  severityPillText: {
    fontWeight: "800",
    fontSize: 12,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: C.textMuted,
    fontWeight: "700",
  },
  searchInput: {
    flex: 1,
    color: C.text,
    paddingVertical: 10,
  },
  hiveRowCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pressedRow: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  hiveName: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
  },
  hiveStatus: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  mapChip: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapChipText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "700",
  },
  mapCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  mapHeaderSub: {
    marginTop: 4,
    color: C.textMuted,
    fontWeight: "600",
    fontSize: 12,
  },
  mapRefreshButton: {
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapRefreshText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 12,
  },
  mapViewport: {
    height: 320,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.borderLight,
  },
  realMap: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 242, 236, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapSelectionCard: {
    marginTop: 10,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  mapSelectionTitle: {
    color: C.text,
    fontWeight: "800",
    fontSize: 14,
    flexShrink: 1,
    marginRight: 8,
  },
  mapSelectionMeta: {
    marginTop: 4,
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  mapSelectionActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  mapSelectionButton: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapSelectionButtonText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 12,
  },
  mapSelectionSecondaryButton: {
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  mapSelectionSecondaryText: {
    color: C.dark,
    fontWeight: "700",
    fontSize: 12,
  },
  mapFallback: {
    minHeight: 320,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.borderLight,
    padding: 12,
  },
  mapFallbackTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
  },
  mapFallbackText: {
    marginTop: 6,
    color: C.textMuted,
    lineHeight: 20,
    fontWeight: "600",
  },
  mapFallbackList: {
    marginTop: 12,
    gap: 10,
  },
  mapFallbackRow: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  mapFallbackRowTitle: {
    color: C.text,
    fontWeight: "800",
  },
  mapFallbackRowSub: {
    marginTop: 4,
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyMapState: {
    marginTop: 12,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 12,
    padding: 12,
  },
  stateTitle: {
    color: C.text,
    fontWeight: "800",
    fontSize: 15,
  },
  errorText: {
    marginTop: 12,
    color: C.statusSwarm,
    fontWeight: "700",
    lineHeight: 20,
  },
  mapCanvas: {
    position: "relative",
    height: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.borderLight,
    overflow: "hidden",
    marginBottom: 12,
  },
  pin: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.surface,
  },
  mapLabel: {
    position: "absolute",
    right: 16,
    top: 84,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapLabelTitle: {
    color: C.text,
    fontWeight: "800",
  },
  mapLabelSub: {
    color: C.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  legendWrap: {
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  legendText: {
    color: C.textMuted,
    fontWeight: "600",
  },
  detailHeroCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  detailHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconText: {
    color: C.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  detailHeroTextWrap: {
    flex: 1,
  },
  detailAlertTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  detailAlertSubtitle: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  heroDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  detailStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryLight,
  },
  secondaryButtonText: {
    color: C.dark,
    fontWeight: "800",
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  infoLabel: {
    color: C.textMuted,
    fontWeight: "700",
  },
  infoValue: {
    fontWeight: "800",
  },
  metricsSubtitle: {
    color: C.textMuted,
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  metricsHighlightsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    marginBottom: 10,
  },
  metricHighlightCard: {
    flex: 1,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricHighlightLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  metricHighlightValue: {
    marginTop: 4,
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
  },
  metricsLegendRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 8,
  },
  metricsLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartWrap: {
    marginTop: 10,
    height: 186,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    padding: 12,
    flexDirection: "row",
  },
  chartYAxis: {
    width: 1,
    backgroundColor: C.primaryBorder,
    marginRight: 10,
  },
  chartArea: {
    flex: 1,
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartPointValue: {
    color: C.text,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  chartBarPair: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 3,
  },
  chartBar: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 12,
  },
  chartBarTemperature: {
    backgroundColor: C.primary,
  },
  chartBarHumidity: {
    backgroundColor: C.dark,
  },
  chartPointSubValue: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  chartPointLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  detailMapPreview: {
    height: 180,
    borderRadius: 12,
    backgroundColor: C.borderLight,
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
    overflow: "hidden",
  },
  detailMapCrossOne: {
    position: "absolute",
    left: 18,
    top: 40,
    width: "84%",
    height: 2,
    backgroundColor: C.primaryBorder,
    transform: [{ rotate: "-8deg" }],
  },
  detailMapCrossTwo: {
    position: "absolute",
    left: 18,
    top: 95,
    width: "84%",
    height: 2,
    backgroundColor: C.primaryBorder,
    transform: [{ rotate: "6deg" }],
  },
  detailMapLabel: {
    position: "absolute",
    right: 16,
    top: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButton: {
    marginTop: 6,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  detailLongText: {
    color: C.textMuted,
    lineHeight: 22,
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: C.pageBg,
  },
  inlineState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  stateText: {
    marginTop: 10,
    color: C.textMuted,
    fontWeight: "600",
  },
  stateTextSmall: {
    marginTop: 8,
    color: C.textMuted,
    fontWeight: "600",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.statusSwarm,
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    color: C.statusSwarm,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#FFF3F2",
    borderColor: "#FECDCA",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
});
