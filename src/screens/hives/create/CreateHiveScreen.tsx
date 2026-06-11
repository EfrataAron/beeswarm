import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { createHive, BeekeeperProfile } from "../../../api";
import { THEME } from "../../../theme";
import { HivesStackParamList } from "../../../navigation/types";
// import { createHiveStyles as styles } from "./CreateHiveScreen.styles";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20 },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.primary,
    marginBottom: 6,
  },
  cardSubtitle: { fontSize: 14, color: THEME.textMuted, marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.text,
    marginBottom: 8,
  },
  required: { color: "#EF4444" },
  input: {
    backgroundColor: THEME.page,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.text,
  },

  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
  submitButton: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,      // Required
    borderColor: "#8e7878ff",
  },
  cancelButtonText: { color: THEME.primary, fontSize: 15, fontWeight: "600" },
  dateButtonRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 8,
    paddingVertical: 10,
  },
  dateButtonText: { color: THEME.primary, fontSize: 14, fontWeight: "600" },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.accent,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  locationButtonText: {
    color: THEME.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  coordinatesRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordinateInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12, // React Native 0.71+
    marginTop: 20,
  },

  halfButton: {
    flex: 1,
  },
});

type Props = NativeStackScreenProps<HivesStackParamList, "CreateHive"> & {
  currentUser: BeekeeperProfile | null;
};

export function CreateHiveScreen({ navigation, route, currentUser }: Props) {
  // Debug logging
  const [hiveName, setHiveName] = useState("");
  const [hiveLocation, setHiveLocation] = useState("");
  const [hiveType, setHiveType] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setToday = () => {
    setInstallationDate(formatDate(new Date()));
    if (errors.installationDate) setErrors({ ...errors, installationDate: "" });
  };

  const setTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setInstallationDate(formatDate(tomorrow));
    if (errors.installationDate) setErrors({ ...errors, installationDate: "" });
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      console.log('[Location] Starting location request...');
      console.log('[Location] Platform:', Platform.OS);

      // For web platform, use browser's Geolocation API
      if (Platform.OS === "web") {
        console.log('[Location] Using browser Geolocation API');

        if (!navigator.geolocation) {
          console.error('[Location] Geolocation not supported');
          Alert.alert(
            "Not Supported",
            "Geolocation is not supported by your browser. Please enter coordinates manually."
          );
          setLoadingLocation(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('[Location] Success:', position.coords);
            setLatitude(position.coords.latitude.toFixed(6));
            setLongitude(position.coords.longitude.toFixed(6));
            setErrors({
              ...errors,
              latitude: "",
              longitude: "",
            });
            Alert.alert(
              "Location Retrieved",
              `Latitude: ${position.coords.latitude.toFixed(6)}\nLongitude: ${position.coords.longitude.toFixed(6)}`
            );
            setLoadingLocation(false);
          },
          (error) => {
            console.error('[Location] Browser error:', error);
            let message = "Failed to get your location. ";
            if (error.code === error.PERMISSION_DENIED) {
              message += "Location permission was denied. Please enable location access in your browser settings.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              message += "Location information is unavailable.";
            } else if (error.code === error.TIMEOUT) {
              message += "The request to get your location timed out.";
            }
            Alert.alert("Location Error", message);
            setLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
        return;
      }

      // For mobile platforms, use expo-location
      console.log('[Location] Using expo-location');

      // First check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      console.log('[Location] Services enabled:', enabled);

      if (!enabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services in your device settings to use this feature."
        );
        setLoadingLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[Location] Permission status:', status);

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to get your current coordinates. Please enable it in your device settings."
        );
        setLoadingLocation(false);
        return;
      }

      // Get current position with high accuracy
      console.log('[Location] Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('[Location] Location received:', location.coords);

      // Set the coordinates
      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));

      // Clear any previous errors
      setErrors({
        ...errors,
        latitude: "",
        longitude: "",
      });

      Alert.alert(
        "Location Retrieved",
        `Latitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}`
      );
    } catch (err) {
      console.error('[Location] Error:', err);
      Alert.alert(
        "Location Error",
        err instanceof Error
          ? err.message
          : "Failed to get your location. Please enter coordinates manually or try again."
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hiveName.trim()) newErrors.hiveName = "Hive name is required";
    if (!hiveLocation.trim()) newErrors.hiveLocation = "Location is required";
    if (!hiveType.trim()) newErrors.hiveType = "Hive type is required";
    if (!installationDate.trim())
      newErrors.installationDate = "Installation date is required";

    // Validate date format (YYYY-MM-DD)
    if (installationDate && !/^\d{4}-\d{2}-\d{2}$/.test(installationDate)) {
      newErrors.installationDate = "Use format YYYY-MM-DD (e.g., 2026-06-04)";
    }

    // Validate latitude/longitude
    const lat = parseFloat(latitude || "0");
    const lng = parseFloat(longitude || "0");
    if (latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      newErrors.latitude = "Latitude must be between -90 and 90";
    }
    if (longitude && (isNaN(lng) || lng < -180 || lng > 180)) {
      newErrors.longitude = "Longitude must be between -180 and 180";
    }

    // Check if user is logged in
    if (!currentUser?.id) {
      Alert.alert("Error", "You must be logged in to create a hive");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentUser?.id) return;

    setLoading(true);
    try {
      await createHive({
        hive_name: hiveName.trim(),
        hive_location: hiveLocation.trim(),
        hive_type: hiveType.trim(),
        installation_date: installationDate.trim(),
        latitude: parseFloat(latitude || "0"),
        longitude: parseFloat(longitude || "0"),
        owner_id: currentUser.id,
      });

      // Navigate back to HiveList with a refresh parameter
      navigation.navigate("HiveList", { refresh: Date.now() });

      // Show success message
      Alert.alert("Success", "Hive created successfully!");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create hive",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.container}
    >
      {!currentUser ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>
            You must be logged in to create a hive. Please log in and try again.
          </Text>
          <Pressable
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Hive</Text>
          <Text style={styles.cardSubtitle}>
            Fill in the details to add a new hive to your apiary
          </Text>

          {/* Hive Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Hive Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.hiveName && styles.inputError]}
              placeholder="e.g., Hive 02"
              placeholderTextColor={THEME.placeholder}
              value={hiveName}
              onChangeText={(text) => {
                setHiveName(text);
                if (errors.hiveName) setErrors({ ...errors, hiveName: "" });
              }}
            />
            {errors.hiveName && (
              <Text style={styles.errorText}>{errors.hiveName}</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.hiveLocation && styles.inputError]}
              placeholder="e.g., Kampala"
              placeholderTextColor={THEME.placeholder}
              value={hiveLocation}
              onChangeText={(text) => {
                setHiveLocation(text);
                if (errors.hiveLocation)
                  setErrors({ ...errors, hiveLocation: "" });
              }}
            />
            {errors.hiveLocation && (
              <Text style={styles.errorText}>{errors.hiveLocation}</Text>
            )}
          </View>

          {/* Hive Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Hive Type <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.hiveType && styles.inputError]}
              placeholder="e.g., Langlongth"
              placeholderTextColor={THEME.placeholder}
              value={hiveType}
              onChangeText={(text) => {
                setHiveType(text);
                if (errors.hiveType) setErrors({ ...errors, hiveType: "" });
              }}
            />
            {errors.hiveType && (
              <Text style={styles.errorText}>{errors.hiveType}</Text>
            )}
          </View>

          {/* Installation Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Installation Date <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dateButtonRow}>
              <Pressable style={styles.dateButton} onPress={setToday}>
                <Ionicons
                  name="today-outline"
                  size={16}
                  color={THEME.primary}
                />
                <Text style={styles.dateButtonText}>Today</Text>
              </Pressable>
              <Pressable style={styles.dateButton} onPress={setTomorrow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={THEME.primary}
                />
                <Text style={styles.dateButtonText}>Tomorrow</Text>
              </Pressable>
            </View>
            <TextInput
              style={[
                styles.input,
                errors.installationDate && styles.inputError,
              ]}
              placeholder="YYYY-MM-DD (e.g., 2026-06-04)"
              placeholderTextColor={THEME.placeholder}
              value={installationDate}
              onChangeText={(text) => {
                setInstallationDate(text);
                if (errors.installationDate)
                  setErrors({ ...errors, installationDate: "" });
              }}
            />
            {errors.installationDate && (
              <Text style={styles.errorText}>{errors.installationDate}</Text>
            )}
          </View>

          {/* Coordinates Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Coordinates (GPS Location)</Text>

            {/* Get Current Location Button */}
            <Pressable
              style={[
                styles.locationButton,
                loadingLocation && styles.locationButtonDisabled,
              ]}
              onPress={getCurrentLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator color={THEME.primary} />
              ) : (
                <>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={THEME.primary}
                  />
                  <Text style={styles.locationButtonText}>
                    Use My Current Location
                  </Text>
                </>
              )}
            </Pressable>

            {/* Latitude and Longitude Inputs */}
            <View style={styles.coordinatesRow}>
              <View style={styles.coordinateInput}>
                <Text style={[styles.label, { marginBottom: 6 }]}>Latitude</Text>
                <TextInput
                  style={[styles.input, errors.latitude && styles.inputError]}
                  placeholder="0.0000"
                  placeholderTextColor={THEME.placeholder}
                  keyboardType="numeric"
                  value={latitude}
                  onChangeText={(text) => {
                    setLatitude(text);
                    if (errors.latitude) setErrors({ ...errors, latitude: "" });
                  }}
                />
                {errors.latitude && (
                  <Text style={styles.errorText}>{errors.latitude}</Text>
                )}
              </View>

              <View style={styles.coordinateInput}>
                <Text style={[styles.label, { marginBottom: 6 }]}>Longitude</Text>
                <TextInput
                  style={[styles.input, errors.longitude && styles.inputError]}
                  placeholder="0.0000"
                  placeholderTextColor={THEME.placeholder}
                  keyboardType="numeric"
                  value={longitude}
                  onChangeText={(text) => {
                    setLongitude(text);
                    if (errors.longitude) setErrors({ ...errors, longitude: "" });
                  }}
                />
                {errors.longitude && (
                  <Text style={styles.errorText}>{errors.longitude}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.cancelButton, styles.halfButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                styles.halfButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitButtonText}>Create Hive</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
