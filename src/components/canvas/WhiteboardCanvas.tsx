import { generateId } from "@/store/boardStore";
import {
    ActiveStyle,
    MAX_SCALE,
    MIN_SCALE,
    Point,
    Tool,
    WhiteboardElement,
} from "@/types/whiteboard";
import { boxesIntersect, getBoundingBox, getCombinedBoundingBox, getResizeHandles, HandlePosition, pointInBox, screenToCanvas, smoothPath } from "@/utils/canvasGeometry";
import {
    Canvas,
    DashPathEffect,
    Group,
    Path,
    Skia,
    Circle as SkiaCircle,
    Line as SkiaLine,
    Rect as SkiaRect,
    useCanvasRef,
} from "@shopify/react-native-skia";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import {
    runOnJS,
    SharedValue,
    useSharedValue,
} from "react-native-reanimated";
import { ElementRenderer } from "./renderer/ElementRenderer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InProgressShape {
  type: "rect" | "circle" | "line" | "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

interface InProgressPen {
  points: Point[];
  color: string;
  strokeWidth: number;
}

interface DragState {
  elementIds: string[];
  startPositions: Record<string, { x: number; y: number }>;
  startCanvasX: number;
  startCanvasY: number;
}

interface ResizeState {
  elementIds: string[];
  handle: HandlePosition;
  startBox: { x: number; y: number; w: number; h: number };
  startCanvasX: number;
  startCanvasY: number;
}

interface TextInputState {
  visible: boolean;
  canvasX: number;
  canvasY: number;
  screenX: number;
  screenY: number;
  existingId?: string;
  existingText?: string;
}

interface SelectionBoxDrag {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const HANDLE_RADIUS = 6;
const HANDLE_HIT = 14;

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface WhiteboardCanvasHandle {
  /** Returns a base64 PNG thumbnail of the current canvas, or null on failure */
  captureSnapshot(): Promise<string | null>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  elements: WhiteboardElement[];
  activeTool: Tool;
  activeStyle: ActiveStyle;
  selectedIds: string[];
  onAddElement: (el: WhiteboardElement) => void;
  onUpdateElement: (id: string, patch: Partial<WhiteboardElement>) => void;
  onDeleteElements: (ids: string[]) => void;
  onSelectIds: (ids: string[]) => void;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

export const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, Props>(
function WhiteboardCanvas({
  elements,
  activeTool,
  activeStyle,
  selectedIds,
  onAddElement,
  onUpdateElement,
  onDeleteElements,
  onSelectIds,
  translateX,
  translateY,
  scale,
}: Props, ref) {
  // ── Skia canvas ref for snapshot ───────────────────────────────────────────
  const canvasRef = useCanvasRef();

  // ── Snapshot imperative handle ────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async captureSnapshot(): Promise<string | null> {
      try {
        const image = await canvasRef.current?.makeImageSnapshotAsync();
        if (!image) return null;
        // encodeToBase64 returns a data-URI string; strip the prefix to get raw base64
        const dataUri = image.encodeToBase64();
        return dataUri ?? null;
      } catch {
        return null;
      }
    },
  }));
  // ── In-progress drawing state (JS thread) ──────────────────────────────────
  const [inProgressPen, setInProgressPen] = useState<InProgressPen | null>(null);
  const [inProgressShape, setInProgressShape] = useState<InProgressShape | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxDrag | null>(null);
  const [textInputState, setTextInputState] = useState<TextInputState>({
    visible: false,
    canvasX: 0,
    canvasY: 0,
    screenX: 0,
    screenY: 0,
  });
  const [textValue, setTextValue] = useState("");

  // ── Drag/resize state refs (avoid re-renders) ──────────────────────────────
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  // ── Saved viewport for pinch ──────────────────────────────────────────────
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // ── Canvas size (set on layout) ────────────────────────────────────────────
  const canvasWidth = useSharedValue(0);
  const canvasHeight = useSharedValue(0);

  // ─── Helpers (used in JS-thread handlers below) ───────────────────────────

  const getTopElementAt = useCallback(
    (canvasPoint: Point): WhiteboardElement | null => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        const box = getBoundingBox(el);
        if (pointInBox(canvasPoint, box)) return el;
      }
      return null;
    },
    [elements]
  );

  // ─── Handler refs — gestures close over these to avoid temporal dead zone ──
  // (The gesture objects are created before the handler functions are defined,
  //  so we use refs that get updated every render to bridge the gap.)
  const handleDrawStartRef = useRef<(sx: number, sy: number, cx: number, cy: number) => void>(() => {});
  const handleDrawUpdateRef = useRef<(sx: number, sy: number, cx: number, cy: number) => void>(() => {});
  const handleDrawEndRef = useRef<(cx: number, cy: number) => void>(() => {});
  const handleTapRef = useRef<(sx: number, sy: number, cx: number, cy: number) => void>(() => {});

  // ─── Gesture: pan/zoom (two fingers) ─────────────────────────────────────
   
  const panZoomGesture = Gesture.Simultaneous(
    Gesture.Pan()
      .minPointers(2)
      .onStart(() => {
         
        savedTx.value = translateX.value;
         
        savedTy.value = translateY.value;
      })
      .onUpdate((e) => {
         
        translateX.value = savedTx.value + e.translationX;
         
        translateY.value = savedTy.value + e.translationY;
      }),
    Gesture.Pinch()
      .onStart(() => {
         
        savedScale.value = scale.value;
         
        savedTx.value = translateX.value;
         
        savedTy.value = translateY.value;
      })
      .onUpdate((e) => {
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, savedScale.value * e.scale)
        );
        // Zoom toward focal point
        const fx = e.focalX;
        const fy = e.focalY;
         
        translateX.value = fx - (fx - savedTx.value) * (newScale / savedScale.value);
         
        translateY.value = fy - (fy - savedTy.value) * (newScale / savedScale.value);
         
        scale.value = newScale;
      })
  );

  // ─── Gesture: drawing / selecting (one finger) ────────────────────────────
   
  const drawGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart((e) => {
      const cp = screenToCanvas(e.x, e.y, translateX.value, translateY.value, scale.value);
      runOnJS(handleDrawStartRef.current)(e.x, e.y, cp.x, cp.y);
    })
    .onUpdate((e) => {
      const cp = screenToCanvas(e.x, e.y, translateX.value, translateY.value, scale.value);
      runOnJS(handleDrawUpdateRef.current)(e.x, e.y, cp.x, cp.y);
    })
    .onEnd((e) => {
      const cp = screenToCanvas(e.x, e.y, translateX.value, translateY.value, scale.value);
      runOnJS(handleDrawEndRef.current)(cp.x, cp.y);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const cp = screenToCanvas(e.x, e.y, translateX.value, translateY.value, scale.value);
    runOnJS(handleTapRef.current)(e.x, e.y, cp.x, cp.y);
  });

  const combinedGesture = Gesture.Race(
    panZoomGesture,
    Gesture.Simultaneous(drawGesture, tapGesture)
  );

  // ─── JS-thread handlers ───────────────────────────────────────────────────

  const handleDrawStart = (sx: number, sy: number, cx: number, cy: number) => {
    if (activeTool === "pen") {
      setInProgressPen({
        points: [{ x: cx, y: cy }],
        color: activeStyle.color,
        strokeWidth: activeStyle.strokeWidth,
      });
    } else if (["rect", "circle", "line", "arrow"].includes(activeTool)) {
      setInProgressShape({
        type: activeTool as "rect" | "circle" | "line" | "arrow",
        startX: cx,
        startY: cy,
        endX: cx,
        endY: cy,
        color: activeStyle.color,
        strokeWidth: activeStyle.strokeWidth,
      });
    } else if (activeTool === "select") {
      // Check if we're touching a resize handle first
      if (selectedIds.length > 0) {
        const selectedElements = elements.filter((el) =>
          selectedIds.includes(el.id)
        );
        const combinedBox = getCombinedBoundingBox(selectedElements);
        if (combinedBox) {
          const handles = getResizeHandles(combinedBox);
          for (const handle of handles) {
            if (
              Math.abs(cx - handle.x) < HANDLE_HIT &&
              Math.abs(cy - handle.y) < HANDLE_HIT
            ) {
              resizeRef.current = {
                elementIds: [...selectedIds],
                handle: handle.pos,
                startBox: { ...combinedBox },
                startCanvasX: cx,
                startCanvasY: cy,
              };
              return;
            }
          }
        }
      }

      // Check if touching a selected element (drag)
      const hit = getTopElementAt({ x: cx, y: cy });
      if (hit && selectedIds.includes(hit.id)) {
        const startPositions: Record<string, { x: number; y: number }> = {};
        for (const id of selectedIds) {
          const el = elements.find((e) => e.id === id);
          if (el) {
            const box = getBoundingBox(el);
            startPositions[id] = { x: box.x, y: box.y };
          }
        }
        dragRef.current = {
          elementIds: [...selectedIds],
          startPositions,
          startCanvasX: cx,
          startCanvasY: cy,
        };
        return;
      }

      // Start a selection box drag
      setSelectionBox({ startX: cx, startY: cy, endX: cx, endY: cy });
    } else if (activeTool === "eraser") {
      // Erase element at touch point
      const hit = getTopElementAt({ x: cx, y: cy });
      if (hit) {
        onDeleteElements([hit.id]);
      }
    }
  };

  const handleDrawUpdate = (_sx: number, _sy: number, cx: number, cy: number) => {
    if (activeTool === "pen" && inProgressPen) {
      setInProgressPen((prev) =>
        prev
          ? { ...prev, points: [...prev.points, { x: cx, y: cy }] }
          : null
      );
    } else if (
      ["rect", "circle", "line", "arrow"].includes(activeTool) &&
      inProgressShape
    ) {
      setInProgressShape((prev) =>
        prev ? { ...prev, endX: cx, endY: cy } : null
      );
    } else if (activeTool === "select") {
      if (resizeRef.current) {
        handleResizeUpdate(cx, cy);
      } else if (dragRef.current) {
        handleDragUpdate(cx, cy);
      } else if (selectionBox) {
        setSelectionBox((prev) =>
          prev ? { ...prev, endX: cx, endY: cy } : null
        );
      }
    } else if (activeTool === "eraser") {
      const hit = getTopElementAt({ x: cx, y: cy });
      if (hit) {
        onDeleteElements([hit.id]);
      }
    }
  };

  const handleDrawEnd = (cx: number, cy: number) => {
    if (activeTool === "pen" && inProgressPen) {
      if (inProgressPen.points.length > 1) {
        onAddElement({
          type: "pen",
          id: generateId(),
          points: inProgressPen.points,
          color: inProgressPen.color,
          strokeWidth: inProgressPen.strokeWidth,
        });
      }
      setInProgressPen(null);
    } else if (
      ["rect", "circle", "line", "arrow"].includes(activeTool) &&
      inProgressShape
    ) {
      commitShape(inProgressShape);
      setInProgressShape(null);
    } else if (activeTool === "select") {
      if (resizeRef.current) {
        resizeRef.current = null;
      } else if (dragRef.current) {
        dragRef.current = null;
      } else if (selectionBox) {
        // Finalize selection box
        const box = {
          x: Math.min(selectionBox.startX, cx),
          y: Math.min(selectionBox.startY, cy),
          w: Math.abs(cx - selectionBox.startX),
          h: Math.abs(cy - selectionBox.startY),
        };
        if (box.w > 4 || box.h > 4) {
          const ids = elements
            .filter((el) => boxesIntersect(getBoundingBox(el), box))
            .map((el) => el.id);
          onSelectIds(ids);
        } else {
          onSelectIds([]);
        }
        setSelectionBox(null);
      }
    }
  };

  const handleTap = (sx: number, sy: number, cx: number, cy: number) => {
    if (activeTool === "text") {
      setTextInputState({
        visible: true,
        canvasX: cx,
        canvasY: cy,
        screenX: sx,
        screenY: sy,
      });
      setTextValue("");
    } else if (activeTool === "sticky") {
      onAddElement({
        type: "sticky",
        id: generateId(),
        x: cx,
        y: cy,
        w: 160,
        h: 120,
        text: "",
        bgColor: activeStyle.stickyBgColor,
        textColor: "#713f12",
      });
    } else if (activeTool === "select") {
      const hit = getTopElementAt({ x: cx, y: cy });
      if (hit) {
        onSelectIds([hit.id]);
        // If double-tapping a sticky, open text editor
        if (hit.type === "sticky" || hit.type === "text") {
          setTextInputState({
            visible: true,
            canvasX: hit.type === "sticky" ? hit.x + 10 : hit.x,
            canvasY: hit.type === "sticky" ? hit.y + 10 : hit.y,
            screenX: sx,
            screenY: sy,
            existingId: hit.id,
            existingText: hit.text,
          });
          setTextValue(hit.text);
        }
      } else {
        onSelectIds([]);
      }
    }
  };

  // ─── Sync handler refs every render ──────────────────────────────────────
  handleDrawStartRef.current = handleDrawStart;
  handleDrawUpdateRef.current = handleDrawUpdate;
  handleDrawEndRef.current = handleDrawEnd;
  handleTapRef.current = handleTap;

  // ─── Drag update ──────────────────────────────────────────────────────────

  const handleDragUpdate = (cx: number, cy: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = cx - drag.startCanvasX;
    const dy = cy - drag.startCanvasY;

    for (const id of drag.elementIds) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      const start = drag.startPositions[id];
      if (!start) continue;

      const offsetX = dx;
      const offsetY = dy;

      switch (el.type) {
        case "pen":
          onUpdateElement(id, {
            points: el.points.map((p) => ({
              x: p.x + offsetX - (el.points[0].x - (start.x + (el.points[0].x - (getBoundingBox(el).x)))),
              y: p.y + offsetY - (el.points[0].y - (start.y + (el.points[0].y - (getBoundingBox(el).y)))),
            })),
          } as Partial<WhiteboardElement>);
          break;
        case "rect":
        case "sticky":
        case "image":
          onUpdateElement(id, { x: start.x + dx, y: start.y + dy } as Partial<WhiteboardElement>);
          break;
        case "circle":
          onUpdateElement(id, {
            cx: el.cx - getBoundingBox(el).x + start.x + dx + el.r,
            cy: el.cy - getBoundingBox(el).y + start.y + dy + el.r,
          } as Partial<WhiteboardElement>);
          break;
        case "line":
        case "arrow": {
          const origBox = getBoundingBox(el);
          const offsetXFromBox = el.x1 - origBox.x;
          const offsetYFromBox = el.y1 - origBox.y;
          onUpdateElement(id, {
            x1: start.x + dx + offsetXFromBox,
            y1: start.y + dy + offsetYFromBox,
            x2: start.x + dx + offsetXFromBox + (el.x2 - el.x1),
            y2: start.y + dy + offsetYFromBox + (el.y2 - el.y1),
          } as Partial<WhiteboardElement>);
          break;
        }
        case "text":
          onUpdateElement(id, { x: start.x + dx, y: start.y + dy + el.fontSize } as Partial<WhiteboardElement>);
          break;
      }
    }
  };

  // ─── Resize update ────────────────────────────────────────────────────────

  const handleResizeUpdate = (cx: number, cy: number) => {
    const r = resizeRef.current;
    if (!r || r.elementIds.length !== 1) return; // simple: single element resize

    const id = r.elementIds[0];
    const el = elements.find((e) => e.id === id);
    if (!el) return;

    const dx = cx - r.startCanvasX;
    const dy = cy - r.startCanvasY;
    const sb = r.startBox;
    const handle = r.handle;

    let newX = sb.x;
    let newY = sb.y;
    let newW = sb.w;
    let newH = sb.h;

    if (handle.includes("l")) { newX = sb.x + dx; newW = sb.w - dx; }
    if (handle.includes("r")) { newW = sb.w + dx; }
    if (handle.includes("t")) { newY = sb.y + dy; newH = sb.h - dy; }
    if (handle.includes("b")) { newH = sb.h + dy; }
    if (handle === "tm" || handle === "bm") { /* only vertical */ }
    if (handle === "ml" || handle === "mr") { /* only horizontal */ }

    if (newW < 10) newW = 10;
    if (newH < 10) newH = 10;

    switch (el.type) {
      case "rect":
      case "sticky":
      case "image":
        onUpdateElement(id, { x: newX, y: newY, w: newW, h: newH } as Partial<WhiteboardElement>);
        break;
      case "circle":
        onUpdateElement(id, { cx: newX + newW / 2, cy: newY + newH / 2, r: Math.min(newW, newH) / 2 } as Partial<WhiteboardElement>);
        break;
      default:
        break;
    }
  };

  // ─── Commit shape ─────────────────────────────────────────────────────────

  const commitShape = (shape: InProgressShape) => {
    const { type, startX, startY, endX, endY, color, strokeWidth } = shape;
    const minSize = 4;
    if (Math.abs(endX - startX) < minSize && Math.abs(endY - startY) < minSize) return;

    const id = generateId();
    switch (type) {
      case "rect":
        onAddElement({ type: "rect", id, x: startX, y: startY, w: endX - startX, h: endY - startY, color, strokeWidth });
        break;
      case "circle": {
        const rx = (endX - startX) / 2;
        const ry = (endY - startY) / 2;
        const r = Math.sqrt(rx * rx + ry * ry);
        onAddElement({ type: "circle", id, cx: startX + rx, cy: startY + ry, r, color, strokeWidth });
        break;
      }
      case "line":
        onAddElement({ type: "line", id, x1: startX, y1: startY, x2: endX, y2: endY, color, strokeWidth });
        break;
      case "arrow":
        onAddElement({ type: "arrow", id, x1: startX, y1: startY, x2: endX, y2: endY, color, strokeWidth });
        break;
    }
  };

  // ─── Text input commit ────────────────────────────────────────────────────

  const commitText = () => {
    if (!textValue.trim()) {
      setTextInputState((s) => ({ ...s, visible: false }));
      return;
    }
    if (textInputState.existingId) {
      const el = elements.find((e) => e.id === textInputState.existingId);
      if (el?.type === "sticky") {
        onUpdateElement(textInputState.existingId, { text: textValue } as Partial<WhiteboardElement>);
      } else {
        onUpdateElement(textInputState.existingId, { text: textValue } as Partial<WhiteboardElement>);
      }
    } else {
      onAddElement({
        type: "text",
        id: generateId(),
        x: textInputState.canvasX,
        y: textInputState.canvasY,
        text: textValue,
        color: activeStyle.color,
        fontSize: activeStyle.fontSize,
      });
    }
    setTextInputState((s) => ({ ...s, visible: false }));
    setTextValue("");
  };

  // ─── Animated canvas container ─────────────────────────────────────────────

  // The canvas itself is fixed; we transform elements inside via Skia Group matrix
  // We also render a floating TextInput overlay for text entry

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const combinedBox = selectedElements.length > 0 ? getCombinedBoundingBox(selectedElements) : null;
  const handles = combinedBox ? getResizeHandles(combinedBox) : [];

  // ─── Grid rendering ───────────────────────────────────────────────────────

  const renderGrid = (txVal: number, tyVal: number, scaleVal: number, w: number, h: number) => {
    const gridSpacing = 40 * scaleVal;
    const lines = [];
    const offsetX = ((txVal % gridSpacing) + gridSpacing) % gridSpacing;
    const offsetY = ((tyVal % gridSpacing) + gridSpacing) % gridSpacing;

    for (let x = offsetX; x < w; x += gridSpacing) {
      lines.push(
        <SkiaLine
          key={`v${x}`}
          p1={{ x, y: 0 }}
          p2={{ x, y: h }}
          color="rgba(200,200,220,0.5)"
          strokeWidth={1}
        />
      );
    }
    for (let y = offsetY; y < h; y += gridSpacing) {
      lines.push(
        <SkiaLine
          key={`h${y}`}
          p1={{ x: 0, y }}
          p2={{ x: w, y }}
          color="rgba(200,200,220,0.5)"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [txSnapshot, setTxSnapshot] = useState(0);
  const [tySnapshot, setTySnapshot] = useState(0);
  const [scaleSnapshot, setScaleSnapshot] = useState(1);


  // ─── In-progress pen path preview ────────────────────────────────────────

  const inProgressPenPath = inProgressPen
    ? Skia.Path.MakeFromSVGString(smoothPath(inProgressPen.points))
    : null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        setCanvasSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        });
        canvasWidth.value = e.nativeEvent.layout.width;
        canvasHeight.value = e.nativeEvent.layout.height;
      }}
    >
      <GestureDetector gesture={combinedGesture}>
        <View style={styles.canvasWrapper}>
          <Canvas
            ref={canvasRef}
            style={styles.canvas}
            onTouchStart={() => {
              // Snapshot current transform for grid (JS thread read)
              setTxSnapshot(translateX.value);
              setTySnapshot(translateY.value);
              setScaleSnapshot(scale.value);
            }}
          >
            {/* Background */}
            <SkiaRect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              color="#fafafa"
            />

            {/* Grid */}
            {canvasSize.width > 0 &&
              renderGrid(txSnapshot, tySnapshot, scaleSnapshot, canvasSize.width, canvasSize.height)}

            {/* Transformed content group */}
            <Group
              transform={[
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
              ]}
            >
              {/* All committed elements */}
              {elements.map((el) => (
                <ElementRenderer key={el.id} element={el} />
              ))}

              {/* In-progress pen stroke */}
              {inProgressPen && inProgressPenPath && (
                <Path
                  path={inProgressPenPath}
                  color={inProgressPen.color}
                  style="stroke"
                  strokeWidth={inProgressPen.strokeWidth}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}

              {/* In-progress shape */}
              {inProgressShape && (() => {
                const { type, startX, startY, endX, endY, color, strokeWidth } = inProgressShape;
                if (type === "rect") {
                  return (
                    <SkiaRect
                      x={Math.min(startX, endX)}
                      y={Math.min(startY, endY)}
                      width={Math.abs(endX - startX)}
                      height={Math.abs(endY - startY)}
                      color={color}
                      style="stroke"
                      strokeWidth={strokeWidth}
                    />
                  );
                }
                if (type === "circle") {
                  const rx = (endX - startX) / 2;
                  const ry = (endY - startY) / 2;
                  const r = Math.sqrt(rx * rx + ry * ry);
                  return (
                    <SkiaCircle
                      cx={startX + rx}
                      cy={startY + ry}
                      r={r}
                      color={color}
                      style="stroke"
                      strokeWidth={strokeWidth}
                    />
                  );
                }
                if (type === "line" || type === "arrow") {
                  return (
                    <SkiaLine
                      p1={{ x: startX, y: startY }}
                      p2={{ x: endX, y: endY }}
                      color={color}
                      strokeWidth={strokeWidth}
                      strokeCap="round"
                    />
                  );
                }
                return null;
              })()}

              {/* Selection box drag */}
              {selectionBox && (() => {
                const x = Math.min(selectionBox.startX, selectionBox.endX);
                const y = Math.min(selectionBox.startY, selectionBox.endY);
                const w = Math.abs(selectionBox.endX - selectionBox.startX);
                const h = Math.abs(selectionBox.endY - selectionBox.startY);
                const selPath = Skia.Path.Make();
                selPath.addRect(Skia.XYWHRect(x, y, w, h));
                return (
                  <>
                    <SkiaRect x={x} y={y} width={w} height={h} color="rgba(59,130,246,0.08)" />
                    <Path path={selPath} color="#3b82f6" style="stroke" strokeWidth={1.5}>
                      <DashPathEffect intervals={[6, 4]} />
                    </Path>
                  </>
                );
              })()}

              {/* Selection bounding box + handles */}
              {combinedBox && (() => {
                const { x, y, w, h } = combinedBox;
                const selPath = Skia.Path.Make();
                selPath.addRect(Skia.XYWHRect(x - 4, y - 4, w + 8, h + 8));
                return (
                  <>
                    <Path path={selPath} color="#3b82f6" style="stroke" strokeWidth={1.5}>
                      <DashPathEffect intervals={[6, 4]} />
                    </Path>
                    {handles.map((handle) => (
                      <SkiaCircle
                        key={handle.pos}
                        cx={handle.x}
                        cy={handle.y}
                        r={HANDLE_RADIUS}
                        color="#ffffff"
                      />
                    ))}
                    {handles.map((handle) => (
                      <SkiaCircle
                        key={`${handle.pos}_outline`}
                        cx={handle.x}
                        cy={handle.y}
                        r={HANDLE_RADIUS}
                        color="#3b82f6"
                        style="stroke"
                        strokeWidth={2}
                      />
                    ))}
                  </>
                );
              })()}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>

      {/* Floating TextInput overlay for text/sticky editing */}
      {textInputState.visible && (
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TextInput
              style={[
                styles.floatingInput,
                {
                  left: Math.max(
                    16,
                    Math.min(
                      textInputState.screenX,
                      canvasSize.width - 200
                    )
                  ),
                  top: Math.max(
                    60,
                    Math.min(textInputState.screenY, canvasSize.height - 120)
                  ),
                  fontSize: activeStyle.fontSize,
                  color: activeStyle.color,
                },
              ]}
              value={textValue}
              onChangeText={setTextValue}
              autoFocus
              multiline
              returnKeyType="done"
              onBlur={commitText}
              blurOnSubmit
              accessibilityLabel="Text input for whiteboard"
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  floatingInput: {
    position: "absolute",
    minWidth: 180,
    maxWidth: 280,
    minHeight: 40,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    fontWeight: "500",
  },
});
