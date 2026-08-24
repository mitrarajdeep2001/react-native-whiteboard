import AsyncStorage from "@react-native-async-storage/async-storage";
import { Board, Viewport, WhiteboardElement } from "@/types/whiteboard";

// ─── Key helpers ─────────────────────────────────────────────────────────────

const INDEX_KEY = "boards_index";
const boardKey = (id: string) => `board_${id}`;

// ─── Default viewport ─────────────────────────────────────────────────────────

const defaultViewport = (): Viewport => ({
  translateX: 0,
  translateY: 0,
  scale: 1,
});

// ─── ID generator ─────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Load all board summaries (index only) ────────────────────────────────────

export async function loadBoardIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ─── Save board index ─────────────────────────────────────────────────────────

async function saveBoardIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

// ─── Load a single board ──────────────────────────────────────────────────────

export async function loadBoard(id: string): Promise<Board | null> {
  try {
    const raw = await AsyncStorage.getItem(boardKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as Board;
  } catch {
    return null;
  }
}

// ─── Load all boards (full data) ──────────────────────────────────────────────

export async function loadAllBoards(): Promise<Board[]> {
  try {
    const ids = await loadBoardIndex();
    if (ids.length === 0) return [];

    const pairs = await AsyncStorage.multiGet(ids.map(boardKey));
    const boards: Board[] = [];
    for (const [, raw] of pairs) {
      if (raw) {
        try {
          boards.push(JSON.parse(raw) as Board);
        } catch {
          // skip corrupt entry
        }
      }
    }
    // Sort newest first
    return boards.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

// ─── Create a new board ───────────────────────────────────────────────────────

export async function createBoard(name: string): Promise<Board> {
  const now = Date.now();
  const board: Board = {
    id: generateId(),
    name: name.trim() || "Untitled Board",
    createdAt: now,
    updatedAt: now,
    elements: [],
    viewport: defaultViewport(),
  };

  const ids = await loadBoardIndex();
  ids.unshift(board.id); // newest first
  await Promise.all([
    AsyncStorage.setItem(boardKey(board.id), JSON.stringify(board)),
    saveBoardIndex(ids),
  ]);

  return board;
}

// ─── Save / update a board ────────────────────────────────────────────────────

export async function saveBoard(board: Board): Promise<void> {
  const updated = { ...board, updatedAt: Date.now() };
  await AsyncStorage.setItem(boardKey(board.id), JSON.stringify(updated));
}

// ─── Rename a board ───────────────────────────────────────────────────────────

export async function renameBoard(id: string, name: string): Promise<Board | null> {
  const board = await loadBoard(id);
  if (!board) return null;
  const updated: Board = {
    ...board,
    name: name.trim() || "Untitled Board",
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(boardKey(id), JSON.stringify(updated));
  return updated;
}

// ─── Delete a board ───────────────────────────────────────────────────────────

export async function deleteBoard(id: string): Promise<void> {
  const ids = await loadBoardIndex();
  const newIds = ids.filter((i) => i !== id);
  await Promise.all([
    AsyncStorage.removeItem(boardKey(id)),
    saveBoardIndex(newIds),
  ]);
}

// ─── Update board elements (called during auto-save) ─────────────────────────

export async function updateBoardElements(
  id: string,
  elements: WhiteboardElement[],
  viewport: Viewport,
  thumbnail?: string
): Promise<void> {
  const board = await loadBoard(id);
  if (!board) return;
  const updated: Board = {
    ...board,
    elements,
    viewport,
    updatedAt: Date.now(),
    ...(thumbnail !== undefined ? { thumbnail } : {}),
  };
  await AsyncStorage.setItem(boardKey(id), JSON.stringify(updated));
}
