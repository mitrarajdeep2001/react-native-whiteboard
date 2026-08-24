import {
    ActiveStyle,
    PALETTE_COLORS,
    STICKY_COLORS,
    STROKE_WIDTHS,
    Tool,
} from "@/types/whiteboard";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

interface Props {
  activeTool: Tool;
  activeStyle: ActiveStyle;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onStyleChange: (patch: Partial<ActiveStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage: () => void;
}

type Panel = "none" | "color" | "stroke" | "sticky";

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: "select", label: "Select", icon: "↖" },
  { tool: "pen", label: "Pen", icon: "✏️" },
  { tool: "eraser", label: "Eraser", icon: "⬜" },
  { tool: "rect", label: "Rect", icon: "▭" },
  { tool: "circle", label: "Circle", icon: "○" },
  { tool: "line", label: "Line", icon: "╱" },
  { tool: "arrow", label: "Arrow", icon: "→" },
  { tool: "text", label: "Text", icon: "T" },
  { tool: "sticky", label: "Note", icon: "📝" },
  { tool: "image", label: "Image", icon: "🖼" },
];

export function Toolbar({
  activeTool,
  activeStyle,
  canUndo,
  canRedo,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onInsertImage,
}: Props) {
  const [openPanel, setOpenPanel] = useState<Panel>("none");

  const togglePanel = (panel: Panel) => {
    setOpenPanel((p) => (p === panel ? "none" : panel));
  };

  const handleToolPress = (tool: Tool) => {
    if (tool === "image") {
      onInsertImage();
      return;
    }
    onToolChange(tool);
    setOpenPanel("none");
  };

  return (
    <View style={styles.container}>
      {/* ── Tool row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolRow}
        style={styles.toolScroll}
      >
        {TOOLS.map(({ tool, icon, label }) => (
          <Pressable
            key={tool}
            style={[
              styles.toolBtn,
              activeTool === tool && styles.toolBtnActive,
            ]}
            onPress={() => handleToolPress(tool)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: activeTool === tool }}
          >
            <Text style={[styles.toolIcon, activeTool === tool && styles.toolIconActive]}>
              {icon}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Style row ── */}
      <View style={styles.styleRow}>
        {/* Color swatch */}
        <Pressable
          style={[styles.colorSwatch, { backgroundColor: activeStyle.color }]}
          onPress={() => togglePanel("color")}
          accessibilityRole="button"
          accessibilityLabel={`Current color: ${activeStyle.color}. Tap to change.`}
        />

        {/* Stroke width indicator */}
        <Pressable
          style={styles.strokeBtn}
          onPress={() => togglePanel("stroke")}
          accessibilityRole="button"
          accessibilityLabel={`Stroke width: ${activeStyle.strokeWidth}`}
        >
          <View
            style={[
              styles.strokeIndicator,
              {
                height: activeStyle.strokeWidth,
                backgroundColor: activeStyle.color,
              },
            ]}
          />
        </Pressable>

        {/* Sticky color (only visible when sticky tool active) */}
        {activeTool === "sticky" && (
          <Pressable
            style={[styles.stickyBtn, { backgroundColor: activeStyle.stickyBgColor }]}
            onPress={() => togglePanel("sticky")}
            accessibilityRole="button"
            accessibilityLabel="Sticky note color"
          >
            <Text style={styles.stickyBtnIcon}>📝</Text>
          </Pressable>
        )}

        <View style={styles.spacer} />

        {/* Undo */}
        <Pressable
          style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo"
        >
          <Text style={styles.iconBtnText}>↩</Text>
        </Pressable>

        {/* Redo */}
        <Pressable
          style={[styles.iconBtn, !canRedo && styles.iconBtnDisabled]}
          onPress={onRedo}
          disabled={!canRedo}
          accessibilityRole="button"
          accessibilityLabel="Redo"
        >
          <Text style={styles.iconBtnText}>↪</Text>
        </Pressable>
      </View>

      {/* ── Color panel ── */}
      {openPanel === "color" && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Color</Text>
          <View style={styles.paletteRow}>
            {PALETTE_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.paletteColor,
                  { backgroundColor: c },
                  activeStyle.color === c && styles.paletteColorSelected,
                ]}
                onPress={() => {
                  onStyleChange({ color: c });
                  setOpenPanel("none");
                }}
                accessibilityRole="radio"
                accessibilityLabel={c}
                accessibilityState={{ selected: activeStyle.color === c }}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Stroke width panel ── */}
      {openPanel === "stroke" && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Stroke Width</Text>
          <View style={styles.strokeRow}>
            {STROKE_WIDTHS.map((w) => (
              <Pressable
                key={w}
                style={[
                  styles.strokeOption,
                  activeStyle.strokeWidth === w && styles.strokeOptionSelected,
                ]}
                onPress={() => {
                  onStyleChange({ strokeWidth: w });
                  setOpenPanel("none");
                }}
                accessibilityRole="radio"
                accessibilityLabel={`${w}px`}
                accessibilityState={{ selected: activeStyle.strokeWidth === w }}
              >
                <View
                  style={[
                    styles.strokePreview,
                    { height: w, backgroundColor: activeStyle.color },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ── Sticky color panel ── */}
      {openPanel === "sticky" && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Note Color</Text>
          <View style={styles.paletteRow}>
            {STICKY_COLORS.map(({ bg, label, text }) => (
              <Pressable
                key={bg}
                style={[
                  styles.paletteColor,
                  { backgroundColor: bg },
                  activeStyle.stickyBgColor === bg && styles.paletteColorSelected,
                ]}
                onPress={() => {
                  onStyleChange({ stickyBgColor: bg });
                  setOpenPanel("none");
                }}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected: activeStyle.stickyBgColor === bg }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  toolScroll: {
    flexGrow: 0,
  },
  toolRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  toolBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: "#3b82f6",
  },
  toolIcon: {
    fontSize: 18,
    color: "#374151",
  },
  toolIconActive: {
    color: "#ffffff",
  },
  styleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  strokeBtn: {
    width: 52,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  strokeIndicator: {
    width: "100%",
    borderRadius: 4,
  },
  stickyBtn: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
  },
  stickyBtnIcon: {
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  iconBtnText: {
    fontSize: 18,
    color: "#374151",
  },
  panel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paletteColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paletteColorSelected: {
    borderColor: "#3b82f6",
    transform: [{ scale: 1.15 }],
  },
  strokeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  strokeOption: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  strokeOptionSelected: {
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  strokePreview: {
    width: "100%",
    borderRadius: 4,
  },
});
