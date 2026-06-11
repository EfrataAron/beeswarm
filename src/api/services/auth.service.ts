/**
 * Authentication service
 * Handles login, registration, logout, and profile management
 */

import { apiRequest, apiRequestWithRetry, setAuthToken, BASE_URL, setServerUrl } from "../client";
import { AuthResponse, BeekeeperProfile } from "../types";
import { normalizeProfile, normalizeUrl } from "../utils/normalizers";
import {
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
  saveProfile,
} from "../utils/storage";

export async function initAuthFromStorage(): Promise<BeekeeperProfile | null> {
  const { token, profile } = await loadAuthSession();
  if (!token || !profile) return null;
  setAuthToken(token);
  return profile;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const raw = await apiRequestWithRetry<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = String(raw.access_token ?? raw.token ?? "");
  if (!token) throw new Error("Login succeeded but no token was returned.");

  const userRaw = (raw.user ?? raw.beekeeper ?? raw) as Record<string, unknown>;
  const beekeeper = normalizeProfile(userRaw);

  setAuthToken(token);
  setServerUrl(BASE_URL);
  await saveAuthSession(token, beekeeper);
  
  return { token, beekeeper };
}

export async function register(
  name: string,
  email: string,
  phone: string,
  password: string,
  address: string,
  apiKey: string,
  farmerServerUrl: string,
): Promise<AuthResponse> {
  const raw = await apiRequestWithRetry<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: name,
      email,
      phone,
      password,
      address,
      api_key: apiKey,
      server_url: farmerServerUrl,
    }),
  });

  const token = String(raw.access_token ?? raw.token ?? "");
  if (!token)
    throw new Error("Registration succeeded but no token was returned.");

  const userRaw = (raw.user ?? raw.beekeeper ?? raw) as Record<string, unknown>;
  const beekeeper = normalizeProfile(userRaw);

  setAuthToken(token);
  setServerUrl(BASE_URL);
  await saveAuthSession(token, beekeeper);
  
  return { token, beekeeper };
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } catch {
    // Always clear local session even if server call fails
  } finally {
    setAuthToken(null);
    await clearAuthSession();
  }
}

export async function fetchProfile(): Promise<BeekeeperProfile> {
  const raw = await apiRequest<any>("/auth/me");
  const profile = normalizeProfile(raw);
  await saveProfile(profile);
  return profile;
}

/**
 * PUT /auth/password
 * Change the current user's password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<void>("/auth/password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function updateProfile(data: {
  name: string;
  email?: string;
  phone: string;
  address: string;
  api_key?: string;
  server_url?: string;
}): Promise<BeekeeperProfile> {
  const raw = await apiRequest<any>("/auth/me", {
    method: "PUT",
    body: JSON.stringify({
      full_name: data.name,
      phone: data.phone,
      address: data.address,
      ...(data.api_key?.trim() ? { api_key: data.api_key.trim() } : {}),
      ...(data.server_url?.trim()
        ? { server_url: data.server_url.trim() }
        : {}),
    }),
  });

  // The backend's UserResponse only returns: user_id, full_name, email, role, created_at.
  // Fields like phone, address, api_key are stored in the DB but not echoed back.

  const fromServer = normalizeProfile(raw);
  const merged: BeekeeperProfile = {
    ...fromServer,

    phone:   fromServer.phone   || data.phone,
    address: fromServer.address ?? data.address,
    api_key: fromServer.api_key ?? data.api_key ?? null,
  };

  await saveProfile(merged);
  return merged;
}
