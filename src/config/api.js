// Centralized backend configuration.
// All API communication goes through src/api/beeswarmApi.ts which reads
// this URL as its default. Override at runtime via Profile → Server URL.

//export const BASE_URL = 'http://10.0.2.2:8000'; // Android emulator
// export const BASE_URL = 'http://127.0.0.1:8003'; // iOS simulator
// export const BASE_URL = 'http://192.168.1.100:8000'; // physical device

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;


export const ENDPOINTS = {
  // Auth
  login:    "/auth/login",
  register: "/auth/register",
  logout:   "/auth/logout",
  // Users / Profile
  profile:  "/users/me",
  // Core data
  hives:    "/hives",
  alerts:   "/alerts",
  dashboard:"/dashboard",
};
