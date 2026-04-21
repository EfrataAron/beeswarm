import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type HeaderOverflowMenuProps = {
  onLogout: () => void;
};

export function HeaderOverflowMenu({ onLogout }: HeaderOverflowMenuProps) {
  const [visible, setVisible] = useState(false);

  const closeMenu = () => setVisible(false);
  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#001E37" />
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.menu}>
            <Pressable
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color="#001E37" />
              <Text style={styles.menuItemText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#FFF5EA",
  },
  pressed: {
    opacity: 0.75,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menu: {
    marginTop: 90,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE2EA",
    minWidth: 140,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemPressed: {
    backgroundColor: "#F8F9FB",
  },
  menuItemText: {
    color: "#001E37",
    fontSize: 14,
    fontWeight: "600",
  },
});