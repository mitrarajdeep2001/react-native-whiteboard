import { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

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
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
  },
  menuItem: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "600",
  },
  deleteItem: {
    backgroundColor: "#fee2e2",
  },
  deleteText: {
    color: "#ef4444",
  },
  cancelItem: {
    marginTop: 4,
    backgroundColor: "transparent",
  },
  cancelText: {
    color: "#64748b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  confirmBtn: {
    backgroundColor: "#2563eb",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  confirmBtnText: {
    color: "#ffffff",
  },
});
