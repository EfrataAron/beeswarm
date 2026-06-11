/**
 * Utility to clear app storage for debugging
 * TEMPORARY - Remove this file after clearing storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.clear();
    console.log("✅ All storage cleared successfully");
  } catch (error) {
    console.error("❌ Failed to clear storage:", error);
  }
}

// Call this in App.tsx temporarily to clear storage on app launch
