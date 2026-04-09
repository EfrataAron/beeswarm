import React from "react";
import { View } from "react-native";
import { HiveStatus } from "../api/beeswarmApi";

type MapHive = {
  id: string;
  status: HiveStatus;
  latitude: number;
  longitude: number;
};

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  mapHives: MapHive[];
  region: MapRegion;
  statusColor: Record<HiveStatus, string>;
  onMarkerPress: (hiveId: string) => void;
};

export default function HiveMap(_props: Props) {
  return <View style={{ flex: 1 }} />;
}
