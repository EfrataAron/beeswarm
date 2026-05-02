import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  AmbientWeather,
  AlertDetailData,
  AlertItem,
  AlertSeverity,
  Advisory,
  DashboardData,
  Hive,
  HiveDetailData,
  HiveStatus,
  fetchAdvisory,
  fetchAmbientWeather,
  fetchAlertDetail,
  fetchAlerts,
  fetchDashboard,
  fetchHiveDetail,
  fetchHiveAlerts,
  fetchHives,
} from "./src/api/beeswarmApi";
import HiveMap from "./src/components/HiveMap";
import { ClassificationDebugPanel } from "./src/components/ClassificationDebugPanel";
import { HeaderOverflowMenu } from "./src/components/HeaderOverflowMenu";

const beeLogo = require("./assets/images/bee.png");

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  Settings: undefined;
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
  Healthy: "#16A34A",
  "Pre-swarm": "#D97706",
  Swarm: "#DC2626",
  Abscondment: "#6B7280",
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
            <>
              <RootStack.Screen name="MainTabs">
                {(props) => (
                  <MainTabsScreen
                    {...props}
                    onLogout={() => setIsAuthenticated(false)}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  headerShown: true,
                  title: "Settings",
                  headerStyle: { backgroundColor: "#FFFFFF" },
                  headerTintColor: THEME.primary,
                  headerTitleStyle: { fontWeight: "800" },
                }}
              />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}

function MainTabsScreen({
  navigation,
  onLogout,
}: NativeStackScreenProps<RootStackParamList, "MainTabs"> & {
  onLogout: () => void;
}) {
  const openSettingsPage = () => navigation.navigate("Settings");

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
        headerTitleStyle: { fontWeight: "800" },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          includeFontPadding: false,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: THEME.line,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 85 : 70,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: "#8A97A8",
        headerRight: () => (
          <HeaderOverflowMenu
            onOpenSettings={openSettingsPage}
            onLogout={onLogout}
          />
        ),
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
        }}
      />
      <Tab.Screen
        name="Hives"
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
      >
        {() => (
          <HivesStackScreen
            onOpenSettings={openSettingsPage}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Alerts"
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
      >
        {() => (
          <AlertsStackScreen
            onOpenSettings={openSettingsPage}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
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
          tabBarLabel: "ML Model",
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

const PREF_PUSH = "@bsads/push_notifications";
const PREF_CRITICAL = "@bsads/critical_alerts_only";

function SettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Settings">) {
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(true);
  const [criticalAlertsOnly, setCriticalAlertsOnly] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [push, critical] = await Promise.all([
          AsyncStorage.getItem(PREF_PUSH),
          AsyncStorage.getItem(PREF_CRITICAL),
        ]);
        if (push !== null) setPushNotificationsEnabled(push === "true");
        if (critical !== null) setCriticalAlertsOnly(critical === "true");
      } catch {
        // use defaults if storage unavailable
      }
    })();
  }, []);

  const togglePush = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(PREF_PUSH, String(value));
    } catch {}
  };

  const toggleCritical = async (value: boolean) => {
    setCriticalAlertsOnly(value);
    try {
      await AsyncStorage.setItem(PREF_CRITICAL, String(value));
    } catch {}
  };
  const [satelliteMapEnabled, setSatelliteMapEnabled] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F">("C");

  const closeSettings = () => navigation.goBack();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.settingsPage}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Account</Text>
        <View style={styles.settingsAccountCard}>
          <View style={styles.settingsAvatar}>
            <Ionicons name="person" size={20} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsAccountName}>Beekeeper</Text>
            <Text style={styles.settingsAccountEmail}>beekeeper@bsads.app</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Notifications</Text>
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsRowLabel}>Push Notifications</Text>
            <Text style={styles.settingsRowHint}>
              Receive hive status updates and alerts
            </Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={(v: boolean) => void togglePush(v)}
            trackColor={{ false: "#D0D5DD", true: THEME.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.settingsDivider} />
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsRowLabel}>Critical Alerts Only</Text>
            <Text style={styles.settingsRowHint}>
              Reduce noise and notify only high-risk events
            </Text>
          </View>
          <Switch
            value={criticalAlertsOnly}
            onValueChange={(v: boolean) => void toggleCritical(v)}
            trackColor={{ false: "#D0D5DD", true: THEME.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>App Preferences</Text>
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsRowLabel}>Biometric Login</Text>
            <Text style={styles.settingsRowHint}>
              Use fingerprint or face unlock on launch
            </Text>
          </View>
          <Switch
            value={biometricLoginEnabled}
            onValueChange={setBiometricLoginEnabled}
            trackColor={{ false: "#D0D5DD", true: THEME.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.settingsDivider} />
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsRowLabel}>Satellite Map View</Text>
            <Text style={styles.settingsRowHint}>
              Default to satellite style in the map tab
            </Text>
          </View>
          <Switch
            value={satelliteMapEnabled}
            onValueChange={setSatelliteMapEnabled}
            trackColor={{ false: "#D0D5DD", true: THEME.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.settingsDivider} />
        <View style={styles.settingsRowColumn}>
          <Text style={styles.settingsRowLabel}>Temperature Unit</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[
                styles.segmentButton,
                temperatureUnit === "C" && styles.segmentButtonActive,
              ]}
              onPress={() => setTemperatureUnit("C")}
            >
              <Text
                style={[
                  styles.segmentText,
                  temperatureUnit === "C" && styles.segmentTextActive,
                ]}
              >
                Celsius
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                temperatureUnit === "F" && styles.segmentButtonActive,
              ]}
              onPress={() => setTemperatureUnit("F")}
            >
              <Text
                style={[
                  styles.segmentText,
                  temperatureUnit === "F" && styles.segmentTextActive,
                ]}
              >
                Fahrenheit
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.settingsActionsRow}>
        <Pressable
          style={styles.settingsSecondaryButton}
          onPress={closeSettings}
        >
          <Text style={styles.settingsSecondaryButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.settingsPrimaryButton} onPress={closeSettings}>
          <Text style={styles.settingsPrimaryButtonText}>Save Preferences</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function WelcomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <View style={styles.welcomeShell}>
      {/* Background orbs */}
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />
      <View style={styles.backgroundOrbThree} />

      {/* Logo area */}
      <View style={styles.welcomeLogoWrap}>
        <View style={styles.welcomeLogoRing}>
          <Image
            source={beeLogo}
            style={styles.welcomeLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.welcomeAppName}>BSADS</Text>
        <Text style={styles.welcomeAppSub}>
          Bee Swarm & Abscondment Detection
        </Text>
      </View>

      {/* Bottom card */}
      <View style={styles.welcomeBottomCard}>
        <Text style={styles.welcomeHeadline}>
          Smart Beekeeping,{"\n"}Healthier Hives.
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Monitor your hives in real-time. Get instant alerts before swarms
          happen.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.welcomePrimaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("Login")}
        >
          <Ionicons name="log-in-outline" size={18} color={THEME.primary} />
          <Text style={styles.welcomePrimaryBtnText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LoginScreen({
  navigation,
  onAuthSuccess,
}: NativeStackScreenProps<RootStackParamList, "Login"> & {
  onAuthSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }

    if (!valid) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    onAuthSuccess();
  };

  return (
    <View style={styles.authShell}>
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

      <View style={styles.formCard}>
        <View style={styles.brandMark}>
          <Image
            source={beeLogo}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandText}>BSADS</Text>
        <Text style={styles.heading}>Welcome</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={THEME.placeholder}
          style={[styles.input, !!emailError && styles.inputError]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t: string) => {
            setEmail(t);
            setEmailError("");
          }}
        />
        {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}

        <TextInput
          placeholder="Password"
          placeholderTextColor={THEME.placeholder}
          secureTextEntry
          style={[styles.input, !!passwordError && styles.inputError]}
          value={password}
          onChangeText={(t: string) => {
            setPassword(t);
            setPasswordError("");
          }}
        />
        {!!passwordError && (
          <Text style={styles.fieldError}>{passwordError}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.primaryButtonWide,
            (pressed || submitting) && styles.pressed,
          ]}
          onPress={() => void handleLogin()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Login</Text>
          )}
        </Pressable>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>or</Text>
          <View style={styles.separatorLine} />
        </View>
        <Text style={styles.authTextPrompt}>Don't have an account? </Text>
        <Pressable onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.linkAction}>Create an Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SignupScreen({
  navigation,
  onAuthSuccess,
}: NativeStackScreenProps<RootStackParamList, "Signup"> & {
  onAuthSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSignup = async () => {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "Full name is required.";
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!phone.trim()) next.phone = "Phone number is required.";
    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    onAuthSuccess();
  };

  const field = (key: string) => ({
    hasError: !!errors[key],
    clearError: () =>
      setErrors((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      }),
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.authShell}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

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
          placeholder="Full Name"
          placeholderTextColor={THEME.placeholder}
          style={[styles.input, field("name").hasError && styles.inputError]}
          value={name}
          onChangeText={(t: string) => {
            setName(t);
            field("name").clearError();
          }}
        />
        {!!errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

        <TextInput
          placeholder="Email"
          placeholderTextColor={THEME.placeholder}
          style={[styles.input, field("email").hasError && styles.inputError]}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(t: string) => {
            setEmail(t);
            field("email").clearError();
          }}
        />
        {!!errors.email && (
          <Text style={styles.fieldError}>{errors.email}</Text>
        )}

        <TextInput
          placeholder="Phone Number"
          placeholderTextColor={THEME.placeholder}
          style={[styles.input, field("phone").hasError && styles.inputError]}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(t: string) => {
            setPhone(t);
            field("phone").clearError();
          }}
        />
        {!!errors.phone && (
          <Text style={styles.fieldError}>{errors.phone}</Text>
        )}

        <TextInput
          placeholder="Password (min 8 characters)"
          placeholderTextColor={THEME.placeholder}
          secureTextEntry
          style={[
            styles.input,
            field("password").hasError && styles.inputError,
          ]}
          value={password}
          onChangeText={(t: string) => {
            setPassword(t);
            field("password").clearError();
          }}
        />
        {!!errors.password && (
          <Text style={styles.fieldError}>{errors.password}</Text>
        )}

        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor={THEME.placeholder}
          secureTextEntry
          style={[
            styles.input,
            field("confirmPassword").hasError && styles.inputError,
          ]}
          value={confirmPassword}
          onChangeText={(t: string) => {
            setConfirmPassword(t);
            field("confirmPassword").clearError();
          }}
        />
        {!!errors.confirmPassword && (
          <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.primaryButtonWide,
            (pressed || submitting) && styles.pressed,
          ]}
          onPress={() => void handleSignup()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
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

function HivesStackScreen({
  onOpenSettings,
  onLogout,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <HivesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => (
          <HeaderOverflowMenu
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
          />
        ),
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

function AlertsStackScreen({
  onOpenSettings,
  onLogout,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: THEME.primary,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => (
          <HeaderOverflowMenu
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
          />
        ),
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertSeverity | "All">("All");

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

  const onRefreshAlerts = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const SEVERITY_COLOR: Record<AlertSeverity, string> = {
    Critical: "#DC2626",
    Warning: "#D97706",
    Info: "#2563EB",
  };
  const SEVERITY_BG: Record<AlertSeverity, string> = {
    Critical: "#FEF2F2",
    Warning: "#FFFBEB",
    Info: "#EFF6FF",
  };
  const SEVERITY_ICON: Record<AlertSeverity, keyof typeof Ionicons.glyphMap> = {
    Critical: "alert-circle",
    Warning: "warning",
    Info: "information-circle",
  };

  const ALL_SEVERITIES: AlertSeverity[] = ["Critical", "Warning", "Info"];
  const filtered =
    filter === "All" ? alerts : alerts.filter((a) => a.severity === filter);

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
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={[styles.appPage, { flexGrow: 1 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefreshAlerts()}
          colors={[THEME.accent]}
          tintColor={THEME.accent}
        />
      }
    >
      {/* Filter pills */}
      <View style={styles.hiveSummaryStrip}>
        <Pressable
          style={[
            styles.hiveSummaryPill,
            filter === "All" && styles.hiveSummaryPillActive,
          ]}
          onPress={() => setFilter("All")}
        >
          <Text
            style={[
              styles.hiveSummaryPillText,
              filter === "All" && styles.hiveSummaryPillTextActive,
            ]}
          >
            All {alerts.length}
          </Text>
        </Pressable>
        {ALL_SEVERITIES.map((s) => {
          const count = alerts.filter((a) => a.severity === s).length;
          if (count === 0) return null;
          const active = filter === s;
          return (
            <Pressable
              key={s}
              style={[
                styles.hiveSummaryPill,
                { borderColor: SEVERITY_COLOR[s] },
                active && { backgroundColor: SEVERITY_BG[s] },
              ]}
              onPress={() => setFilter(active ? "All" : s)}
            >
              <View
                style={[
                  styles.hiveSummaryDot,
                  { backgroundColor: SEVERITY_COLOR[s] },
                ]}
              />
              <Text
                style={[
                  styles.hiveSummaryPillText,
                  { color: SEVERITY_COLOR[s] },
                ]}
              >
                {s} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Count */}
      <Text style={styles.hiveListCount}>
        {filtered.length}{" "}
        {filter === "All" ? "alerts" : filter.toLowerCase() + " alerts"}
      </Text>

      {filtered.length === 0 && (
        <View style={styles.inlineState}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
          <Text style={styles.stateTextSmall}>No alerts in this category</Text>
        </View>
      )}

      {filtered.map((alert) => (
        <Pressable
          key={alert.id}
          style={({ pressed }) => [
            styles.alertCard,
            pressed && styles.pressedRow,
          ]}
          onPress={() =>
            navigation.navigate("AlertDetails", { alertId: alert.id })
          }
        >
          <View style={styles.alertCardBody}>
            <View style={styles.alertCardTopRow}>
              <View style={styles.alertCardIconWrap}>
                <Ionicons
                  name={SEVERITY_ICON[alert.severity]}
                  size={20}
                  color={SEVERITY_COLOR[alert.severity]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertCardTitle}>{alert.title}</Text>
                <View style={styles.alertCardMeta}>
                  <Ionicons
                    name="cube-outline"
                    size={11}
                    color={THEME.textMuted}
                  />
                  <Text style={styles.alertCardMetaText}>{alert.hiveId}</Text>
                  <Text style={styles.alertCardMetaDot}>·</Text>
                  <Text style={styles.alertCardMetaText}>{alert.date}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={THEME.placeholder}
              />
            </View>
            <Text style={styles.alertCardSummary} numberOfLines={2}>
              {alert.summary}
            </Text>
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
  const [advisory, setAdvisory] = useState<Advisory | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, adv] = await Promise.all([
        fetchAlertDetail(alertId),
        fetchAdvisory(alertId),
      ]);
      setDetail(data);
      setAdvisory(adv);
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

  const PRIORITY_COLOR = { High: "#DC2626", Medium: "#D97706", Low: "#16A34A" };

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
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero ── */}
      <View
        style={[styles.detailHeroCard, detail.acknowledged && { opacity: 0.7 }]}
      >
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHiveIconWrap}>
            <Ionicons
              name="alert-circle-outline"
              size={26}
              color={THEME.accent}
            />
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.title}</Text>
            <Text style={styles.detailHeroMeta}>
              {detail.hiveId} · {detail.time}
            </Text>
          </View>
          <SeverityPill severity={detail.severity} />
        </View>
        {detail.acknowledged && (
          <View style={styles.alertClosedBanner}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.alertClosedText}>
              This alert has been acknowledged and closed
            </Text>
          </View>
        )}
      </View>

      {/* ── Alert Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert Information</Text>
        <InfoRow
          label="Severity"
          value={detail.severity}
          valueColor={severityColor(detail.severity)}
        />
        <InfoRow label="Hive" value={detail.hiveId} />
        <InfoRow label="Time" value={detail.time} />
        <InfoRow
          label="Status"
          value={detail.acknowledged ? "Closed" : "Open"}
          valueColor={detail.acknowledged ? "#16A34A" : "#D97706"}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <Text style={styles.detailLongText}>{detail.details}</Text>
      </View>

      {/* ── Advisory ── */}
      {advisory && !detail.acknowledged && (
        <View style={styles.card}>
          <View style={styles.advisoryHeader}>
            <View style={styles.advisoryTitleRow}>
              <Ionicons name="bulb-outline" size={18} color={THEME.accent} />
              <Text style={styles.cardTitle}>Advisory</Text>
            </View>
            <View
              style={[
                styles.advisoryTypeBadge,
                {
                  backgroundColor:
                    advisory.type === "Reactive" ? "#FEF2F2" : "#F0FDF4",
                },
              ]}
            >
              <Text
                style={[
                  styles.advisoryTypeText,
                  {
                    color: advisory.type === "Reactive" ? "#DC2626" : "#16A34A",
                  },
                ]}
              >
                {advisory.type}
              </Text>
            </View>
          </View>

          <Text style={styles.advisorySummary}>{advisory.summary}</Text>

          <Text style={styles.advisoryActionsTitle}>Recommended Actions</Text>

          {advisory.actions.map((action) => (
            <View key={action.id} style={styles.advisoryActionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.advisoryActionText}>
                  {action.description}
                </Text>
              </View>
              <View
                style={[
                  styles.advisoryPriorityDot,
                  { backgroundColor: PRIORITY_COLOR[action.priority] },
                ]}
              />
            </View>
          ))}
        </View>
      )}
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

const TREND_24H: Array<{ label: string; count: number }> = [
  { label: "00", count: 0 },
  { label: "03", count: 1 },
  { label: "06", count: 2 },
  { label: "09", count: 2 },
  { label: "12", count: 3 },
  { label: "15", count: 2 },
  { label: "18", count: 3 },
  { label: "21", count: 1 },
];

const TREND_30D: Array<{ label: string; count: number }> = [
  { label: "Apr 1", count: 1 },
  { label: "Apr 4", count: 2 },
  { label: "Apr 7", count: 1 },
  { label: "Apr 10", count: 3 },
  { label: "Apr 13", count: 2 },
  { label: "Apr 16", count: 4 },
  { label: "Apr 19", count: 3 },
  { label: "Apr 22", count: 5 },
  { label: "Apr 25", count: 4 },
  { label: "Apr 28", count: 3 },
];

function DashboardScreen({
  navigation,
}: BottomTabScreenProps<MainTabParamList, "Dashboard">) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ambientWeather, setAmbientWeather] = useState<AmbientWeather | null>(
    null,
  );
  const [dashboardAlerts, setDashboardAlerts] = useState<AlertItem[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [openAlertMenu, setOpenAlertMenu] = useState<
    "severity" | "hive" | "latest" | null
  >(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "All">(
    "All",
  );
  const [hiveFilter, setHiveFilter] = useState<string>("All");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<"24h" | "7d" | "30d">("7d");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAlertsError(null);
    try {
      const data = await fetchDashboard();
      setDashboard(data);

      try {
        const alerts = await fetchAlerts();
        setDashboardAlerts(alerts);
      } catch (alertsErr) {
        setDashboardAlerts([]);
        setAlertsError(
          alertsErr instanceof Error
            ? alertsErr.message
            : "Could not load dashboard alerts",
        );
      }

      try {
        const weather = await fetchAmbientWeather();
        setAmbientWeather(weather);
      } catch {
        setAmbientWeather(null);
      }
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

  const onRefreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const severityCounts = useMemo(
    () => ({
      Critical: dashboardAlerts.filter((a) => a.severity === "Critical").length,
      Warning: dashboardAlerts.filter((a) => a.severity === "Warning").length,
      Info: dashboardAlerts.filter((a) => a.severity === "Info").length,
    }),
    [dashboardAlerts],
  );

  const hiveOptions = useMemo(() => {
    const counts = new Map<string, number>();
    dashboardAlerts.forEach((alert) => {
      counts.set(alert.hiveId, (counts.get(alert.hiveId) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [dashboardAlerts]);

  const latestAlerts = useMemo(
    () =>
      [...dashboardAlerts]
        .sort((a, b) => {
          const aTime = Date.parse(a.date.replace(" ", "T"));
          const bTime = Date.parse(b.date.replace(" ", "T"));
          return (
            (Number.isFinite(bTime) ? bTime : 0) -
            (Number.isFinite(aTime) ? aTime : 0)
          );
        })
        .slice(0, 6),
    [dashboardAlerts],
  );

  const filteredDashboardAlerts = useMemo(
    () =>
      dashboardAlerts.filter((alert) => {
        const passesSeverity =
          severityFilter === "All" || alert.severity === severityFilter;
        const passesHive = hiveFilter === "All" || alert.hiveId === hiveFilter;
        return passesSeverity && passesHive;
      }),
    [dashboardAlerts, severityFilter, hiveFilter],
  );

  const selectedDashboardAlert = useMemo(() => {
    if (filteredDashboardAlerts.length === 0) {
      return null;
    }
    return (
      filteredDashboardAlerts.find((alert) => alert.id === selectedAlertId) ??
      filteredDashboardAlerts[0]
    );
  }, [filteredDashboardAlerts, selectedAlertId]);

  const activeTrendData = useMemo(() => {
    if (trendRange === "24h") return TREND_24H;
    if (trendRange === "30d") return TREND_30D;
    return (dashboard?.preSwarmTrend ?? []).map((d) => ({
      label: d.day,
      count: d.count,
    }));
  }, [trendRange, dashboard?.preSwarmTrend]);

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

  const total = dashboard.totalHives || 1;
  const donutSegments: {
    pct: number;
    color: string;
    label: string;
    count: number;
  }[] = [
    {
      pct: dashboard.statusCounts.Healthy / total,
      color: "#22C55E",
      label: "Healthy",
      count: dashboard.statusCounts.Healthy,
    },
    {
      pct: dashboard.statusCounts["Pre-swarm"] / total,
      color: THEME.accent,
      label: "Pre-swarm",
      count: dashboard.statusCounts["Pre-swarm"],
    },
    {
      pct: dashboard.statusCounts.Swarm / total,
      color: "#EF4444",
      label: "Swarm",
      count: dashboard.statusCounts.Swarm,
    },
    {
      pct: dashboard.statusCounts.Abscondment / total,
      color: "#94A3B8",
      label: "Abscondment",
      count: dashboard.statusCounts.Abscondment,
    },
  ];

  const dashboardSeverityColor: Record<AlertSeverity, string> = {
    Critical: "#DC2626",
    Warning: "#D97706",
    Info: "#2563EB",
  };

  const displayTemperature =
    ambientWeather?.temperatureC ?? dashboard.keyMetrics.temperatureC;
  const displayHumidity =
    ambientWeather?.humidityPercent ?? dashboard.keyMetrics.humidityPercent;
  const weatherSubtitle = ambientWeather
    ? "Live weather (Open-Meteo)"
    : "Last 24 hours";

  return (
    <ScrollView
      contentContainerStyle={styles.appPage}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefreshDashboard()}
          colors={[THEME.accent]}
          tintColor={THEME.accent}
        />
      }
    >
      <View style={styles.dashboardAlertsCard}>
        <View style={styles.dashboardAlertsTopRow}>
          <View style={styles.dashboardAlertsTitleWrap}>
            <Text style={styles.dashboardAlertsTitle}>Alerts</Text>
            <Text style={styles.dashboardAlertsSubTitle}>
              Dashboard quick view
            </Text>
          </View>
          <View style={styles.hiveAlertCountBadge}>
            <Text style={styles.hiveAlertCountText}>
              {filteredDashboardAlerts.length} shown
            </Text>
          </View>
        </View>

        <View style={styles.dashboardAlertMenuRow}>
          <Pressable
            style={[
              styles.dashboardAlertMenuChip,
              openAlertMenu === "severity" &&
                styles.dashboardAlertMenuChipActive,
            ]}
            onPress={() =>
              setOpenAlertMenu((current) =>
                current === "severity" ? null : "severity",
              )
            }
          >
            <Ionicons
              name="funnel-outline"
              size={14}
              color={openAlertMenu === "severity" ? "#FFFFFF" : THEME.primary}
            />
            <Text
              style={[
                styles.dashboardAlertMenuChipText,
                openAlertMenu === "severity" &&
                  styles.dashboardAlertMenuChipTextActive,
              ]}
            >
              Severity
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.dashboardAlertMenuChip,
              openAlertMenu === "hive" && styles.dashboardAlertMenuChipActive,
            ]}
            onPress={() =>
              setOpenAlertMenu((current) =>
                current === "hive" ? null : "hive",
              )
            }
          >
            <Ionicons
              name="cube-outline"
              size={14}
              color={openAlertMenu === "hive" ? "#FFFFFF" : THEME.primary}
            />
            <Text
              style={[
                styles.dashboardAlertMenuChipText,
                openAlertMenu === "hive" &&
                  styles.dashboardAlertMenuChipTextActive,
              ]}
            >
              Hive
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.dashboardAlertMenuChip,
              openAlertMenu === "latest" && styles.dashboardAlertMenuChipActive,
            ]}
            onPress={() =>
              setOpenAlertMenu((current) =>
                current === "latest" ? null : "latest",
              )
            }
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={openAlertMenu === "latest" ? "#FFFFFF" : THEME.primary}
            />
            <Text
              style={[
                styles.dashboardAlertMenuChipText,
                openAlertMenu === "latest" &&
                  styles.dashboardAlertMenuChipTextActive,
              ]}
            >
              Latest
            </Text>
          </Pressable>
        </View>

        {openAlertMenu !== null && (
          <View style={styles.dashboardAlertSubMenu}>
            <View style={styles.dashboardAlertSubMenuHeader}>
              <Text style={styles.dashboardAlertSubMenuTitle}>
                {openAlertMenu === "severity"
                  ? "Severity Categories"
                  : openAlertMenu === "hive"
                    ? "Hive Categories"
                    : "Recent Alerts"}
              </Text>
              <Pressable
                style={styles.dashboardAlertSubMenuCloseBtn}
                onPress={() => setOpenAlertMenu(null)}
              >
                <Ionicons name="close" size={16} color={THEME.textMuted} />
              </Pressable>
            </View>

            {openAlertMenu === "severity" && (
              <View style={styles.dashboardAlertSubMenuList}>
                <Pressable
                  style={[
                    styles.dashboardAlertSubMenuItem,
                    severityFilter === "All" &&
                      styles.dashboardAlertSubMenuItemActive,
                  ]}
                  onPress={() => setSeverityFilter("All")}
                >
                  <Text
                    style={[
                      styles.dashboardAlertSubMenuItemText,
                      severityFilter === "All" &&
                        styles.dashboardAlertSubMenuItemTextActive,
                    ]}
                  >
                    All ({dashboardAlerts.length})
                  </Text>
                </Pressable>
                {(["Critical", "Warning", "Info"] as AlertSeverity[]).map(
                  (severity) => (
                    <Pressable
                      key={severity}
                      style={[
                        styles.dashboardAlertSubMenuItem,
                        severityFilter === severity &&
                          styles.dashboardAlertSubMenuItemActive,
                      ]}
                      onPress={() => setSeverityFilter(severity)}
                    >
                      <View
                        style={[
                          styles.dashboardAlertSubMenuDot,
                          { backgroundColor: dashboardSeverityColor[severity] },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dashboardAlertSubMenuItemText,
                          severityFilter === severity &&
                            styles.dashboardAlertSubMenuItemTextActive,
                        ]}
                      >
                        {severity} ({severityCounts[severity]})
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            )}

            {openAlertMenu === "hive" && (
              <View style={styles.dashboardAlertSubMenuList}>
                <Pressable
                  style={[
                    styles.dashboardAlertSubMenuItem,
                    hiveFilter === "All" &&
                      styles.dashboardAlertSubMenuItemActive,
                  ]}
                  onPress={() => setHiveFilter("All")}
                >
                  <Text
                    style={[
                      styles.dashboardAlertSubMenuItemText,
                      hiveFilter === "All" &&
                        styles.dashboardAlertSubMenuItemTextActive,
                    ]}
                  >
                    All hives
                  </Text>
                </Pressable>
                {hiveOptions.map(([hiveId, count]) => (
                  <Pressable
                    key={hiveId}
                    style={[
                      styles.dashboardAlertSubMenuItem,
                      hiveFilter === hiveId &&
                        styles.dashboardAlertSubMenuItemActive,
                    ]}
                    onPress={() => setHiveFilter(hiveId)}
                  >
                    <Text
                      style={[
                        styles.dashboardAlertSubMenuItemText,
                        hiveFilter === hiveId &&
                          styles.dashboardAlertSubMenuItemTextActive,
                      ]}
                    >
                      {hiveId} ({count})
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {openAlertMenu === "latest" && (
              <View style={styles.dashboardAlertSubMenuList}>
                {latestAlerts.map((alert) => (
                  <Pressable
                    key={alert.id}
                    style={styles.dashboardAlertSubMenuItem}
                    onPress={() => {
                      setSelectedAlertId(alert.id);
                      setOpenAlertMenu(null);
                    }}
                  >
                    <View
                      style={[
                        styles.dashboardAlertSubMenuDot,
                        {
                          backgroundColor:
                            dashboardSeverityColor[alert.severity],
                        },
                      ]}
                    />
                    <Text style={styles.dashboardAlertSubMenuItemText}>
                      {alert.title}
                    </Text>
                  </Pressable>
                ))}
                {latestAlerts.length === 0 && (
                  <Text style={styles.dashboardAlertSubMenuEmpty}>
                    No recent alerts available
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {alertsError && (
          <Text style={styles.dashboardAlertsInlineError}>{alertsError}</Text>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dashboardAlertScroller}
        >
          {filteredDashboardAlerts.map((alert) => {
            const selected = selectedDashboardAlert?.id === alert.id;
            return (
              <Pressable
                key={alert.id}
                style={[
                  styles.dashboardAlertCompactCard,
                  selected && styles.dashboardAlertCompactCardActive,
                ]}
                onPress={() => setSelectedAlertId(alert.id)}
              >
                <View style={styles.dashboardAlertCompactTopRow}>
                  <View
                    style={[
                      styles.dashboardAlertCompactDot,
                      {
                        backgroundColor: dashboardSeverityColor[alert.severity],
                      },
                    ]}
                  />
                  <Text style={styles.dashboardAlertCompactHive}>
                    {alert.hiveId}
                  </Text>
                </View>
                <Text
                  style={styles.dashboardAlertCompactTitle}
                  numberOfLines={1}
                >
                  {alert.title}
                </Text>
                <Text style={styles.dashboardAlertCompactDate}>
                  {alert.date}
                </Text>
              </Pressable>
            );
          })}
          {filteredDashboardAlerts.length === 0 && (
            <View style={styles.dashboardAlertsEmptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#16A34A"
              />
              <Text style={styles.dashboardAlertsEmptyStateText}>
                No alerts match this filter
              </Text>
            </View>
          )}
        </ScrollView>

        {selectedDashboardAlert && (
          <View style={styles.dashboardAlertDetailsCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.dashboardAlertDetailsTitle}>
                {selectedDashboardAlert.title}
              </Text>
              <View
                style={[
                  styles.dashboardAlertDetailsSeverity,
                  {
                    backgroundColor: `${dashboardSeverityColor[selectedDashboardAlert.severity]}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dashboardAlertDetailsSeverityText,
                    {
                      color:
                        dashboardSeverityColor[selectedDashboardAlert.severity],
                    },
                  ]}
                >
                  {selectedDashboardAlert.severity}
                </Text>
              </View>
            </View>
            <Text style={styles.dashboardAlertDetailsMeta}>
              {selectedDashboardAlert.hiveId} · {selectedDashboardAlert.date}
            </Text>
            <Text style={styles.dashboardAlertDetailsSummary}>
              {selectedDashboardAlert.summary}
            </Text>
            <Pressable
              style={styles.dashboardAlertDetailsLink}
              onPress={() =>
                navigation.navigate("Alerts", {
                  screen: "AlertDetails",
                  params: { alertId: selectedDashboardAlert.id },
                })
              }
            >
              <Text style={styles.dashboardAlertDetailsLinkText}>
                Open Full Details
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={THEME.primary}
              />
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Overview row ── */}
      <View style={styles.overviewCardRow}>
        <View style={[styles.overviewTile, { backgroundColor: THEME.primary }]}>
          <Ionicons name="grid-outline" size={20} color={THEME.accent} />
          <Text style={styles.overviewTileValue}>{dashboard.totalHives}</Text>
          <Text style={styles.overviewTileLabel}>Total Hives</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#22C55E" }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>{dashboard.activeHives}</Text>
          <Text style={styles.overviewTileLabel}>Active</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.overviewTileValue}>
            {dashboard.pendingAlerts}
          </Text>
          <Text style={styles.overviewTileLabel}>Pending Alerts</Text>
        </View>
        <View style={[styles.overviewTile, { backgroundColor: THEME.accent }]}>
          <Ionicons name="warning-outline" size={20} color={THEME.primary} />
          <Text style={[styles.overviewTileValue, { color: THEME.primary }]}>
            {dashboard.statusCounts["Pre-swarm"]}
          </Text>
          <Text style={[styles.overviewTileLabel, { color: THEME.primary }]}>
            Pre-swarm
          </Text>
        </View>
      </View>

      {/* ── Hive State Donut ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hive State Breakdown</Text>
        <View style={styles.donutRow}>
          <DonutChart segments={donutSegments} total={total} />
          <View style={styles.donutLegend}>
            {donutSegments.map((seg) => (
              <View key={seg.label} style={styles.donutLegendItem}>
                <View
                  style={[
                    styles.donutLegendDot,
                    { backgroundColor: seg.color },
                  ]}
                />
                <Text style={styles.donutLegendLabel}>{seg.label}</Text>
                <Text style={styles.donutLegendCount}>{seg.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Pre-swarm Trend ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Pre-swarm Trend</Text>
          <View style={styles.trendRangeRow}>
            {(["24h", "7d", "30d"] as const).map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.trendRangeBtn,
                  trendRange === r && styles.trendRangeBtnActive,
                ]}
                onPress={() => setTrendRange(r)}
              >
                <Text
                  style={[
                    styles.trendRangeBtnText,
                    trendRange === r && styles.trendRangeBtnTextActive,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TrendLineChart data={activeTrendData} />
      </View>

      {/* ── Alert Intelligence ── */}
      <Text style={styles.sectionTitle}>Alert Intelligence</Text>
      <View style={styles.gridTwo}>
        <View style={styles.infoCard}>
          <Ionicons name="flame-outline" size={22} color="#EF4444" />
          <Text style={styles.infoCardValue}>
            {dashboard.mostAtRiskHive.hiveId}
          </Text>
          <Text style={styles.infoCardLabel}>Most At-Risk Hive</Text>
          <Text style={styles.infoCardSub}>
            {dashboard.mostAtRiskHive.alertCount} alerts triggered
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={22} color={THEME.accent} />
          <Text style={styles.infoCardValue}>
            {dashboard.avgAcknowledgeTimeMinutes}m
          </Text>
          <Text style={styles.infoCardLabel}>Avg. Acknowledge Time</Text>
          <Text style={styles.infoCardSub}>Time to respond</Text>
        </View>
      </View>

      {/* ── Hive Status Cards ── */}
      {/* <Text style={styles.sectionTitle}>Status Counts</Text>
      <View style={styles.gridTwo}>
        <StatCard label="Normal" value={dashboard.statusCounts.Healthy} color={THEME.accent} icon="checkmark-circle-outline" />
        <StatCard label="Pre-swarm" value={dashboard.statusCounts["Pre-swarm"]} color={THEME.primary} icon="warning-outline" />
        <StatCard label="Swarm" value={dashboard.statusCounts.Swarm} color={THEME.primary} icon="alert-circle-outline" />
        <StatCard label="Abscondment" value={dashboard.statusCounts.Abscondment} color={THEME.accent} icon="exit-outline" />
      </View> */}

      {/* ── Key Metrics ── */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      <View style={styles.gridTwo}>
        <MetricCard
          title="Avg Temperature"
          value={displayTemperature.toFixed(1)}
          unit="°C"
          subtitle={weatherSubtitle}
        />
        <MetricCard
          title="Avg Humidity"
          value={displayHumidity.toFixed(0)}
          unit="%"
          subtitle={weatherSubtitle}
        />
      </View>

      {/* ── Audio Ingestion ── */}
      <Text style={styles.sectionTitle}>Audio Ingestion</Text>
      <View style={styles.gridTwo}>
        <View style={styles.infoCard}>
          <Ionicons name="mic-outline" size={22} color={THEME.primary} />
          <Text style={styles.infoCardValue}>{dashboard.recordingsToday}</Text>
          <Text style={styles.infoCardLabel}>Recordings Today</Text>
          <Text style={styles.infoCardSub}>Across all hives</Text>
        </View>
        <View
          style={[
            styles.infoCard,
            dashboard.silentHives.length > 0 && styles.infoCardWarn,
          ]}
        >
          <Ionicons
            name="volume-mute-outline"
            size={22}
            color={dashboard.silentHives.length > 0 ? "#EF4444" : "#22C55E"}
          />
          <Text
            style={[
              styles.infoCardValue,
              {
                color: dashboard.silentHives.length > 0 ? "#EF4444" : "#22C55E",
              },
            ]}
          >
            {dashboard.silentHives.length}
          </Text>
          <Text style={styles.infoCardLabel}>Silent Hives</Text>
          <Text style={styles.infoCardSub}>No audio in 8h+</Text>
        </View>
      </View>
      {dashboard.silentHives.length > 0 && (
        <View style={styles.silentHivesList}>
          {dashboard.silentHives.map((h) => (
            <View key={h.hiveId} style={styles.silentHiveRow}>
              <Ionicons
                name="radio-button-off-outline"
                size={14}
                color="#EF4444"
              />
              <Text style={styles.silentHiveText}>{h.hiveId}</Text>
              <Text style={styles.silentHiveTime}>
                Last seen {h.lastSeenHoursAgo}h ago
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Environmental Correlation ── */}
      {dashboard.highTempPreSwarmHives.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚠ High Temp + Pre-swarm</Text>
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>
              Hives showing elevated temperature alongside pre-swarm state
            </Text>
            {dashboard.highTempPreSwarmHives.map((h) => (
              <View key={h.hiveId} style={styles.corrRow}>
                <View style={styles.corrHiveChip}>
                  <Text style={styles.corrHiveChipText}>{h.hiveId}</Text>
                </View>
                <View style={styles.corrTempBar}>
                  <View
                    style={[
                      styles.corrTempFill,
                      {
                        width:
                          `${Math.min(((h.temperatureC - 30) / 15) * 100, 100)}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.corrTempValue}>{h.temperatureC}°C</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── ML & Advisory ── */}
      <Text style={styles.sectionTitle}>System Health</Text>
      <View style={styles.gridTwo}>
        <View
          style={[
            styles.infoCard,
            dashboard.lowConfidenceInferences > 0 && styles.infoCardWarn,
          ]}
        >
          <Ionicons
            name="help-circle-outline"
            size={22}
            color={
              dashboard.lowConfidenceInferences > 0 ? "#EF4444" : "#22C55E"
            }
          />
          <Text
            style={[
              styles.infoCardValue,
              {
                color:
                  dashboard.lowConfidenceInferences > 0 ? "#EF4444" : "#22C55E",
              },
            ]}
          >
            {dashboard.lowConfidenceInferences}
          </Text>
          <Text style={styles.infoCardLabel}>Low-Confidence Inferences</Text>
          <Text style={styles.infoCardSub}>Score &lt; 0.6</Text>
        </View>
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

// Pure SVG-free donut chart using View arcs
function DonutChart({
  segments,
  total,
}: {
  segments: { pct: number; color: string; label: string; count: number }[];
  total: number;
}) {
  const SIZE = 120;
  const STROKE = 18;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  // Build cumulative offsets for stroke-dashoffset simulation using Views
  // We'll use a simple segmented ring via absolute-positioned arcs using border tricks
  // Since we can't use SVG easily cross-platform, we use a stacked ring approach
  let cumulativePct = 0;
  const arcs = segments.map((seg) => {
    const start = cumulativePct;
    cumulativePct += seg.pct;
    return { ...seg, start, end: cumulativePct };
  });

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background ring */}
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: "#F1F5F9",
          position: "absolute",
        }}
      />
      {/* Colored segments via conic-gradient simulation: stacked rings with rotation */}
      {arcs.map((arc, i) => {
        const deg = arc.pct * 360;
        const rotateDeg = arc.start * 360;
        if (deg < 1) return null;
        return (
          <View
            key={i}
            style={{
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              position: "absolute",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                borderWidth: STROKE,
                borderColor: "transparent",
                borderTopColor: arc.color,
                borderRightColor: deg > 90 ? arc.color : "transparent",
                borderBottomColor: deg > 180 ? arc.color : "transparent",
                borderLeftColor: deg > 270 ? arc.color : "transparent",
                transform: [{ rotate: `${rotateDeg - 90}deg` }],
                position: "absolute",
              }}
            />
          </View>
        );
      })}
      {/* Center label */}
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: THEME.primary }}>
          {total}
        </Text>
        <Text
          style={{ fontSize: 10, color: THEME.textMuted, fontWeight: "600" }}
        >
          Hives
        </Text>
      </View>
    </View>
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
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statLabelRow}>
        <Ionicons name={icon} size={14} color={THEME.accent} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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

function TrendLineChart({
  data,
}: {
  data: Array<{ label: string; count: number }>;
}) {
  const [chartWidth, setChartWidth] = useState(0);
  const CHART_HEIGHT = 140;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 26;
  const PAD_H = 14;

  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;
  const plotW = Math.max(chartWidth - PAD_H * 2, 1);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const pts = data.map((d, i) => ({
    x: PAD_H + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
    y: PAD_TOP + (1 - d.count / max) * plotH,
    label: d.label,
    count: d.count,
  }));

  return (
    <View
      style={{ height: CHART_HEIGHT, marginTop: 12 }}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      {chartWidth > 0 && (
        <>
          {[0, 0.5, 1].map((pct) => (
            <View
              key={pct}
              style={{
                position: "absolute",
                left: PAD_H,
                top: PAD_TOP + pct * plotH,
                width: plotW,
                height: 1,
                backgroundColor: "#F1F5F9",
              }}
            />
          ))}
          {pts.slice(0, -1).map((p, i) => {
            const q = pts[i + 1];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`line-${i}`}
                style={{
                  position: "absolute",
                  left: (p.x + q.x) / 2 - len / 2,
                  top: (p.y + q.y) / 2 - 1,
                  width: len,
                  height: 2,
                  backgroundColor: THEME.accent,
                  borderRadius: 1,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}
          {pts.map((p, i) => (
            <React.Fragment key={`dot-${i}`}>
              <View
                style={{
                  position: "absolute",
                  left: p.x - 5,
                  top: p.y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: THEME.accent,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  left: p.x - 12,
                  top: p.y - 19,
                  width: 24,
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: "700",
                  color: THEME.primary,
                }}
              >
                {p.count}
              </Text>
            </React.Fragment>
          ))}
          {pts.map((p, i) => (
            <Text
              key={`lbl-${i}`}
              style={{
                position: "absolute",
                left: p.x - 16,
                top: PAD_TOP + plotH + 6,
                width: 32,
                textAlign: "center",
                fontSize: 9,
                color: THEME.textMuted,
                fontWeight: "600",
              }}
            >
              {p.label}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

function HivesListScreen({
  navigation,
}: NativeStackScreenProps<HivesStackParamList, "HiveList">) {
  const [hives, setHives] = useState<Hive[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<HiveStatus | "All">("All");
  const [viewMode, setViewMode] = useState<"list" | "tile">("list");

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

  const onRefreshHives = useCallback(async () => {
    setRefreshing(true);
    await loadHives(searchText);
    setRefreshing(false);
  }, [loadHives, searchText]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadHives(searchText);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchText, loadHives]);

  const STATUS_COLOR: Record<HiveStatus, string> = {
    Healthy: "#16A34A",
    "Pre-swarm": "#D97706",
    Swarm: "#DC2626",
    Abscondment: "#6B7280",
  };

  const STATUS_BG: Record<HiveStatus, string> = {
    Healthy: "#F0FDF4",
    "Pre-swarm": "#FFFBEB",
    Swarm: "#FEF2F2",
    Abscondment: "#F9FAFB",
  };

  const ALL_STATUSES: HiveStatus[] = [
    "Healthy",
    "Pre-swarm",
    "Swarm",
    "Abscondment",
  ];

  const filtered =
    filterStatus === "All"
      ? hives
      : hives.filter((h) => h.status === filterStatus);

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
            style={[
              styles.hiveSummaryPill,
              filterStatus === "All" && styles.hiveSummaryPillActive,
            ]}
            onPress={() => setFilterStatus("All")}
          >
            <Text
              style={[
                styles.hiveSummaryPillText,
                filterStatus === "All" && styles.hiveSummaryPillTextActive,
              ]}
            >
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
                <View
                  style={[
                    styles.hiveSummaryDot,
                    { backgroundColor: STATUS_COLOR[s] },
                  ]}
                />
                <Text
                  style={[
                    styles.hiveSummaryPillText,
                    { color: STATUS_COLOR[s] },
                  ]}
                >
                  {s} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Search + view toggle row */}
      <View style={styles.hiveToolbarRow}>
        <View style={[styles.searchBarWrap, { flex: 1, marginBottom: 0 }]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={THEME.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            placeholder="Search hives..."
            placeholderTextColor={THEME.placeholder}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
            </Pressable>
          )}
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleBtn,
              viewMode === "list" && styles.viewToggleBtnActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={viewMode === "list" ? THEME.primary : THEME.textMuted}
            />
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleBtn,
              viewMode === "tile" && styles.viewToggleBtnActive,
            ]}
            onPress={() => setViewMode("tile")}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={viewMode === "tile" ? THEME.primary : THEME.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Result count */}
      {!loading && !error && (
        <Text style={[styles.hiveListCount, { marginTop: 10 }]}>
          {filtered.length}{" "}
          {filterStatus === "All" ? "hives" : filterStatus + " hives"}
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
          <Pressable
            style={styles.primaryButtonSmall}
            onPress={() => void loadHives(searchText)}
          >
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
              style={({ pressed }) => [
                styles.hiveTileCard,
                pressed && styles.pressedRow,
              ]}
              onPress={() =>
                navigation.navigate("HiveDetails", { hiveId: hive.id })
              }
            >
              <View
                style={[
                  styles.hiveTileIconWrap,
                  { backgroundColor: STATUS_BG[hive.status] },
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={26}
                  color={STATUS_COLOR[hive.status]}
                />
              </View>
              <Text style={styles.hiveTileName} numberOfLines={1}>
                {hive.id}
              </Text>
              <View
                style={[
                  styles.hiveStatusBadge,
                  { backgroundColor: STATUS_BG[hive.status] },
                ]}
              >
                <Text
                  style={[
                    styles.hiveStatusBadgeText,
                    { color: STATUS_COLOR[hive.status] },
                  ]}
                >
                  {hive.status}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* List view */}
      {!error &&
        viewMode === "list" &&
        filtered.map((hive) => (
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
            {/* Icon */}
            <View
              style={[
                styles.hiveRowIconWrap,
                { backgroundColor: STATUS_BG[hive.status] },
              ]}
            >
              <Ionicons
                name="cube-outline"
                size={22}
                color={STATUS_COLOR[hive.status]}
              />
            </View>

            {/* Info */}
            <View style={styles.hiveRowInfo}>
              <Text style={styles.hiveName}>{hive.id}</Text>
              <View style={styles.hiveRowMeta}>
                <Ionicons
                  name="location-outline"
                  size={11}
                  color={THEME.textMuted}
                />
                <Text style={styles.hiveRowMetaText}>North Yard</Text>
              </View>
            </View>

            {/* Status badge + arrow */}
            <View style={styles.hiveRowRight}>
              <View
                style={[
                  styles.hiveStatusBadge,
                  { backgroundColor: STATUS_BG[hive.status] },
                ]}
              >
                <Text
                  style={[
                    styles.hiveStatusBadgeText,
                    { color: STATUS_COLOR[hive.status] },
                  ]}
                >
                  {hive.status}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={THEME.placeholder}
                style={{ marginTop: 6 }}
              />
            </View>
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
  const [hiveAlerts, setHiveAlerts] = useState<AlertItem[]>([]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, alerts] = await Promise.all([
        fetchHiveDetail(hiveId),
        fetchHiveAlerts(hiveId),
      ]);
      setDetail(data);
      setHiveAlerts(alerts);
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
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.detailPage}
    >
      {/* ── Hero Header ── */}
      <View style={styles.detailHeroCard}>
        <View style={styles.detailHeroTopRow}>
          <View style={styles.detailHiveIconWrap}>
            <Ionicons name="cube-outline" size={28} color={THEME.accent} />
          </View>
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHiveName}>{detail.name}</Text>
            <View style={styles.detailHeroMetaRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={THEME.textMuted}
              />
              <Text style={styles.detailHeroMeta}>{detail.location}</Text>
            </View>
          </View>
          <StatusPill status={detail.status} />
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.detailAlertBanner}>
          <View style={styles.detailAlertIconWrap}>
            <Ionicons name="warning-outline" size={18} color={THEME.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailAlertTitle}>{detail.alertTitle}</Text>
            <Text style={styles.detailAlertSubtitle}>
              {detail.alertMessage}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Hive Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hive Information</Text>
        <InfoRow label="Hive ID" value={detail.id} />
        <InfoRow label="Location" value={detail.location} />
        <InfoRow
          label="Status"
          value={detail.status}
          valueColor={
            detail.status === "Healthy"
              ? "#16A34A"
              : detail.status === "Pre-swarm"
                ? "#D97706"
                : detail.status === "Swarm"
                  ? "#DC2626"
                  : "#6B7280"
          }
        />
        <InfoRow
          label="Alert"
          value={detail.acknowledged ? "Acknowledged" : "Pending"}
        />
      </View>

      {/* ── Metrics Highlights ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Readings</Text>
        <Text style={styles.metricsSubtitle}>
          Temperature & humidity over time
        </Text>

        <View style={styles.metricsHighlightsRow}>
          <View
            style={[
              styles.metricHighlightCard,
              { borderLeftColor: THEME.accent, borderLeftWidth: 3 },
            ]}
          >
            <Ionicons
              name="thermometer-outline"
              size={16}
              color={THEME.accent}
            />
            <Text style={styles.metricHighlightValue}>
              {latestTemperature.toFixed(1)}°C
            </Text>
            <Text style={styles.metricHighlightLabel}>Temperature</Text>
          </View>
          <View
            style={[
              styles.metricHighlightCard,
              { borderLeftColor: THEME.primary, borderLeftWidth: 3 },
            ]}
          >
            <Ionicons name="water-outline" size={16} color={THEME.primary} />
            <Text style={styles.metricHighlightValue}>
              {latestHumidity.toFixed(0)}%
            </Text>
            <Text style={styles.metricHighlightLabel}>Humidity</Text>
          </View>
        </View>

        {/* Legend */}
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

        {/* Chart */}
        <View style={styles.chartWrap}>
          <View style={styles.chartYAxis} />
          <View style={styles.chartArea}>
            {metricSeries.map((point, index) => (
              <View
                key={`${detail.id}-metric-${index}`}
                style={styles.chartColumn}
              >
                <Text style={styles.chartPointValue}>
                  {point.temperatureC.toFixed(0)}°
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
                <Text style={styles.chartPointLabel}>{point.timeLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Notifications ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.hiveAlertCountBadge}>
            <Text style={styles.hiveAlertCountText}>
              {hiveAlerts.length} active
            </Text>
          </View>
        </View>

        {hiveAlerts.length === 0 && (
          <View style={styles.hiveAlertEmpty}>
            <Ionicons
              name="checkmark-circle-outline"
              size={28}
              color="#16A34A"
            />
            <Text style={styles.hiveAlertEmptyText}>
              No notifications for this hive
            </Text>
          </View>
        )}

        {hiveAlerts.map((alert) => {
          const severityColors: Record<AlertSeverity, string> = {
            Critical: "#DC2626",
            Warning: "#D97706",
            Info: "#2563EB",
          };
          const severityBg: Record<AlertSeverity, string> = {
            Critical: "#FEF2F2",
            Warning: "#FFFBEB",
            Info: "#EFF6FF",
          };
          const color = severityColors[alert.severity];
          const bg = severityBg[alert.severity];

          return (
            <View key={alert.id} style={styles.hiveAlertRow}>
              {/* Severity indicator */}
              <View
                style={[
                  styles.hiveAlertSeverityBar,
                  { backgroundColor: color },
                ]}
              />

              <View style={styles.hiveAlertContent}>
                {/* Header */}
                <View style={styles.hiveAlertHeader}>
                  <View
                    style={[
                      styles.hiveAlertSeverityBadge,
                      { backgroundColor: bg },
                    ]}
                  >
                    <Text style={[styles.hiveAlertSeverityText, { color }]}>
                      {alert.severity}
                    </Text>
                  </View>
                  <Text style={styles.hiveAlertDate}>{alert.date}</Text>
                </View>

                {/* Title + summary */}
                <Text style={styles.hiveAlertTitle}>{alert.title}</Text>
                <Text style={styles.hiveAlertSummary}>{alert.summary}</Text>
              </View>
            </View>
          );
        })}
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
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  welcomeLogoWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  welcomeLogoRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,178,104,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,178,104,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  welcomeLogo: {
    width: 90,
    height: 90,
    tintColor: THEME.accent,
  },
  welcomeAppName: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.accent,
    letterSpacing: 4,
  },
  welcomeAppSub: {
    fontSize: 12,
    color: "rgba(255,178,104,0.7)",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: "center",
  },
  welcomeBottomCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  welcomeHeadline: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.primary,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  welcomePrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    marginBottom: 12,
  },
  welcomePrimaryBtnText: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  welcomeSecondaryBtn: {
    borderWidth: 2,
    borderColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 13,
    width: "100%",
    alignItems: "center",
  },
  welcomeSecondaryBtnText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  authShell: {
    flex: 1,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    overflow: "hidden",
  },
  primaryButton: {
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonSmall: {
    marginTop: 12,
    backgroundColor: THEME.accent,
    borderRadius: 10,
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
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  backgroundOrbOne: {
    position: "absolute",
    top: -40,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255, 178, 104, 0.12)",
  },
  backgroundOrbTwo: {
    position: "absolute",
    bottom: 80,
    right: -56,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: "rgba(255, 178, 104, 0.08)",
  },
  backgroundOrbThree: {
    position: "absolute",
    top: "40%",
    left: "30%",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255, 178, 104, 0.06)",
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
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  brandMark: {
    alignSelf: "center",
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  brandLogo: {
    width: 40,
    height: 40,
    tintColor: THEME.accent,
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
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#DC2626",
    marginBottom: 2,
  },
  fieldError: {
    width: "100%",
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 10,
    paddingHorizontal: 2,
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
  authTextPrompt: {
    textAlign: "center",
    color: "#667085",
    // marginTop: 18,
  },
  footerLink: {
    color: THEME.primary,
    fontWeight: "700",
  },
  settingsPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: THEME.page,
    gap: 12,
  },
  settingsSection: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  settingsAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  settingsAccountName: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  settingsAccountEmail: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textMuted,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsRowColumn: {
    gap: 10,
  },
  settingsRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  settingsRowHint: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 18,
  },
  settingsDivider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: THEME.line,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 8,
  },
  segmentButtonActive: {
    backgroundColor: THEME.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  settingsActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  settingsSecondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  settingsSecondaryButtonText: {
    color: THEME.text,
    fontWeight: "700",
    fontSize: 13,
  },
  settingsPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: THEME.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  settingsPrimaryButtonText: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 13,
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
  // ── Dashboard new styles ──
  dashboardAlertsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  dashboardAlertsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dashboardAlertsTitleWrap: {
    gap: 2,
  },
  dashboardAlertsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.primary,
  },
  dashboardAlertsSubTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  dashboardAlertMenuRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dashboardAlertMenuChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  dashboardAlertMenuChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  dashboardAlertMenuChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.primary,
  },
  dashboardAlertMenuChipTextActive: {
    color: "#FFFFFF",
  },
  dashboardAlertSubMenu: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: "#FAFCFF",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  dashboardAlertSubMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dashboardAlertSubMenuTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
  },
  dashboardAlertSubMenuCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
  },
  dashboardAlertSubMenuList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dashboardAlertSubMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dashboardAlertSubMenuItemActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.surfaceSoft,
  },
  dashboardAlertSubMenuItemText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.text,
    maxWidth: 160,
  },
  dashboardAlertSubMenuItemTextActive: {
    color: THEME.primary,
  },
  dashboardAlertSubMenuDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dashboardAlertSubMenuEmpty: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  dashboardAlertsInlineError: {
    marginTop: 8,
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "600",
  },
  dashboardAlertScroller: {
    marginTop: 10,
    gap: 8,
    paddingRight: 4,
  },
  dashboardAlertCompactCard: {
    width: 165,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 5,
  },
  dashboardAlertCompactCardActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.surfaceSoft,
  },
  dashboardAlertCompactTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dashboardAlertCompactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashboardAlertCompactHive: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  dashboardAlertCompactTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
  },
  dashboardAlertCompactDate: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  dashboardAlertsEmptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dashboardAlertsEmptyStateText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
  },
  dashboardAlertDetailsCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 5,
  },
  dashboardAlertDetailsTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    fontWeight: "800",
    color: THEME.primary,
  },
  dashboardAlertDetailsSeverity: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dashboardAlertDetailsSeverityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  dashboardAlertDetailsMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  dashboardAlertDetailsSummary: {
    fontSize: 12,
    lineHeight: 18,
    color: THEME.text,
  },
  dashboardAlertDetailsLink: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    backgroundColor: THEME.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dashboardAlertDetailsLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
  },
  overviewCardRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  overviewTile: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  overviewTileValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  overviewTileLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 8,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  donutLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  donutLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendLabel: {
    flex: 1,
    fontSize: 12,
    color: THEME.text,
    fontWeight: "600",
  },
  donutLegendCount: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  trendRangeRow: {
    flexDirection: "row",
    gap: 4,
  },
  trendRangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: THEME.surface,
  },
  trendRangeBtnActive: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  trendRangeBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  trendRangeBtnTextActive: {
    color: "#FFFFFF",
  },
  infoCard: {
    width: "49%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  infoCardWarn: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  infoCardValue: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.primary,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.text,
  },
  infoCardSub: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 99,
    overflow: "hidden",
    marginVertical: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  silentHivesList: {
    backgroundColor: "#FFF5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  silentHiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  silentHiveText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
  silentHiveTime: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  corrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  corrHiveChip: {
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 72,
  },
  corrHiveChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.primary,
  },
  corrTempBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 99,
    overflow: "hidden",
  },
  corrTempFill: {
    height: "100%",
    backgroundColor: "#F97316",
    borderRadius: 99,
  },
  corrTempValue: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.primary,
    minWidth: 44,
    textAlign: "right",
  },
  // ── end dashboard new styles ──
  metricBigGreen: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.accent,
  },
  metricBigOrange: {
    fontSize: 32,
    fontWeight: "800",
    // color: THEME.primary,
    color: THEME.accent,
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
    rowGap: 10,
    columnGap: 0,
    marginBottom: 14,
  },
  statCard: {
    width: "49%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.accent,
  },
  statValue: {
    fontSize: 28,
    color: THEME.primary,
    fontWeight: "800",
  },
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
  alertRowArrow: { color: "#98A2B3", fontSize: 20, fontWeight: "700" },
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
  alertRowDate: { color: "#98A2B3", fontWeight: "700", fontSize: 12 },
  alertRowAction: { color: THEME.primary, fontWeight: "800", fontSize: 12 },
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  alertCardBar: { width: 4 },
  alertCardBody: { flex: 1, padding: 14, gap: 8 },
  alertCardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  alertCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surfaceSoft,
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.primary,
    marginBottom: 3,
  },
  alertCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertCardMetaText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  alertCardMetaDot: { color: THEME.textMuted, fontSize: 11 },
  alertCardSummary: { fontSize: 12, color: THEME.textMuted, lineHeight: 17 },
  alertCardBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  alertCardBadgeText: { fontSize: 10, fontWeight: "800" },
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  hiveSummaryStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  hiveSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  hiveSummaryPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  hiveSummaryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  hiveSummaryPillTextActive: {
    color: "#FFFFFF",
  },
  hiveSummaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hiveToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  viewToggleBtn: {
    padding: 9,
  },
  viewToggleBtnActive: {
    backgroundColor: THEME.surfaceSoft,
  },
  hiveListCount: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
    marginBottom: 10,
  },
  hiveTileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  hiveTileCard: {
    width: "47.5%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  hiveTileIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hiveTileName: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
    textAlign: "center",
  },
  hiveTileStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
  hiveRowCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hiveRowIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  hiveRowInfo: {
    flex: 1,
    gap: 4,
  },
  hiveRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hiveRowMetaText: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  hiveRowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  hiveStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  hiveStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pressedRow: {
    opacity: 0.85,
  },
  hiveName: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.primary,
  },
  hiveStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
    marginTop: 2,
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
    ...StyleSheet.absoluteFill,
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
    backgroundColor: THEME.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  detailHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailHiveIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,178,104,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,178,104,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeroTextWrap: {
    flex: 1,
  },
  detailHiveName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  detailHeroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  detailHeroMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  detailAlertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,178,104,0.12)",
    borderRadius: 10,
    padding: 12,
  },
  detailAlertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,178,104,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailAlertTitle: {
    color: THEME.accent,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  detailAlertSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 17,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  metricHighlightLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  metricHighlightValue: {
    color: THEME.primary,
    fontSize: 20,
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
  alertClosedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 8,
  },
  alertClosedText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    flex: 1,
  },
  advisoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  advisoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  advisoryTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  advisoryTypeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  advisorySummary: {
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 19,
    marginBottom: 14,
  },
  advisoryActionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 10,
  },
  advisoryActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.line,
  },
  advisoryActionRowDone: {
    opacity: 0.5,
  },
  advisoryCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: THEME.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  advisoryCheckboxDone: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  advisoryActionText: {
    fontSize: 13,
    color: THEME.text,
    lineHeight: 18,
  },
  advisoryActionTextDone: {
    textDecorationLine: "line-through",
    color: THEME.textMuted,
  },
  advisoryPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  advisoryProgressTrack: {
    height: 6,
    backgroundColor: THEME.line,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 14,
  },
  advisoryProgressFill: {
    height: "100%",
    backgroundColor: THEME.primary,
    borderRadius: 99,
  },
  advisoryProgressLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: "600",
    marginTop: 5,
  },
  advisoryWarningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  advisoryWarningText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
    flex: 1,
    lineHeight: 17,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    backgroundColor: THEME.line,
  },
  hiveAlertCountBadge: {
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  hiveAlertCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  hiveAlertEmpty: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  hiveAlertEmptyText: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  hiveAlertRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    overflow: "hidden",
  },
  hiveAlertRowAcked: {
    backgroundColor: "#F9FAFB",
    borderColor: THEME.line,
    opacity: 0.7,
  },
  hiveAlertSeverityBar: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  hiveAlertContent: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  hiveAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hiveAlertSeverityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hiveAlertSeverityText: {
    fontSize: 10,
    fontWeight: "800",
  },
  hiveAlertDate: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  hiveAlertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.primary,
  },
  hiveAlertTitleAcked: {
    color: THEME.textMuted,
    textDecorationLine: "line-through",
  },
  hiveAlertSummary: {
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 17,
  },
  hiveAlertAckBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: THEME.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  hiveAlertAckBtnDone: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  hiveAlertAckText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.primary,
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
