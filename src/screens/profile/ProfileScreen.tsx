import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import {
  BeekeeperProfile,
  fetchProfile,
  updateProfile,
} from "../../api/beeswarmApi";
import { THEME } from "../../theme";
import { profileStyles as styles } from "./ProfileScreen.styles";

type Props = {
  onLogout: () => void;
  onOpenSettings: () => void;
  currentUser: BeekeeperProfile | null;
  onProfileUpdate: (user: BeekeeperProfile) => void;
};

export function ProfileScreen({
  onLogout,
  onOpenSettings,
  currentUser,
  onProfileUpdate,
}: Props) {
  const [name, setName] = useState(currentUser?.name ?? "Beekeeper");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [apiKey, setApiKey] = useState(currentUser?.api_key ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!currentUser);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email ?? "");
      setPhone(currentUser.phone);
      setAddress(currentUser.address ?? "");
      setApiKey(currentUser.api_key ?? "");
      return;
    }
    void (async () => {
      try {
        const profile = await fetchProfile();
        setName(profile.name);
        setEmail(profile.email ?? "");
        setPhone(profile.phone);
        setAddress(profile.address ?? "");
        setApiKey(profile.api_key ?? "");
        onProfileUpdate(profile);
      } catch {
        Toast.show({ type: "error", text1: "Could not load profile" });
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser, onProfileUpdate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        name,
        email,
        phone,
        address,
        api_key: apiKey,
        // server_url omitted — Railway URL is the fixed backend
      });
      onProfileUpdate(updated);
      setEditing(false);
      Toast.show({ type: "success", text1: "Profile saved" });
    } catch {
      Toast.show({ type: "error", text1: "Could not save profile" });
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={THEME.accent} />
        <Text style={styles.stateText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: THEME.page }}
      contentContainerStyle={styles.profilePage}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={styles.profileHeroCard}>
        <View style={styles.profileAvatarCircle}>
          <Text style={styles.profileAvatarInitials}>{initials || "BK"}</Text>
        </View>
        {editing ? (
          <TextInput
            id="profile-name"
            style={styles.profileNameInput}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={THEME.placeholder}
          />
        ) : (
          <Text style={styles.profileHeroName}>{name}</Text>
        )}
        <Text style={styles.profileHeroRole}>Beekeeper</Text>
      </View>

      {/* Contact Info */}
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Contact Information</Text>

        <View style={styles.profileFieldRow}>
          <Ionicons
            name="mail-outline"
            size={18}
            color={THEME.textMuted}
            style={styles.profileFieldIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileFieldLabel}>Email</Text>
            {editing ? (
              <TextInput
                id="profile-email"
                style={styles.profileFieldInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email address"
                placeholderTextColor={THEME.placeholder}
              />
            ) : (
              <Text style={styles.profileFieldValue}>{email || "—"}</Text>
            )}
          </View>
        </View>
        <View style={styles.profileDivider} />

        <View style={styles.profileFieldRow}>
          <Ionicons
            name="call-outline"
            size={18}
            color={THEME.textMuted}
            style={styles.profileFieldIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileFieldLabel}>Phone</Text>
            {editing ? (
              <TextInput
                id="profile-phone"
                style={styles.profileFieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Phone number"
                placeholderTextColor={THEME.placeholder}
              />
            ) : (
              <Text style={styles.profileFieldValue}>{phone || "—"}</Text>
            )}
          </View>
        </View>
        <View style={styles.profileDivider} />

        <View style={styles.profileFieldRow}>
          <Ionicons
            name="location-outline"
            size={18}
            color={THEME.textMuted}
            style={styles.profileFieldIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileFieldLabel}>Address</Text>
            {editing ? (
              <TextInput
                id="profile-address"
                style={styles.profileFieldInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Your address"
                placeholderTextColor={THEME.placeholder}
              />
            ) : (
              <Text style={styles.profileFieldValue}>{address || "—"}</Text>
            )}
          </View>
        </View>
        <View style={styles.profileDivider} />

        <View style={styles.profileFieldRow}>
          <Ionicons
            name="key-outline"
            size={18}
            color={THEME.textMuted}
            style={styles.profileFieldIcon}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileFieldLabel}>API Key</Text>
            {editing ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  id="profile-api-key"
                  style={[styles.profileFieldInput, { flex: 1 }]}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="Enter API key"
                  placeholderTextColor={THEME.placeholder}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowApiKey((v) => !v)}
                  style={{ paddingLeft: 8 }}
                >
                  <Ionicons
                    name={showApiKey ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={THEME.textMuted}
                  />
                </Pressable>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.profileFieldValue}>
                  {apiKey ? (showApiKey ? apiKey : "••••••••••••••••") : "—"}
                </Text>
                {apiKey !== "" && (
                  <Pressable onPress={() => setShowApiKey((v) => !v)}>
                    <Ionicons
                      name={showApiKey ? "eye-off-outline" : "eye-outline"}
                      size={16}
                      color={THEME.textMuted}
                    />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={styles.profileDivider} />

        {/* Server URL is fixed (Railway) — not shown to end users */}
      </View>

      {/* Edit / Save row */}
      {editing ? (
        <View style={styles.profileActionsRow}>
          <Pressable
            style={styles.profileSecondaryBtn}
            onPress={() => setEditing(false)}
          >
            <Text style={styles.profileSecondaryBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.profilePrimaryBtn, saving && { opacity: 0.6 }]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            <Text style={styles.profilePrimaryBtnText}>
              {saving ? "Saving…" : "Save Changes"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.profileEditBtn}
          onPress={() => setEditing(true)}
        >
          <Ionicons name="create-outline" size={16} color={THEME.primary} />
          <Text style={styles.profileEditBtnText}>Edit Profile</Text>
        </Pressable>
      )}

      {/* Quick links */}
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>App</Text>

        <Pressable style={styles.profileLinkRow} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={20} color={THEME.primary} />
          <Text style={styles.profileLinkText}>Settings</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={THEME.textMuted}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
        <View style={styles.profileDivider} />

        <Pressable
          style={styles.profileLinkRow}
          onPress={() =>
            Toast.show({ type: "info", text1: "Change password coming soon" })
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={THEME.primary}
          />
          <Text style={styles.profileLinkText}>Change Password</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={THEME.textMuted}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
        <View style={styles.profileDivider} />

        <Pressable
          style={styles.profileLinkRow}
          onPress={() =>
            Toast.show({ type: "info", text1: "Help & support coming soon" })
          }
        >
          <Ionicons
            name="help-circle-outline"
            size={20}
            color={THEME.primary}
          />
          <Text style={styles.profileLinkText}>Help & Support</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={THEME.textMuted}
            style={{ marginLeft: "auto" }}
          />
        </Pressable>
      </View>

      {/* Sign out */}
      <Pressable style={styles.profileLogoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={18} color="#B42318" />
        <Text style={styles.profileLogoutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.profileVersion}>Beeswarm v1.0.0</Text>
    </ScrollView>
  );
}
