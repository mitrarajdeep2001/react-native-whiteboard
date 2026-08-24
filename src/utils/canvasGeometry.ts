import { Point, BoundingBox, WhiteboardElement } from "@/types/whiteboard";

// ─── Coordinate conversion ────────────────────────────────────────────────────

/** Convert screen coords to canvas (world) coords */
export function screenToCanvas(
  sx: number,
  sy: number,
  translateX: number,
  translateY: number,
  scale: number
): Point {
  return {
    x: (sx - translateX) / scale,
    y: (sy - translateY) / scale,
  };
}

/** Convert canvas (world) coords to screen coords */
export function canvasToScreen(
  cx: number,
  cy: number,
  translateX: number,
  translateY: number,
  scale: number
): Point {
  return {
    x: cx * scale + translateX,
    y: cy * scale + translateY,
  };
}

// ─── Bounding boxes ───────────────────────────────────────────────────────────

export function getBoundingBox(el: WhiteboardElement): BoundingBox {
  switch (el.type) {
    case "pen": {
      if (el.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
      let minX = el.points[0].x,
        maxX = el.points[0].x,
        minY = el.points[0].y,
        maxY = el.points[0].y;
      for (const p of el.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = el.strokeWidth;
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    }
    case "rect":
      return {
        x: Math.min(el.x, el.x + el.w),
        y: Math.min(el.y, el.y + el.h),
        w: Math.abs(el.w),
        h: Math.abs(el.h),
      };
    case "circle":
      return {
        x: el.cx - el.r,
        y: el.cy - el.r,
        w: el.r * 2,
        h: el.r * 2,
      };
    case "line":
    case "arrow": {
      const pad = el.strokeWidth + 8;
      return {
        x: Math.min(el.x1, el.x2) - pad,
        y: Math.min(el.y1, el.y2) - pad,
        w: Math.abs(el.x2 - el.x1) + pad * 2,
        h: Math.abs(el.y2 - el.y1) + pad * 2,
      };
    }
    case "text":
      return {
        x: el.x,
        y: el.y - el.fontSize,
        w: Math.max(el.text.length * el.fontSize * 0.6, 40),
        h: el.fontSize * 1.4,
      };
    case "sticky":
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    case "image":
      return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
}

/** Check if a point is inside a bounding box */
export function pointInBox(p: Point, box: BoundingBox): boolean {
  return (
    p.x >= box.x &&
    p.x <= box.x + box.w &&
    p.y >= box.y &&
    p.y <= box.y + box.h
  );
}

/** Check if two bounding boxes intersect */
export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Get combined bounding box of a list of elements */
export function getCombinedBoundingBox(
  elements: WhiteboardElement[]
): BoundingBox | null {
  if (elements.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of elements) {
    const b = getBoundingBox(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ─── Arrow helpers ─────────────────────────────────────────────────────────────

export interface ArrowHeadPoints {
  left: Point;
  right: Point;
  tip: Point;
}

export function computeArrowHead(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 14
): ArrowHeadPoints {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 6; // 30 degrees
  return {
    tip: { x: x2, y: y2 },
    left: {
      x: x2 - size * Math.cos(angle - spread),
      y: y2 - size * Math.sin(angle - spread),
    },
    right: {
      x: x2 - size * Math.cos(angle + spread),
      y: y2 - size * Math.sin(angle + spread),
    },
  };
}

// ─── Smooth path from points ──────────────────────────────────────────────────

/** Build a smooth SVG-style path string from an array of points using cubic beziers */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) {
    if (points.length === 1) {
      return `M${points[0].x},${points[0].y} L${points[0].x + 0.1},${points[0].y}`;
    }
    return "";
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    d += ` Q${prev.x},${prev.y} ${mx},${my}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

// ─── Resize handle positions ──────────────────────────────────────────────────

export type HandlePosition =
  | "tl" | "tm" | "tr"
  | "ml" | "mr"
  | "bl" | "bm" | "br";

export interface ResizeHandle {
  pos: HandlePosition;
  x: number;
  y: number;
}

export function getResizeHandles(box: BoundingBox): ResizeHandle[] {
  const { x, y, w, h } = box;
  return [
    { pos: "tl", x, y },
    { pos: "tm", x: x + w / 2, y },
    { pos: "tr", x: x + w, y },
    { pos: "ml", x, y: y + h / 2 },
    { pos: "mr", x: x + w, y: y + h / 2 },
    { pos: "bl", x, y: y + h },
    { pos: "bm", x: x + w / 2, y: y + h },
    { pos: "br", x: x + w, y: y + h },
  ];
}
