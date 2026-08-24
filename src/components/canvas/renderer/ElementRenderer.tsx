import { WhiteboardElement } from "@/types/whiteboard";
import { computeArrowHead, smoothPath } from "@/utils/canvasGeometry";
import {
    Group,
    Path,
    RoundedRect,
    Skia,
    Circle as SkiaCircle,
    Image as SkiaImage,
    Line as SkiaLine,
    Rect as SkiaRect,
    Text as SkiaText,
    useFont,
    useImage
} from "@shopify/react-native-skia";

// Shared font asset — works on both native and web
const INTER_FONT = require("../../../../assets/fonts/Inter-Regular.ttf");

// ─── Individual element renderers ─────────────────────────────────────────────

function PenRenderer({ el }: { el: Extract<WhiteboardElement, { type: "pen" }> }) {
  const pathStr = smoothPath(el.points);
  if (!pathStr) return null;
  const path = Skia.Path.MakeFromSVGString(pathStr);
  if (!path) return null;
  return (
    <Path
      path={path}
      color={el.color}
      style="stroke"
      strokeWidth={el.strokeWidth}
      strokeCap="round"
      strokeJoin="round"
      antiAlias
    />
  );
}

function RectRenderer({ el }: { el: Extract<WhiteboardElement, { type: "rect" }> }) {
  const x = Math.min(el.x, el.x + el.w);
  const y = Math.min(el.y, el.y + el.h);
  const w = Math.abs(el.w);
  const h = Math.abs(el.h);
  return (
    <>
      {el.fill && (
        <SkiaRect x={x} y={y} width={w} height={h} color={el.fill} />
      )}
      <SkiaRect
        x={x}
        y={y}
        width={w}
        height={h}
        color={el.color}
        style="stroke"
        strokeWidth={el.strokeWidth}
      />
    </>
  );
}

function CircleRenderer({ el }: { el: Extract<WhiteboardElement, { type: "circle" }> }) {
  return (
    <>
      {el.fill && (
        <SkiaCircle cx={el.cx} cy={el.cy} r={el.r} color={el.fill} />
      )}
      <SkiaCircle
        cx={el.cx}
        cy={el.cy}
        r={el.r}
        color={el.color}
        style="stroke"
        strokeWidth={el.strokeWidth}
      />
    </>
  );
}

function LineRenderer({ el }: { el: Extract<WhiteboardElement, { type: "line" }> }) {
  return (
    <SkiaLine
      p1={{ x: el.x1, y: el.y1 }}
      p2={{ x: el.x2, y: el.y2 }}
      color={el.color}
      strokeWidth={el.strokeWidth}
      strokeCap="round"
    />
  );
}

function ArrowRenderer({ el }: { el: Extract<WhiteboardElement, { type: "arrow" }> }) {
  const head = computeArrowHead(el.x1, el.y1, el.x2, el.y2, 14 + el.strokeWidth);
  const headPathStr = `M${head.left.x},${head.left.y} L${head.tip.x},${head.tip.y} L${head.right.x},${head.right.y}`;
  const headPath = Skia.Path.MakeFromSVGString(headPathStr);
  return (
    <>
      <SkiaLine
        p1={{ x: el.x1, y: el.y1 }}
        p2={{ x: el.x2, y: el.y2 }}
        color={el.color}
        strokeWidth={el.strokeWidth}
        strokeCap="round"
      />
      {headPath && (
        <Path
          path={headPath}
          color={el.color}
          style="stroke"
          strokeWidth={el.strokeWidth}
          strokeCap="round"
          strokeJoin="round"
        />
      )}
    </>
  );
}

function TextRenderer({ el }: { el: Extract<WhiteboardElement, { type: "text" }> }) {
  const font = useFont(INTER_FONT, el.fontSize);
  if (!font) return null;
  return (
    <SkiaText
      x={el.x}
      y={el.y}
      text={el.text}
      font={font}
      color={el.color}
    />
  );
}

function StickyRenderer({ el }: { el: Extract<WhiteboardElement, { type: "sticky" }> }) {
  const font = useFont(INTER_FONT, 14);
  const padding = 10;
  const lineHeight = 18;

  // Simple word-wrap
  const words = el.text.split(" ");
  const lines: string[] = [];
  let current = "";
  const maxCharsPerLine = Math.floor((el.w - padding * 2) / 8.5);
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());

  return (
    <Group>
      <RoundedRect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        r={8}
        color={el.bgColor}
      />
      {/* Subtle shadow line at top */}
      <RoundedRect
        x={el.x}
        y={el.y}
        width={el.w}
        height={4}
        r={8}
        color="rgba(0,0,0,0.08)"
      />
      {font &&
        lines.slice(0, Math.floor((el.h - padding * 2) / lineHeight)).map((line, i) => (
          <SkiaText
            key={i}
            x={el.x + padding}
            y={el.y + padding + 14 + i * lineHeight}
            text={line}
            font={font}
            color={el.textColor}
          />
        ))}
    </Group>
  );
}

function ImageRenderer({ el }: { el: Extract<WhiteboardElement, { type: "image" }> }) {
  const image = useImage(el.uri);
  if (!image) return null;
  return (
    <SkiaImage
      image={image}
      x={el.x}
      y={el.y}
      width={el.w}
      height={el.h}
      fit="contain"
    />
  );
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

interface Props {
  element: WhiteboardElement;
}

export function ElementRenderer({ element }: Props) {
  switch (element.type) {
    case "pen":
      return <PenRenderer el={element} />;
    case "rect":
      return <RectRenderer el={element} />;
    case "circle":
      return <CircleRenderer el={element} />;
    case "line":
      return <LineRenderer el={element} />;
    case "arrow":
      return <ArrowRenderer el={element} />;
    case "text":
      return <TextRenderer el={element} />;
    case "sticky":
      return <StickyRenderer el={element} />;
    case "image":
      return <ImageRenderer el={element} />;
  }
}
