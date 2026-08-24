import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { WhiteboardCanvas, WhiteboardCanvasHandle } from "@/components/canvas/WhiteboardCanvas";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { useElementManager } from "@/hooks/useElementManager";
import { generateId, loadBoard, updateBoardElements } from "@/store/boardStore";
import {
    ActiveStyle,
    STICKY_COLORS,
    Tool,
    WhiteboardElement,
} from "@/types/whiteboard";

const DEFAULT_STYLE: ActiveStyle = {
  color: "#1a1a1a",
  strokeWidth: 4,
  fontSize: 18,
  stickyBgColor: STICKY_COLORS[0].bg,
};

const AUTO_SAVE_DELAY = 800;

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [boardName, setBoardName] = useState("Board");
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeStyle, setActiveStyle] = useState<ActiveStyle>(DEFAULT_STYLE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Ref to canvas for thumbnail generation
  const canvasHandleRef = useRef<WhiteboardCanvasHandle>(null);

  // Shared values for infinite canvas pan/zoom
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const {
    elements,
    addElement,
    updateElement,
    deleteElements,
    replaceElements,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useElementManager([]);

  // ── Load board on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      const board = await loadBoard(id);
      if (!board) {
        Alert.alert("Error", "Board not found", [
          { text: "OK", onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }},
        ]);
        return;
      }
      setBoardName(board.name);
      replaceElements(board.elements);
      translateX.value = board.viewport.translateX;
      translateY.value = board.viewport.translateY;
      scale.value = board.viewport.scale;
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Auto-save with debounce ────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (els: WhiteboardElement[]) => {
      if (!id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        // Capture thumbnail first (async, best effort)
        const thumbnail = await canvasHandleRef.current?.captureSnapshot() ?? undefined;
        await updateBoardElements(
          id,
          els,
          {
            translateX: translateX.value,
            translateY: translateY.value,
            scale: scale.value,
          },
          thumbnail
        );
      }, AUTO_SAVE_DELAY);
    },
    [id, translateX, translateY, scale]
  );

  // Trigger save whenever elements change
  useEffect(() => {
    if (!loading) {
      scheduleSave(elements);
    }
  }, [elements, loading, scheduleSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Style change ───────────────────────────────────────────────────────────
  const handleStyleChange = (patch: Partial<ActiveStyle>) => {
    setActiveStyle((s) => ({ ...s, ...patch }));
  };

  // ── Image picker ───────────────────────────────────────────────────────────
  const handleInsertImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to insert images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imgW = Math.min(asset.width ?? 300, 300);
      const imgH = asset.height && asset.width
        ? (imgW / asset.width) * asset.height
        : imgW;

      // Place image at center of current viewport
      const centerX = (200 - translateX.value) / scale.value;
      const centerY = (300 - translateY.value) / scale.value;

      addElement({
        type: "image",
        id: generateId(),
        uri: asset.uri,
        x: centerX - imgW / 2,
        y: centerY - imgH / 2,
        w: imgW,
        h: imgH,
      });
    }
  };

  // ── Add / update / delete wrappers with selection clearing ─────────────────
  const handleAddElement = useCallback(
    (el: WhiteboardElement) => {
      addElement(el);
      setSelectedIds([]);
    },
    [addElement]
  );

  const handleUpdateElement = useCallback(
    (elId: string, patch: Partial<WhiteboardElement>) => {
      updateElement(elId, patch);
    },
    [updateElement]
  );

  const handleDeleteElements = useCallback(
    (ids: string[]) => {
      deleteElements(ids);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    },
    [deleteElements]
  );

  // ── Delete selected ────────────────────────────────────────────────────────
  const handleDeleteSelected = () => {
    if (selectedIds.length > 0) {
      deleteElements(selectedIds);
      setSelectedIds([]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.boardName} numberOfLines={1}>
          {boardName}
        </Text>
        {selectedIds.length > 0 ? (
          <Pressable
            style={styles.deleteBtn}
            onPress={handleDeleteSelected}
            accessibilityRole="button"
            accessibilityLabel="Delete selected elements"
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Canvas */}
      <WhiteboardCanvas
        ref={canvasHandleRef}
        elements={elements}
        activeTool={activeTool}
        activeStyle={activeStyle}
        selectedIds={selectedIds}
        onAddElement={handleAddElement}
        onUpdateElement={handleUpdateElement}
        onDeleteElements={handleDeleteElements}
        onSelectIds={setSelectedIds}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
      />

      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        activeStyle={activeStyle}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setActiveTool}
        onStyleChange={handleStyleChange}
        onUndo={undo}
        onRedo={redo}
        onInsertImage={handleInsertImage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  backBtnText: {
    fontSize: 24,
    color: "#374151",
    lineHeight: 28,
  },
  boardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  headerSpacer: {
    width: 36,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  deleteBtnText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 14,
  },
});
