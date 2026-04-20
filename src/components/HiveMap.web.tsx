import React, { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
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
    latitude: 0.3476,
    longitude: 32.5825,
  },
  {
    id: "Sample Hive 2",
    status: "Swarm",
    latitude: 0.3511,
    longitude: 32.5883,
  },
];

const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function HiveMap({
  mapHives,
  region,
  statusColor,
  onMarkerPress,
}: Props) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const renderedHives = useMemo(
    () => (mapHives.length > 0 ? mapHives : SAMPLE_HIVES),
    [mapHives],
  );

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: OSM_RASTER_STYLE,
      center: [region.longitude, region.latitude],
      zoom: 13,
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [region.latitude, region.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    renderedHives.forEach((hive) => {
      const markerEl = document.createElement("button");
      markerEl.style.width = "16px";
      markerEl.style.height = "16px";
      markerEl.style.borderRadius = "999px";
      markerEl.style.border = "2px solid #FFFFFF";
      markerEl.style.background = statusColor[hive.status] ?? "#FFB268";
      markerEl.style.cursor = "pointer";
      markerEl.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.35)";
      markerEl.title = `${hive.id} (${hive.status})`;
      markerEl.addEventListener("click", () => onMarkerPress(hive.id));

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([hive.longitude, hive.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (renderedHives.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      renderedHives.forEach((hive) => {
        bounds.extend([hive.longitude, hive.latitude]);
      });
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      return;
    }

    if (renderedHives.length === 1) {
      map.flyTo({
        center: [renderedHives[0].longitude, renderedHives[0].latitude],
        zoom: 14,
      });
      return;
    }

    map.flyTo({ center: [region.longitude, region.latitude], zoom: 13 });
  }, [
    renderedHives,
    region.longitude,
    region.latitude,
    statusColor,
    onMarkerPress,
  ]);

  return <div ref={mapElRef} style={{ width: "100%", height: "100%" }} />;
}
