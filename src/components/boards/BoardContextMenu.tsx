import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";

interface Props {
  visible: boolean;
  boardName: string;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BoardContextMenu({
  visible,
  boardName,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const [mode, setMode] = useState<"menu" | "rename">("menu");
  const [nameInput, setNameInput] = useState(boardName);

  const handleClose = () => {
    setMode("menu");
    setNameInput(boardName);
    onClose();
  };

  const handleRenameConfirm = () => {
    if (nameInput.trim()) {
      onRename(nameInput.trim());
    }
    setMode("menu");
    onClose();
  };

  const handleDeletePress = () => {
    setMode("menu");
    onClose();
    onDelete();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {mode === "menu" ? (
              <>
                <Text style={styles.title} numberOfLines={1}>
                  {boardName}
                </Text>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setNameInput(boardName);
                    setMode("rename");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Rename board"
                >
                  <Text style={styles.menuItemText}>Rename</Text>
                </Pressable>
                <Pressable
                  style={[styles.menuItem, styles.deleteItem]}
                  onPress={handleDeletePress}
                  accessibilityRole="button"
                  accessibilityLabel="Delete board"
                >
                  <Text style={[styles.menuItemText, styles.deleteText]}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.menuItem, styles.cancelItem]}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.menuItemText, styles.cancelText]}>
                    Cancel
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Rename Board</Text>
                <TextInput
                  style={styles.input}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRenameConfirm}
                  accessibilityLabel="Board name input"
                />
                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={handleClose}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.confirmBtn]}
                    onPress={handleRenameConfirm}
                  >
                    <Text style={[styles.btnText, styles.confirmBtnText]}>
                      Rename
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  menuItem: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  deleteItem: {
    backgroundColor: "#fee2e2",
  },
  deleteText: {
    color: "#dc2626",
  },
  cancelItem: {
    marginTop: 4,
    backgroundColor: "transparent",
  },
  cancelText: {
    color: "#6b7280",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#f3f4f6",
  },
  confirmBtn: {
    backgroundColor: "#3b82f6",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  confirmBtnText: {
    color: "#fff",
  },
});
