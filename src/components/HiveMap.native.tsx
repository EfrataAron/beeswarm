import React from "react";
import MapView, { Marker } from "react-native-maps";
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

const SAMPLE_HIVES: MapHive[] = [
  {
    id: "Sample Hive 1",
    status: "Healthy",
    latitude: -1.2921,
    longitude: 36.8219,
  },
  {
    id: "Sample Hive 2",
    status: "Swarm",
    latitude: -1.2932,
    longitude: 36.8241,
  },
];

export default function HiveMap({
  mapHives,
  region,
  statusColor,
  onMarkerPress,
}: Props) {
  const renderedHives = mapHives.length > 0 ? mapHives : SAMPLE_HIVES;

  return (
    <MapView
      key={renderedHives.map((hive) => hive.id).join("|")}
      style={{ flex: 1 }}
      initialRegion={region}
    >
      {renderedHives.map((hive) => (
        <Marker
          key={hive.id}
          coordinate={{ latitude: hive.latitude, longitude: hive.longitude }}
          pinColor={statusColor[hive.status]}
          title={hive.id}
          description={hive.status}
          onPress={() => onMarkerPress(hive.id)}
        />
      ))}
    </MapView>
  );
}
