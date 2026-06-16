import React, { useEffect, useRef, useState } from "react";
import { HiveStatus } from "../api";
import type { MapHive } from "./HiveMap.native";

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
    name: "Sample Hive 1",
    location: "Apiary A",
    status: "active",
    latitude: 0.3476,
    longitude: 32.5825,
    temperatureC: 33.2,
    humidityPercent: 58,
  },
  {
    id: "Sample Hive 2",
    name: "Sample Hive 2",
    location: "Apiary B",
    status: "swarming",
    latitude: 0.3511,
    longitude: 32.5883,
    temperatureC: 36.1,
    humidityPercent: 72,
  },
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
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Inject CSS once into the document head
function ensureMapStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("hivemap-web-styles")) return;
  const style = document.createElement("style");
  style.id = "hivemap-web-styles";
  style.textContent = `
    .hive-pin-wrapper {
      display: flex; flex-direction: column; align-items: center;
      background: none; border: none; padding: 0; cursor: pointer;
      position: relative;
    }
    .hive-pin-badge {
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 11px; border-radius: 14px;
      border: 2.5px solid #fff;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      white-space: nowrap; max-width: 140px;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .hive-pin-wrapper:hover .hive-pin-badge { transform: scale(1.1); box-shadow: 0 5px 16px rgba(0,0,0,0.45); }
    .hive-pin-name {
      font-size: 12px; font-weight: 800; color: #fff;
      overflow: hidden; text-overflow: ellipsis; max-width: 120px;
      letter-spacing: 0.1px;
    }
    .hive-pin-status {
      font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.9);
      text-transform: capitalize; overflow: hidden; text-overflow: ellipsis;
      max-width: 120px; margin-top: 1px;
    }
    .hive-pin-tail {
      width: 0; height: 0;
      border-left: 6px solid transparent; border-right: 6px solid transparent;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
    }
    .hive-tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%; transform: translateX(-50%);
      background: #1e293b;
      border-radius: 10px; padding: 10px 13px;
      min-width: 155px; max-width: 210px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      pointer-events: none;
      z-index: 9999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .hive-pin-wrapper:hover .hive-tooltip { display: block; }
    .hive-tooltip-name {
      font-size: 12px; font-weight: 800; color: #f1f5f9;
      margin-bottom: 2px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .hive-tooltip-location {
      font-size: 10px; color: #94a3b8; margin-bottom: 5px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .hive-tooltip-divider { width: 100%; height: 1px; background: #334155; margin: 5px 0 4px; }
    .hive-tooltip-row { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
    .hive-tooltip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .hive-tooltip-value { font-size: 10px; font-weight: 700; }
  `;
  document.head.appendChild(style);
}

function buildMarkerElement(
  hive: MapHive,
  color: string,
  onPress: (id: string) => void,
): HTMLElement {
  const hasSensor = hive.temperatureC != null && hive.humidityPercent != null;
  const tempHigh = (hive.temperatureC ?? 0) > 34.5;
  const humHigh = (hive.humidityPercent ?? 0) > 65;

  const wrapper = document.createElement("button");
  wrapper.className = "hive-pin-wrapper";
  wrapper.setAttribute("aria-label", `${hive.name} — ${hive.status}`);

  // Tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "hive-tooltip";

  const tName = document.createElement("div");
  tName.className = "hive-tooltip-name";
  tName.textContent = hive.name || hive.id;
  tooltip.appendChild(tName);

  const tLoc = document.createElement("div");
  tLoc.className = "hive-tooltip-location";
  tLoc.textContent = "📍 " + (hive.location || "—");
  tooltip.appendChild(tLoc);

  // Status row
  const tStatus = document.createElement("div");
  tStatus.className = "hive-tooltip-location";
  tStatus.style.color = color;
  tStatus.style.fontWeight = "700";
  tStatus.style.marginBottom = "5px";
  tStatus.textContent = "● " + hive.status.replace(/_/g, " ");
  tooltip.appendChild(tStatus);

  if (hasSensor) {
    const divider = document.createElement("div");
    divider.className = "hive-tooltip-divider";
    tooltip.appendChild(divider);

    // Temp row
    const tempRow = document.createElement("div");
    tempRow.className = "hive-tooltip-row";
    const tempDot = document.createElement("div");
    tempDot.className = "hive-tooltip-dot";
    tempDot.style.background = "#f97316";
    const tempVal = document.createElement("span");
    tempVal.className = "hive-tooltip-value";
    tempVal.style.color = tempHigh ? "#fb923c" : "#fdba74";
    tempVal.textContent = (hive.temperatureC as number).toFixed(1) + "°C" + (tempHigh ? "  ↑" : "");
    tempRow.appendChild(tempDot);
    tempRow.appendChild(tempVal);
    tooltip.appendChild(tempRow);

    // Humidity row
    const humRow = document.createElement("div");
    humRow.className = "hive-tooltip-row";
    const humDot = document.createElement("div");
    humDot.className = "hive-tooltip-dot";
    humDot.style.background = "#60a5fa";
    const humVal = document.createElement("span");
    humVal.className = "hive-tooltip-value";
    humVal.style.color = humHigh ? "#93c5fd" : "#bfdbfe";
    humVal.textContent = (hive.humidityPercent as number).toFixed(0) + "%" + (humHigh ? "  ↑" : "");
    humRow.appendChild(humDot);
    humRow.appendChild(humVal);
    tooltip.appendChild(humRow);
  }

  wrapper.appendChild(tooltip);

  // Pin badge
  const badge = document.createElement("div");
  badge.className = "hive-pin-badge";
  badge.style.background = color;

  const nameEl = document.createElement("div");
  nameEl.className = "hive-pin-name";
  nameEl.textContent = hive.name || hive.id;  // prefer display name

  const statusEl = document.createElement("div");
  statusEl.className = "hive-pin-status";
  statusEl.textContent = hive.status.replace(/_/g, " ");

  badge.appendChild(nameEl);
  badge.appendChild(statusEl);

  const tail = document.createElement("div");
  tail.className = "hive-pin-tail";
  tail.style.borderTop = `10px solid ${color}`;  // taller tail = proper pin shape

  wrapper.appendChild(badge);
  wrapper.appendChild(tail);

  wrapper.addEventListener("click", () => onPress(hive.id));

  return wrapper;
}

export default function HiveMap({ mapHives, region, statusColor, onMarkerPress }: Props) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  const renderedHives = mapHives.length > 0 ? mapHives : SAMPLE_HIVES;

  // Initialise the map once
  useEffect(() => {
    ensureMapStyles();
    let cancelled = false;

    // Dynamically require maplibre-gl to avoid Metro static-analysis failures
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
    const ml = require("maplibre-gl") as any;

    if (cancelled || !mapElRef.current || mapRef.current) return;

    const map = new ml.Map({
      container: mapElRef.current,
      style: OSM_STYLE,
      center: [region.longitude, region.latitude],
      zoom: 13,
    });
    mapRef.current = map;
    map.on("load", () => {
      if (!cancelled) setReady(true);
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

  // Add / refresh markers whenever hives, region or statusColor change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
    const ml = require("maplibre-gl") as any;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    renderedHives.forEach((hive) => {
      const color = statusColor[hive.status] ?? "#FFB268";
      const el = buildMarkerElement(hive, color, onMarkerPress);
      const marker = new ml.Marker({ element: el, anchor: "bottom" })
        .setLngLat([hive.longitude, hive.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (renderedHives.length > 1) {
      const bounds = new ml.LngLatBounds();
      renderedHives.forEach((h: MapHive) => bounds.extend([h.longitude, h.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    } else if (renderedHives.length === 1) {
      map.flyTo({ center: [renderedHives[0].longitude, renderedHives[0].latitude], zoom: 14 });
    } else {
      map.flyTo({ center: [region.longitude, region.latitude], zoom: 13 });
    }
  }, [ready, renderedHives, region.longitude, region.latitude, statusColor, onMarkerPress]);

  return (
    <div
      ref={mapElRef}
      style={{ width: "100%", height: "100%" }}
    >
      {!ready && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#667085",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Loading map…
        </div>
      )}
    </div>
  );
}
