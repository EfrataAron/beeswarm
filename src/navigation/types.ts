import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Hives: NavigatorScreenParams<HivesStackParamList>;
  Alerts: NavigatorScreenParams<AlertsStackParamList>;
  Map: undefined;
  Classification: undefined;
  Profile: undefined;
};

export type HivesStackParamList = {
  HiveList: undefined;
  HiveDetails: { hiveId: string };
  CreateHive: undefined;
};

export type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetails: { alertId: string };
};
