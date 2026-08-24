import { WhiteboardElement } from "@/types/whiteboard";
import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 30;

interface UseElementManagerResult {
  elements: WhiteboardElement[];
  setElements: (elements: WhiteboardElement[]) => void;
  addElement: (el: WhiteboardElement) => void;
  updateElement: (id: string, patch: Partial<WhiteboardElement>) => void;
  deleteElements: (ids: string[]) => void;
  replaceElements: (elements: WhiteboardElement[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useElementManager(
  initial: WhiteboardElement[] = []
): UseElementManagerResult {
  const [elements, setElementsState] = useState<WhiteboardElement[]>(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // History stacks — store snapshots of element arrays
  const past = useRef<WhiteboardElement[][]>([]);
  const future = useRef<WhiteboardElement[][]>([]);

  const syncFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  // Push current state to history before a change
  const pushHistory = useCallback(
    (current: WhiteboardElement[]) => {
      past.current = [...past.current.slice(-MAX_HISTORY + 1), current];
      future.current = []; // clear redo stack on new action
      syncFlags();
    },
    [syncFlags]
  );

  const setElements = useCallback(
    (next: WhiteboardElement[]) => {
      setElementsState((cur) => {
        pushHistory(cur);
        return next;
      });
    },
    [pushHistory]
  );

  const addElement = useCallback(
    (el: WhiteboardElement) => {
      setElementsState((cur) => {
        pushHistory(cur);
        return [...cur, el];
      });
    },
    [pushHistory]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<WhiteboardElement>) => {
      setElementsState((cur) => {
        pushHistory(cur);
        return cur.map((el) =>
          el.id === id ? ({ ...el, ...patch } as WhiteboardElement) : el
        );
      });
    },
    [pushHistory]
  );

  const deleteElements = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setElementsState((cur) => {
        pushHistory(cur);
        return cur.filter((el) => !idSet.has(el.id));
      });
    },
    [pushHistory]
  );

  const replaceElements = useCallback((next: WhiteboardElement[]) => {
    setElementsState(next);
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    setElementsState((cur) => {
      future.current = [cur, ...future.current.slice(0, MAX_HISTORY - 1)];
      syncFlags();
      return prev;
    });
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    setElementsState((cur) => {
      past.current = [...past.current.slice(-MAX_HISTORY + 1), cur];
      syncFlags();
      return next;
    });
  }, [syncFlags]);

  return {
    elements,
    setElements,
    addElement,
    updateElement,
    deleteElements,
    replaceElements,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
