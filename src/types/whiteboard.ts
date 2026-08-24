// ─── Tools ───────────────────────────────────────────────────────────────────

export type Tool =
  | "pen"
  | "eraser"
  | "rect"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "sticky"
  | "image"
  | "select";

// ─── Point ───────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

// ─── Element Union ────────────────────────────────────────────────────────────

export interface PenElement {
  type: "pen";
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
}

export interface RectElement {
  type: "rect";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  strokeWidth: number;
  fill?: string;
}

export interface CircleElement {
  type: "circle";
  id: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  strokeWidth: number;
  fill?: string;
}

export interface LineElement {
  type: "line";
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

export interface ArrowElement {
  type: "arrow";
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

export interface TextElement {
  type: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface StickyElement {
  type: "sticky";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  bgColor: string;
  textColor: string;
}

export interface ImageElement {
  type: "image";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  uri: string;
}

export type WhiteboardElement =
  | PenElement
  | RectElement
  | CircleElement
  | LineElement
  | ArrowElement
  | TextElement
  | StickyElement
  | ImageElement;

// ─── Viewport ─────────────────────────────────────────────────────────────────

export interface Viewport {
  translateX: number;
  translateY: number;
  scale: number;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  elements: WhiteboardElement[];
  viewport: Viewport;
  thumbnail?: string; // base64 PNG
}

// ─── Active Style (toolbar state) ─────────────────────────────────────────────

export interface ActiveStyle {
  color: string;
  strokeWidth: number;
  fontSize: number;
  stickyBgColor: string;
}

// ─── Element bounding box helper ─────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PALETTE_COLORS = [
  "#1a1a1a", // near-black
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#ffffff", // white
  "#94a3b8", // slate
] as const;

export const STICKY_COLORS: { label: string; bg: string; text: string }[] = [
  { label: "Yellow", bg: "#fef08a", text: "#713f12" },
  { label: "Pink", bg: "#fbcfe8", text: "#831843" },
  { label: "Blue", bg: "#bfdbfe", text: "#1e3a5f" },
  { label: "Green", bg: "#bbf7d0", text: "#14532d" },
  { label: "Purple", bg: "#e9d5ff", text: "#4a1d96" },
  { label: "Orange", bg: "#fed7aa", text: "#7c2d12" },
];

export const STROKE_WIDTHS = [2, 4, 6, 10, 16] as const;

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;
