// gesture-handler MUST be the very first import in the entry file
import "react-native-gesture-handler";
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
  setUnauthorizedHandler,
} from "./src/api";
import { wsService } from "./src/api/websocket";
import { HeaderOverflowMenu } from "./src/components/HeaderOverflowMenu";
import { applyThemeMode, THEME } from "./src/theme";
import { notifyThemeChange } from "./src/hooks/useTheme";

// import { clearAllStorage } from "./src/utils/clearStorage";

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
import { HivesListScreen } from "./src/screens/hives/list/HivesListScreen";
import { HiveDetailsScreen } from "./src/screens/hives/details/HiveDetailsScreen";
import { CreateHiveScreen } from "./src/screens/hives/create/CreateHiveScreen";
import { AlertsListScreen } from "./src/screens/alerts/list/AlertsListScreen";
import { AlertDetailsScreen } from "./src/screens/alerts/details/AlertDetailsScreen";
import { MapScreen } from "./src/screens/map/MapScreen";

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
    case "/app":
    case "/app/dashboard":
      return "Dashboard";
    case "/app/hives":
    case "/hives":
      return "Hives";
    case "/app/alerts":
    case "/alerts":
      return "Alerts";
    case "/app/map":
    case "/map":
      return "Map";
    case "/app/profile":
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
    case "/welcome":
      return "Welcome";
    default:
      return "Welcome";
  }
}

const linking = {
  prefixes: ["http://localhost:8081", "http://localhost:8081/"],
  config: {
    screens: {
      Welcome: "welcome",
      Login: "login",
      Signup: "signup",
      MainTabs: {
        path: "app",
        screens: {
          Dashboard: "",
          Hives: "hives",
          Alerts: "alerts",
          Map: "map",
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
  currentUser,
  isDarkMode,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
  currentUser: BeekeeperProfile | null;
  isDarkMode: boolean;
}) {
  const colors = isDarkMode ? APP_COLORS.dark : APP_COLORS.light;
  return (
    <HivesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
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
        options={{
          title: "Hive Details",
          headerBackVisible: true,
        }}
      />
      <HivesStack.Screen
        name="CreateHive"
        options={{
          title: "Create Hive",
          headerBackVisible: true,
        }}
      >
        {(props) => <CreateHiveScreen {...props} currentUser={currentUser} />}
      </HivesStack.Screen>
    </HivesStack.Navigator>
  );
}

function AlertsStackScreen({
  onOpenSettings,
  onLogout,
  isDarkMode,
}: {
  onOpenSettings: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
}) {
  const colors = isDarkMode ? APP_COLORS.dark : APP_COLORS.light;
  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
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
        options={{
          title: "Alert Details",
          headerBackVisible: true,
        }}
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

  // Function to fetch and update alert count
  const updateAlertCount = async () => {
    try {
      const alerts = await fetchAlerts();
      const pendingReviewAlerts = alerts.filter(
        alert => alert.alertStatus !== "acknowledged"
      ).length;
      setUnreadAlertCount(pendingReviewAlerts);
    } catch (error) {
      console.error('[Alert Count] Failed to fetch alerts:', error);
    }
  };

  // WebSocket for real-time updates + fallback polling
  useEffect(() => {
    // Initial fetch
    void updateAlertCount();

    // Subscribe to WebSocket updates
    const unsubscribe = wsService.subscribe((unreadCount) => {
      console.log('[Alert Count] WebSocket update:', unreadCount);
      setUnreadAlertCount(unreadCount);
    });

    // Connect WebSocket
    wsService.connect();

    // Fallback: Poll every 60 seconds if WebSocket fails
    const intervalId = setInterval(() => {
      if (!wsService.isConnected()) {
        console.log('[Alert Count] WebSocket not connected, using polling fallback');
        void updateAlertCount();
      }
    }, 60000); // 60 seconds

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Update count when returning from Alert Details screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void updateAlertCount();
    });

    return unsubscribe;
  }, [navigation]);

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
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            
            // Always navigate to the root (HiveList)
            navigation.navigate('Hives', { 
              screen: 'HiveList',
              params: { refresh: Date.now() }
            });
          },
        })}
        options={{
          headerShown: false,
          title: "Hive Management",
          tabBarLabel: "Hives",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
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
            currentUser={currentUser}
            isDarkMode={isDarkMode}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Alerts"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            setUnreadAlertCount(0);
            
            // Prevent default behavior
            e.preventDefault();
            
            // Always navigate to the root (AlertsList)
            navigation.navigate('Alerts', {
              screen: 'AlertsList'
            });
          },
        })}
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
            isDarkMode={isDarkMode}
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

const NAVIGATION_STATE_KEY = "@bsads/navigation_state";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<BeekeeperProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [navigationState, setNavigationState] = useState<any>();
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

  // useEffect(() => {
  //   // TEMPORARY: Clear storage to reset API URL from .env
  //   // Remove this useEffect after running once!
  //   void clearAllStorage();
  // }, []);

  useEffect(() => {
    let cancelled = false;

    // Never block the UI longer than 5s waiting on AsyncStorage.
    const forceDone = setTimeout(() => {
      if (!cancelled) setBootstrapping(false);
    }, 5000);

    void (async () => {
      try {
        const [user, darkMode, savedNavigationState] = await Promise.all([
          initAuthFromStorage(),
          AsyncStorage.getItem(PREF_DARK_MODE),
          AsyncStorage.getItem(NAVIGATION_STATE_KEY),
        ]);
        if (cancelled) return;
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
        if (darkMode !== null) {
          const enabled = darkMode === "true";
          setDarkModeEnabled(enabled);
          applyThemeMode(enabled);
          notifyThemeChange();
        }
        // Restore navigation state
        if (savedNavigationState) {
          setNavigationState(JSON.parse(savedNavigationState));
        }
      } catch {
        // no stored session — stay on auth flow
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(forceDone);
    };
  }, []);

  const handleAuthSuccess = (user: BeekeeperProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    wsService.disconnect(); // Disconnect WebSocket on logout
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Register the 401 handler so expired tokens auto-redirect to login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      wsService.disconnect(); // Disconnect WebSocket on unauthorized
      setCurrentUser(null);
      setIsAuthenticated(false);
    });
  }, []);

  const handleDarkModeChange = async (value: boolean) => {
    applyThemeMode(value);
    notifyThemeChange();
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
      <NavigationContainer
        theme={navigationTheme}
        linking={linking}
        initialState={navigationState}
        onStateChange={(state) => {
          // Save navigation state to AsyncStorage
          AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state)).catch(() => { });
        }}
      >
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
