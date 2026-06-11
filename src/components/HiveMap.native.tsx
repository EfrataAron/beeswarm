import React, { useMemo } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { HiveStatus } from "../api";

type MapHive = {
  id: string;
  name: string;
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
    id: "sample-1",
    name: "Sample Hive 1",
    status: "active",
    latitude: 0.3476,
    longitude: 32.5825,
  },
  {
    id: "sample-2",
    name: "Sample Hive 2",
    status: "swarming",
    latitude: 0.3511,
    longitude: 32.5883,
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
    <link
      href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      html, body, #map {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #fff5ea;
        overflow: hidden;
      }
      .pin-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
      }
      .pin-badge {
        font-size: 12px;
        font-weight: 800;
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 14px;
        border: 3px solid #ffffff;
        box-shadow: 0 3px 12px rgba(0,0,0,0.4);
        white-space: nowrap;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .pin-tail {
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
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
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                "&copy; OpenStreetMap contributors",
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
        },
        center: [payload.region.longitude, payload.region.latitude],
        zoom: 13,
      });

      function postMessage(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      payload.hives.forEach((hive) => {
        const color = payload.statusColor[hive.status] || "#FFB268";
        const hiveName = hive.name || hive.id;

        const wrapper = document.createElement("button");
        wrapper.className = "pin-wrapper";
        wrapper.title = hiveName + " (" + hive.status + ")";

        const badge = document.createElement("div");
        badge.className = "pin-badge";
        badge.style.background = color;
        badge.textContent = hiveName;

        const tail = document.createElement("div");
        tail.className = "pin-tail";
        tail.style.borderTop = "8px solid " + color;

        wrapper.appendChild(badge);
        wrapper.appendChild(tail);
        wrapper.addEventListener("click", () => {
          postMessage({ type: "markerPress", hiveId: hive.id });
        });

        new maplibregl.Marker({ element: wrapper, anchor: "bottom" })
          .setLngLat([hive.longitude, hive.latitude])
          .addTo(map);
      });

      if (payload.hives.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        payload.hives.forEach((hive) => bounds.extend([hive.longitude, hive.latitude]));
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
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
      // Ignore malformed messages from embedded page scripts.
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
