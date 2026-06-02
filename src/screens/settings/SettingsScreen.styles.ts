import { StyleSheet } from "react-native";
import { THEME } from "../../theme";

export const settingsStyles = StyleSheet.create({
  settingsPage: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: THEME.page,
    gap: 12,
  },
  settingsSection: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.line,
    borderRadius: 12,
    padding: 12,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  settingsAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surfaceSoft,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  settingsAccountName: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  settingsAccountEmail: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textMuted,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsRowColumn: {
    gap: 10,
  },
  settingsRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  settingsRowHint: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 18,
  },
  settingsDivider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: THEME.line,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 8,
  },
  segmentButtonActive: {
    backgroundColor: THEME.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  settingsActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  settingsSecondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  settingsSecondaryButtonText: {
    color: THEME.text,
    fontWeight: "700",
    fontSize: 13,
  },
  settingsPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: THEME.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  settingsPrimaryButtonText: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 13,
  },
});
