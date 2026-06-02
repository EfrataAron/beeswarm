import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  BeekeeperProfile,
  fetchAlerts,
  initAuthFromStorage,
  logout,
} from "./src/api/beeswarmApi";
import { HeaderOverflowMenu } from "./src/components/HeaderOverflowMenu";
import { applyThemeMode, THEME } from "./src/theme";

// Navigation types
import {
  RootStackParamList,
  MainTabParamList,
  HivesStackParamList,
  AlertsStackParamList,
} from "./src/navigation/types";

// Screens
import { WelcomeScreen } from "./src/screens/welcome/WelcomeScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { SignupScreen } from "./src/screens/auth/SignupScreen";
import { SettingsScreen } from "./src/screens/settings/SettingsScreen";
import { ProfileScreen } from "./src/screens/profile/ProfileScreen";
import { DashboardScreen } from "./src/screens/dashboard/DashboardScreen";
import { HivesListScreen } from "./src/screens/hives/HivesListScreen";
import { HiveDetailsScreen } from "./src/screens/hives/HiveDetailsScreen";
import { AlertsListScreen } from "./src/screens/alerts/AlertsListScreen";
import { AlertDetailsScreen } from "./src/screens/alerts/AlertDetailsScreen";
import { MapScreen } from "./src/screens/map/MapScreen";
import { ClassificationScreen } from "./src/screens/classification/ClassificationScreen";

const PREF_DARK_MODE = "@bsads/dark_mode";

const APP_COLORS = {
  light: {
    page: THEME.page,
    surface: "#FFFFFF",
    text: THEME.primary,
    muted: "#8A97A8",
    border: THEME.line,
    statusBar: "dark" as const,
  },
  dark: {
    page: "#0B1220",
    surface: "#111827",
    text: THEME.primary,
    muted: "#94A3B8",
    border: "#1F2937",
    statusBar: "light" as const,
  },
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HivesStack = createNativeStackNavigator<HivesStackParamList>();
const AlertsStack = createNativeStackNavigator<AlertsStackParamList>();

function getInitialWebPath(): string {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return "";
  }

  const path = window.location.pathname.replace(/\/$/, "");
  return path || "/";
}

function getInitialTabRoute(path: string): keyof MainTabParamList {
  switch (path) {
    case "/hives":
      return "Hives";
    case "/alerts":
      return "Alerts";
    case "/map":
      return "Map";
    case "/classification":
      return "Classification";
    case "/profile":
      return "Profile";
    default:
      return "Dashboard";
  }
}

function getInitialAuthRoute(path: string): keyof RootStackParamList {
  switch (path) {
    case "/login":
      return "Login";
    case "/signup":
      return "Signup";
    default:
      return "Welcome";
  }
}

const linking = {
  prefixes: ["http://localhost:8081", "http://localhost:8081/"],
  config: {
    screens: {
      Welcome: "",
      Login: "login",
      Signup: "signup",
      MainTabs: {
        path: "",
        screens: {
          Dashboard: "",
          Hives: "hives",
          Alerts: "alerts",
          Map: "map",
          Classification: "classification",
          Profile: "profile",
        },
      },
      Settings: "settings",
    },
  },
};

// ─── Sub-navigators ────────────────────────────────────────────────────────────

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

function MainTabsScreen({
  navigation,
  onLogout,
  currentUser,
  onProfileUpdate,
  isDarkMode,
  initialTabRoute,
}: NativeStackScreenProps<RootStackParamList, "MainTabs"> & {
  onLogout: () => void;
  currentUser: BeekeeperProfile | null;
  onProfileUpdate: (user: BeekeeperProfile) => void;
  isDarkMode: boolean;
  initialTabRoute: keyof MainTabParamList;
}) {
  const openSettingsPage = () => navigation.navigate("Settings");
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const colors = isDarkMode ? APP_COLORS.dark : APP_COLORS.light;

  useEffect(() => {
    void fetchAlerts()
      .then((alerts) => setUnreadAlertCount(alerts.length))
      .catch(() => {});
  }, []);

  return (
    <Tab.Navigator
      initialRouteName={initialTabRoute}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          includeFontPadding: false,
        },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 85 : 70,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: colors.muted,
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
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
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
        listeners={{ tabPress: () => setUnreadAlertCount(0) }}
        options={{
          headerShown: false,
          tabBarLabel: "Alerts",
          tabBarBadge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
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
              name={focused ? "location" : "location-outline"}
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
      <Tab.Screen
        name="Profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      >
        {() => (
          <ProfileScreen
            onLogout={onLogout}
            onOpenSettings={openSettingsPage}
            currentUser={currentUser}
            onProfileUpdate={onProfileUpdate}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<BeekeeperProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const initialWebPath = useMemo(() => getInitialWebPath(), []);

  const colors = darkModeEnabled ? APP_COLORS.dark : APP_COLORS.light;

  const navigationTheme = useMemo(
    () =>
      darkModeEnabled
        ? {
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              primary: THEME.accent,
              background: colors.page,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
            },
          }
        : {
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              primary: THEME.accent,
              background: colors.page,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
            },
          },
    [darkModeEnabled, colors],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [user, darkMode] = await Promise.all([
          initAuthFromStorage(),
          AsyncStorage.getItem(PREF_DARK_MODE),
        ]);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
        if (darkMode !== null) {
          const enabled = darkMode === "true";
          setDarkModeEnabled(enabled);
          applyThemeMode(enabled);
        }
      } catch {
        // no stored session — stay on auth flow
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const handleAuthSuccess = (user: BeekeeperProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleDarkModeChange = async (value: boolean) => {
    applyThemeMode(value);
    setDarkModeEnabled(value);
    try {
      await AsyncStorage.setItem(PREF_DARK_MODE, String(value));
    } catch {
      // ignore storage write failures
    }
  };

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer theme={navigationTheme} linking={linking}>
        <ExpoStatusBar style={colors.statusBar} />
        <RootStack.Navigator
          initialRouteName={
            isAuthenticated
              ? initialWebPath === "/settings"
                ? "Settings"
                : "MainTabs"
              : getInitialAuthRoute(initialWebPath)
          }
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.page },
            animation: "slide_from_right",
          }}
        >
          {!isAuthenticated ? (
            <>
              <RootStack.Screen name="Welcome" component={WelcomeScreen} />
              <RootStack.Screen name="Login">
                {(props) => (
                  <LoginScreen {...props} onAuthSuccess={handleAuthSuccess} />
                )}
              </RootStack.Screen>
              <RootStack.Screen name="Signup">
                {(props) => (
                  <SignupScreen {...props} onAuthSuccess={handleAuthSuccess} />
                )}
              </RootStack.Screen>
            </>
          ) : (
            <>
              <RootStack.Screen name="MainTabs">
                {(props) => (
                  <MainTabsScreen
                    {...props}
                    currentUser={currentUser}
                    onProfileUpdate={setCurrentUser}
                    onLogout={() => void handleLogout()}
                    isDarkMode={darkModeEnabled}
                    initialTabRoute={getInitialTabRoute(initialWebPath)}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen
                name="Settings"
                options={{
                  headerShown: true,
                  title: "Settings",
                  headerStyle: { backgroundColor: colors.surface },
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontWeight: "800" },
                }}
              >
                {(props) => (
                  <SettingsScreen
                    {...props}
                    darkModeEnabled={darkModeEnabled}
                    onDarkModeChange={handleDarkModeChange}
                  />
                )}
              </RootStack.Screen>
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
