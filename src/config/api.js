// src/config/api.js

// src/config/api.js
export const BASE_URL = 'http://10.0.2.2:8000'; // Android emulator
// export const BASE_URL = 'http://127.0.0.1:8000'; // iOS simulator
// export const BASE_URL = 'http://192.168.1.100:8000'; // physical device

export const ENDPOINTS = {
  login: '/auth/login',
  users: '/users',
  hiveList: '/hives',
  alerts: '/alerts',
};
