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
import { Ionicons } from "@expo/vector-icons";
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
  Classification: undefined;
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

const STATUS_COLOR: Record<HiveStatus, string> = {
  Healthy: "#FFB268",
  "Pre-swarm": "#001E37",
  Swarm: "#001E37",
  Abscondment: "#FFB268",
};

const THEME = {
  primary: "#001E37",
  accent: "#FFB268",
  page: "#F8F9FB",
  surface: "#FFFFFF",
  surfaceSoft: "#FFF5EA",
  line: "#DCE2EA",
  text: "#1F2A37",
  textMuted: "#667085",
  placeholder: "#98A2B3",
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
            contentStyle: { backgroundColor: THEME.page },
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
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
        headerTitleStyle: { fontWeight: "800" },
        tabBarShowLabel: true,
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: THEME.line,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: "#8A97A8",
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
          headerRight: () => (
            <Pressable style={styles.headerAction} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color={THEME.primary} />
              <Text style={styles.headerActionText}>Logout</Text>
            </Pressable>
          ),
        }}
      />
      <Tab.Screen
        name="Hives"
        component={HivesStackScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Hives",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "leaf" : "leaf-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsStackScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: "Map",
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Classification"
        component={ClassificationScreen}
        options={{
          title: "Classification API",
          tabBarLabel: "Classification",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "flask" : "flask-outline"}
              size={size}
              color={color}
            />
          ),
        }}
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
          placeholderTextColor={THEME.placeholder}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={THEME.placeholder}
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
          placeholderTextColor={THEME.placeholder}
          style={styles.input}
        />
        <TextInput
          placeholder="john.doe@example.com"
          placeholderTextColor={THEME.placeholder}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor={THEME.placeholder}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="Confirm your password"
          placeholderTextColor={THEME.placeholder}
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
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
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
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
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
        <ActivityIndicator size="large" color={THEME.accent} />
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
        <ActivityIndicator size="large" color={THEME.accent} />
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
    return THEME.primary;
  }
  if (severity === "Warning") {
    return THEME.accent;
  }
  return THEME.accent;
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
        <ActivityIndicator size="large" color={THEME.accent} />
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
          color={THEME.accent}
          icon="N"
        />
        <StatCard
          label="Pre-swarm"
          value={dashboard.statusCounts["Pre-swarm"]}
          color={THEME.primary}
          icon="P"
        />
        <StatCard
          label="Swarm"
          value={dashboard.statusCounts.Swarm}
          color={THEME.primary}
          icon="S"
        />
        <StatCard
          label="Abscondment"
          value={dashboard.statusCounts.Abscondment}
          color={THEME.accent}
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
    </ScrollView>
  );
}

function ClassificationScreen() {
  const debugHiveIds = ["Hive-001", "Hive-002", "Hive-003"];

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Classification API Simulator</Text>
        <Text style={styles.metricSubtitle}>
          Use this page to test prediction alerts without cluttering the
          dashboard.
        </Text>
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
      <Text style={styles.statLabel}>
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

  return (
    <ScrollView contentContainerStyle={styles.appPage}>
      <View style={styles.searchBarWrap}>
        <Text style={styles.searchIcon}>Q</Text>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
          placeholder="Search hives"
          placeholderTextColor={THEME.placeholder}
        />
      </View>

      {loading && (
        <View style={styles.inlineState}>
          <ActivityIndicator color={THEME.accent} />
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
        <ActivityIndicator size="large" color={THEME.accent} />
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
            <View
              style={[styles.legendDot, { backgroundColor: THEME.accent }]}
            />
            <Text style={styles.legendText}>Temperature</Text>
          </View>
          <View style={styles.metricsLegendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: THEME.primary }]}
            />
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
                <ActivityIndicator color={THEME.accent} />
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
    backgroundColor: THEME.page,
  },
  welcomeCard: {
    width: "100%",
    maxWidth: 360,
    minHeight: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    borderWidth: 1,
    borderColor: THEME.line,
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
  },
  tagline: {
    color: THEME.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonSmall: {
    marginTop: 12,
    backgroundColor: THEME.primary,
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
    color: "#FFFFFF",
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
    backgroundColor: "rgba(0, 30, 55, 0.08)",
  },
  backgroundOrbTwo: {
    position: "absolute",
    bottom: 22,
    right: -56,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: "rgba(255, 178, 104, 0.16)",
  },
  formPage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.page,
  },
  backChip: {
    alignSelf: "flex-start",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  backChipText: {
    color: "#344054",
    fontWeight: "600",
  },
  formCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: THEME.line,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brandMark: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.accent,
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
    color: THEME.primary,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 20,
  },
  heading: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#27272A",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#101828",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#E2E8F0",
  },
  separatorText: {
    marginHorizontal: 12,
    color: "#A0A8B6",
    fontWeight: "600",
  },
  linkAction: {
    textAlign: "center",
    color: THEME.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  footerPrompt: {
    textAlign: "center",
    color: "#667085",
    marginTop: 18,
  },
  footerLink: {
    color: THEME.primary,
    fontWeight: "700",
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  headerActionText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  appPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: THEME.page,
  },
  detailPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: THEME.page,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#253242",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: "#344054",
  },
  healthPill: {
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  healthPillText: {
    color: THEME.primary,
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
    color: THEME.accent,
  },
  metricBigOrange: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.primary,
  },
  metricCaption: {
    color: "#8592A3",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#344054",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    color: THEME.accent,
  },
  statValue: {
    fontSize: 28,
    color: THEME.primary,
    fontWeight: "800",
  },
  metricCard: {
    width: "48.5%",
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
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickActionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  alertBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBannerIconText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
  alertBannerTextWrap: {
    flex: 1,
  },
  alertBannerTitle: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 2,
  },
  alertBannerSubtitle: {
    color: THEME.textMuted,
    fontWeight: "600",
    fontSize: 12,
  },
  alertBannerButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  alertBannerButtonText: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  alertRowCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: "#98A2B3",
    fontSize: 20,
    fontWeight: "700",
  },
  alertRowHive: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  alertRowSummary: {
    color: "#667085",
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
    color: "#98A2B3",
    fontWeight: "700",
    fontSize: 12,
  },
  alertRowAction: {
    color: THEME.primary,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: "#475467",
    fontWeight: "700",
  },
  searchInput: {
    flex: 1,
    color: "#344054",
    paddingVertical: 10,
  },
  hiveRowCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: "#253242",
  },
  hiveStatus: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  mapChip: {
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapChipText: {
    color: "#344054",
    fontSize: 12,
    fontWeight: "700",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: "#667085",
    fontWeight: "600",
    fontSize: 12,
  },
  mapRefreshButton: {
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapRefreshText: {
    color: "#344054",
    fontWeight: "700",
    fontSize: 12,
  },
  mapViewport: {
    height: 320,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: THEME.surfaceSoft,
  },
  realMap: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 249, 251, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapSelectionCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.line,
    padding: 12,
  },
  mapSelectionTitle: {
    color: "#253242",
    fontWeight: "800",
    fontSize: 14,
    flexShrink: 1,
    marginRight: 8,
  },
  mapSelectionMeta: {
    marginTop: 4,
    color: "#667085",
    fontSize: 12,
    fontWeight: "600",
  },
  mapSelectionActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  mapSelectionButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapSelectionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  mapSelectionSecondaryButton: {
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  mapSelectionSecondaryText: {
    color: "#344054",
    fontWeight: "700",
    fontSize: 12,
  },
  mapFallback: {
    minHeight: 320,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: THEME.surfaceSoft,
    padding: 12,
  },
  mapFallbackTitle: {
    color: "#253242",
    fontSize: 16,
    fontWeight: "800",
  },
  mapFallbackText: {
    marginTop: 6,
    color: "#667085",
    lineHeight: 20,
    fontWeight: "600",
  },
  mapFallbackList: {
    marginTop: 12,
    gap: 10,
  },
  mapFallbackRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  mapFallbackRowTitle: {
    color: "#253242",
    fontWeight: "800",
  },
  mapFallbackRowSub: {
    marginTop: 4,
    color: "#667085",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyMapState: {
    marginTop: 12,
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  stateTitle: {
    color: "#253242",
    fontWeight: "800",
    fontSize: 15,
  },
  errorText: {
    marginTop: 12,
    color: "#B42318",
    fontWeight: "700",
    lineHeight: 20,
  },
  mapCanvas: {
    position: "relative",
    height: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E3D0",
    backgroundColor: "#EDF3E8",
    overflow: "hidden",
    marginBottom: 12,
  },
  pin: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: THEME.accent,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mapLabel: {
    position: "absolute",
    right: 16,
    top: 84,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.line,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapLabelTitle: {
    color: "#253242",
    fontWeight: "800",
  },
  mapLabelSub: {
    color: THEME.primary,
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
    color: "#475467",
    fontWeight: "600",
  },
  detailHeroCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconText: {
    color: THEME.accent,
    fontSize: 20,
    fontWeight: "900",
  },
  detailHeroTextWrap: {
    flex: 1,
  },
  detailAlertTitle: {
    color: THEME.primary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  detailAlertSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
  },
  heroDivider: {
    height: 1,
    backgroundColor: THEME.line,
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
    borderColor: THEME.line,
    backgroundColor: THEME.surfaceSoft,
  },
  secondaryButtonText: {
    color: "#344054",
    fontWeight: "800",
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    borderTopColor: THEME.line,
  },
  infoLabel: {
    color: "#667085",
    fontWeight: "700",
  },
  infoValue: {
    fontWeight: "800",
  },
  metricsSubtitle: {
    color: "#667085",
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
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricHighlightLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "700",
  },
  metricHighlightValue: {
    marginTop: 4,
    color: "#253242",
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
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    padding: 12,
    flexDirection: "row",
  },
  chartYAxis: {
    width: 1,
    backgroundColor: THEME.line,
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
    color: "#344054",
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
    backgroundColor: THEME.accent,
  },
  chartBarHumidity: {
    backgroundColor: THEME.primary,
  },
  chartPointSubValue: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  chartPointLabel: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  detailMapPreview: {
    height: 180,
    borderRadius: 12,
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    position: "relative",
    overflow: "hidden",
  },
  detailMapCrossOne: {
    position: "absolute",
    left: 18,
    top: 40,
    width: "84%",
    height: 2,
    backgroundColor: THEME.line,
    transform: [{ rotate: "-8deg" }],
  },
  detailMapCrossTwo: {
    position: "absolute",
    left: 18,
    top: 95,
    width: "84%",
    height: 2,
    backgroundColor: THEME.line,
    transform: [{ rotate: "6deg" }],
  },
  detailMapLabel: {
    position: "absolute",
    right: 16,
    top: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: "#475467",
    lineHeight: 22,
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: THEME.page,
  },
  inlineState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  stateText: {
    marginTop: 10,
    color: "#667085",
    fontWeight: "600",
  },
  stateTextSmall: {
    marginTop: 8,
    color: "#667085",
    fontWeight: "600",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#B42318",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    color: "#7A271A",
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
