import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { createHive, BeekeeperProfile } from "../../api/beeswarmApi";
import { THEME } from "../../theme";
import { HivesStackParamList } from "../../navigation/types";
// import { createHiveStyles as styles } from "./CreateHiveScreen.styles";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20 },
  cardTitle: { fontSize: 22, fontWeight: "800", color: THEME.primary, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: THEME.textMuted, marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: THEME.text, marginBottom: 8 },
  required: { color: "#EF4444" },
  input: { backgroundColor: THEME.page, borderWidth: 1, borderColor: THEME.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: THEME.text },
  inputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
  submitButton: { backgroundColor: THEME.primary, borderRadius: 10, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cancelButton: { backgroundColor: "transparent", borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  cancelButtonText: { color: THEME.textMuted, fontSize: 15, fontWeight: "600" },
  dateButtonRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dateButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: THEME.surfaceSoft, borderWidth: 1, borderColor: THEME.line, borderRadius: 8, paddingVertical: 10 },
  dateButtonText: { color: THEME.primary, fontSize: 14, fontWeight: "600" },
});

type Props = NativeStackScreenProps<HivesStackParamList, "CreateHive"> & {
  currentUser: BeekeeperProfile | null;
};

export function CreateHiveScreen({ navigation, route, currentUser }: Props) {
  // Debug logging
  console.log("[CreateHiveScreen] currentUser:", currentUser);
  
  const [hiveName, setHiveName] = useState("");
  const [hiveLocation, setHiveLocation] = useState("");
  const [hiveType, setHiveType] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hiveName.trim()) newErrors.hiveName = "Hive name is required";
    if (!hiveLocation.trim()) newErrors.hiveLocation = "Location is required";
    if (!hiveType.trim()) newErrors.hiveType = "Hive type is required";
    if (!installationDate.trim()) newErrors.installationDate = "Installation date is required";

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

      Alert.alert("Success", "Hive created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create hive"
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
          <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
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
          {errors.hiveName && <Text style={styles.errorText}>{errors.hiveName}</Text>}
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
              if (errors.hiveLocation) setErrors({ ...errors, hiveLocation: "" });
            }}
          />
          {errors.hiveLocation && <Text style={styles.errorText}>{errors.hiveLocation}</Text>}
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
          {errors.hiveType && <Text style={styles.errorText}>{errors.hiveType}</Text>}
        </View>

        {/* Installation Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Installation Date <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.dateButtonRow}>
            <Pressable style={styles.dateButton} onPress={setToday}>
              <Ionicons name="today-outline" size={16} color={THEME.primary} />
              <Text style={styles.dateButtonText}>Today</Text>
            </Pressable>
            <Pressable style={styles.dateButton} onPress={setTomorrow}>
              <Ionicons name="calendar-outline" size={16} color={THEME.primary} />
              <Text style={styles.dateButtonText}>Tomorrow</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, errors.installationDate && styles.inputError]}
            placeholder="YYYY-MM-DD (e.g., 2026-06-04)"
            placeholderTextColor={THEME.placeholder}
            value={installationDate}
            onChangeText={(text) => {
              setInstallationDate(text);
              if (errors.installationDate) setErrors({ ...errors, installationDate: "" });
            }}
          />
          {errors.installationDate && (
            <Text style={styles.errorText}>{errors.installationDate}</Text>
          )}
        </View>

        {/* Latitude */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={[styles.input, errors.latitude && styles.inputError]}
            placeholder="e.g., 0.3476"
            placeholderTextColor={THEME.placeholder}
            keyboardType="numeric"
            value={latitude}
            onChangeText={(text) => {
              setLatitude(text);
              if (errors.latitude) setErrors({ ...errors, latitude: "" });
            }}
          />
          {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
        </View>

        {/* Longitude */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={[styles.input, errors.longitude && styles.inputError]}
            placeholder="e.g., 32.5825"
            placeholderTextColor={THEME.placeholder}
            keyboardType="numeric"
            value={longitude}
            onChangeText={(text) => {
              setLongitude(text);
              if (errors.longitude) setErrors({ ...errors, longitude: "" });
            }}
          />
          {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create Hive</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
      )}
    </ScrollView>
  );
}
