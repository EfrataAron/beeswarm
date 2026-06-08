import React, { useEffect, useRef, useState } from "react";
import { HiveStatus } from "../api";

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
  { id: "Sample Hive 1", status: "active", latitude: 0.3476, longitude: 32.5825 },
  { id: "Sample Hive 2", status: "swarming",   latitude: 0.3511, longitude: 32.5883 },
];

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-tiles", type: "raster" as const, source: "osm", minzoom: 0, maxzoom: 19 }],
};

// maplibre-gl is loaded dynamically so Metro doesn't try to statically
// resolve + bundle it during the initial module graph build.
// This avoids "Unable to resolve maplibre-gl" errors on web.
let maplibrePromise: Promise<typeof import("maplibre-gl")> | null = null;
function getMaplibre() {
  if (!maplibrePromise) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    maplibrePromise = Promise.resolve(require("maplibre-gl"));
  }
  return maplibrePromise;
}

export default function HiveMap({ mapHives, region, statusColor, onMarkerPress }: Props) {
  const mapElRef   = useRef<HTMLDivElement | null>(null);
  const mapRef     = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  const renderedHives = mapHives.length > 0 ? mapHives : SAMPLE_HIVES;

  // Initialise map once
  useEffect(() => {
    let cancelled = false;
    getMaplibre().then((ml) => {
      if (cancelled || !mapElRef.current || mapRef.current) return;
      const map = new ml.Map({
        container: mapElRef.current,
        style: OSM_STYLE as any,
        center: [region.longitude, region.latitude],
        zoom: 13,
      });
      mapRef.current = map;
      map.on("load", () => { if (!cancelled) setReady(true); });
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever hives or region change
  useEffect(() => {
    if (!ready) return;
    getMaplibre().then((ml) => {
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      renderedHives.forEach((hive) => {
        const color = statusColor[hive.status] ?? "#FFB268";

        const wrapper = document.createElement("button");
        Object.assign(wrapper.style, {
          display: "flex", flexDirection: "column", alignItems: "center",
          background: "none", border: "none", padding: "0", cursor: "pointer",
        });
        wrapper.title = `${hive.id} — ${hive.status}`;

        const badge = document.createElement("div");
        Object.assign(badge.style, {
          background: color, color: "#ffffff", fontSize: "11px", fontWeight: "700",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "4px 9px", borderRadius: "12px", border: "2px solid #ffffff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
          maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis",
        });
        badge.textContent = hive.id;

        const tail = document.createElement("div");
        Object.assign(tail.style, {
          width: "0", height: "0",
          borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
          borderTop: `7px solid ${color}`,
        });

        wrapper.appendChild(badge);
        wrapper.appendChild(tail);
        wrapper.addEventListener("click", () => onMarkerPress(hive.id));

        const marker = new ml.Marker({ element: wrapper, anchor: "bottom" })
          .setLngLat([hive.longitude, hive.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });

      if (renderedHives.length > 1) {
        const bounds = new ml.LngLatBounds();
        renderedHives.forEach((h) => bounds.extend([h.longitude, h.latitude]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      } else if (renderedHives.length === 1) {
        map.flyTo({ center: [renderedHives[0].longitude, renderedHives[0].latitude], zoom: 14 });
      } else {
        map.flyTo({ center: [region.longitude, region.latitude], zoom: 13 });
      }
    });
  }, [ready, renderedHives, region.longitude, region.latitude, statusColor, onMarkerPress]);

  return (
    <div ref={mapElRef} style={{ width: "100%", height: "100%" }}>
      {!ready && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: "#667085", fontSize: 13, fontWeight: 600,
        }}>
          Loading map…
        </div>
      )}
    </div>
  );
}
