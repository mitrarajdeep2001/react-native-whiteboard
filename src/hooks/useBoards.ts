import { useState, useEffect, useCallback } from "react";
import { Board } from "@/types/whiteboard";
import {
  loadAllBoards,
  createBoard as storeCreateBoard,
  deleteBoard as storeDeleteBoard,
  renameBoard as storeRenameBoard,
} from "@/store/boardStore";

interface UseBoardsResult {
  boards: Board[];
  loading: boolean;
  createBoard: (name: string) => Promise<Board>;
  deleteBoard: (id: string) => Promise<void>;
  renameBoard: (id: string, name: string) => Promise<void>;
  refreshBoards: () => Promise<void>;
}

export function useBoards(): UseBoardsResult {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshBoards = useCallback(async () => {
    const all = await loadAllBoards();
    setBoards(all);
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all = await loadAllBoards();
      if (!cancelled) {
        setBoards(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createBoard = useCallback(async (name: string): Promise<Board> => {
    const board = await storeCreateBoard(name);
    setBoards((prev) => [board, ...prev]);
    return board;
  }, []);

  const deleteBoard = useCallback(async (id: string): Promise<void> => {
    await storeDeleteBoard(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const renameBoard = useCallback(async (id: string, name: string): Promise<void> => {
    const updated = await storeRenameBoard(id, name);
    if (updated) {
      setBoards((prev) =>
        prev.map((b) => (b.id === id ? updated : b))
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    }
  }, []);

  return { boards, loading, createBoard, deleteBoard, renameBoard, refreshBoards };
}
