import React, { useMemo } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { HiveStatus } from "../api";

export type MapHive = {
  id: string;
  name: string;
  location: string;
  status: HiveStatus;
  latitude: number;
  longitude: number;
  temperatureC?: number;
  humidityPercent?: number;
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

function escapeForHtml(json: string) {
  return json.replace(/</g, "\\u003c");
}

function buildMapHtml(
  hives: MapHive[],
  region: MapRegion,
  statusColor: Record<HiveStatus, string>,
) {
  const payload = escapeForHtml(JSON.stringify({ hives, region, statusColor }));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html, body, #map { margin: 0; width: 100%; height: 100%; overflow: hidden; }

      .pin-wrapper {
        display: flex; flex-direction: column; align-items: center;
        background: none; border: none; padding: 0; cursor: pointer;
        position: relative;
      }
      .pin-badge {
        display: flex; flex-direction: column; align-items: center;
        padding: 6px 11px; border-radius: 14px;
        border: 2.5px solid #fff;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        white-space: nowrap; max-width: 130px;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .pin-wrapper:hover .pin-badge,
      .pin-wrapper.active .pin-badge { transform: scale(1.1); box-shadow: 0 5px 16px rgba(0,0,0,0.45); }
      .pin-name {
        font-size: 12px; font-weight: 800; color: #fff;
        overflow: hidden; text-overflow: ellipsis; max-width: 110px;
        font-family: system-ui, -apple-system, sans-serif;
        letter-spacing: 0.1px;
      }
      .pin-status {
        font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.9);
        text-transform: capitalize; overflow: hidden; text-overflow: ellipsis;
        max-width: 110px;
        font-family: system-ui, -apple-system, sans-serif;
        margin-top: 1px;
      }
      .pin-tail {
        width: 0; height: 0;
        border-left: 6px solid transparent; border-right: 6px solid transparent;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));
      }

      /* Tooltip card */
      .tooltip {
        display: none;
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%; transform: translateX(-50%);
        background: #1e293b;
        border-radius: 10px; padding: 10px 12px;
        min-width: 150px; max-width: 200px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        pointer-events: none;
        z-index: 999;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .pin-wrapper:hover .tooltip,
      .pin-wrapper.active .tooltip { display: block; }
      .tooltip-name {
        font-size: 12px; font-weight: 800; color: #f1f5f9;
        margin-bottom: 2px; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
      }
      .tooltip-location {
        font-size: 10px; color: #94a3b8; margin-bottom: 6px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tooltip-row {
        display: flex; align-items: center; gap: 5px; margin-top: 3px;
      }
      .tooltip-dot {
        width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      }
      .tooltip-label { font-size: 10px; font-weight: 700; }
      .tooltip-divider {
        width: 100%; height: 1px; background: #334155; margin: 6px 0 4px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <script>
      const payload = ${payload};

      const map = new maplibregl.Map({
        container: "map",
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "&copy; OpenStreetMap contributors" } },
          layers: [{ id: "osm-tiles", type: "raster", source: "osm", minzoom: 0, maxzoom: 19 }],
        },
        center: [payload.region.longitude, payload.region.latitude],
        zoom: 13,
      });

      function postMsg(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      payload.hives.forEach(function(hive) {
        const color = payload.statusColor[hive.status] || "#FFB268";
        const hasSensor = hive.temperatureC != null && hive.humidityPercent != null;
        const tempHigh = hive.temperatureC > 34.5;
        const humHigh = hive.humidityPercent > 65;

        const wrapper = document.createElement("button");
        wrapper.className = "pin-wrapper";

        // Tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";

        const tName = document.createElement("div");
        tName.className = "tooltip-name";
        tName.textContent = hive.name || hive.id;
        tooltip.appendChild(tName);

        const tLoc = document.createElement("div");
        tLoc.className = "tooltip-location";
        tLoc.textContent = "📍 " + (hive.location || "—");
        tooltip.appendChild(tLoc);

        // Status row
        const tStatus = document.createElement("div");
        tStatus.className = "tooltip-location";
        tStatus.style.color = color;
        tStatus.style.fontWeight = "700";
        tStatus.textContent = "● " + hive.status.replace(/_/g, " ");
        tooltip.appendChild(tStatus);

        if (hasSensor) {
          const divider = document.createElement("div");
          divider.className = "tooltip-divider";
          tooltip.appendChild(divider);

          const tempRow = document.createElement("div");
          tempRow.className = "tooltip-row";
          const tempDot = document.createElement("div");
          tempDot.className = "tooltip-dot";
          tempDot.style.background = "#f97316";
          const tempLabel = document.createElement("span");
          tempLabel.className = "tooltip-label";
          tempLabel.style.color = tempHigh ? "#fb923c" : "#fdba74";
          tempLabel.textContent = hive.temperatureC.toFixed(1) + "°C" + (tempHigh ? "  ↑" : "");
          tempRow.appendChild(tempDot);
          tempRow.appendChild(tempLabel);
          tooltip.appendChild(tempRow);

          const humRow = document.createElement("div");
          humRow.className = "tooltip-row";
          const humDot = document.createElement("div");
          humDot.className = "tooltip-dot";
          humDot.style.background = "#60a5fa";
          const humLabel = document.createElement("span");
          humLabel.className = "tooltip-label";
          humLabel.style.color = humHigh ? "#93c5fd" : "#bfdbfe";
          humLabel.textContent = hive.humidityPercent.toFixed(0) + "%" + (humHigh ? "  ↑" : "");
          humRow.appendChild(humDot);
          humRow.appendChild(humLabel);
          tooltip.appendChild(humRow);
        }

        wrapper.appendChild(tooltip);

        // Pin badge
        const badge = document.createElement("div");
        badge.className = "pin-badge";
        badge.style.background = color;

        const nameEl = document.createElement("div");
        nameEl.className = "pin-name";
        nameEl.textContent = hive.name || hive.id;  // prefer display name

        const statusEl = document.createElement("div");
        statusEl.className = "pin-status";
        statusEl.textContent = hive.status.replace(/_/g, " ");

        badge.appendChild(nameEl);
        badge.appendChild(statusEl);
        const tail = document.createElement("div");
        tail.className = "pin-tail";
        tail.style.borderTop = "10px solid " + color;  // taller tail = proper pin shape

        wrapper.appendChild(badge);
        wrapper.appendChild(tail);

        // On mobile, tap toggles the "active" class (hover not available)
        wrapper.addEventListener("click", function() {
          const wasActive = wrapper.classList.contains("active");
          document.querySelectorAll(".pin-wrapper.active").forEach(function(el) {
            el.classList.remove("active");
          });
          if (!wasActive) {
            wrapper.classList.add("active");
          }
          postMsg({ type: "markerPress", hiveId: hive.id });
        });

        new maplibregl.Marker({ element: wrapper, anchor: "bottom" })
          .setLngLat([hive.longitude, hive.latitude])
          .addTo(map);
      });

      if (payload.hives.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        payload.hives.forEach(function(h) { bounds.extend([h.longitude, h.latitude]); });
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    </script>
  </body>
</html>`;
}

export default function HiveMap({
  mapHives,
  region,
  statusColor,
  onMarkerPress,
}: Props) {
  const renderedHives = mapHives.length > 0 ? mapHives : SAMPLE_HIVES;
  const html = useMemo(
    () => buildMapHtml(renderedHives, region, statusColor),
    [renderedHives, region, statusColor],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        hiveId?: string;
      };
      if (message.type === "markerPress" && message.hiveId) {
        onMarkerPress(message.hiveId);
      }
    } catch {
      // Ignore malformed messages
    }
  };

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
    />
  );
}
