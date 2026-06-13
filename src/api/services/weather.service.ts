/**
 * Weather service
 * Handles ambient weather data from Open-Meteo API
 */

import { AmbientWeather } from "../types";

export async function fetchAmbientWeather(
  latitude = 0.3476,
  longitude = 32.5825,
): Promise<AmbientWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m",
    timezone: "auto",
  });

  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error(`Weather API failed (${resp.status})`);

  const data = await resp.json();
  const cur = data?.current;
  const tempC = Number(cur?.temperature_2m);
  const hum = Number(cur?.relative_humidity_2m);

  if (!Number.isFinite(tempC) || !Number.isFinite(hum)) {
    throw new Error("Weather API returned unexpected values");
  }

  return {
    temperatureC: tempC,
    humidityPercent: hum,
    observedAt: String(cur?.time ?? new Date().toISOString()),
    source: "open-meteo",
  };
}