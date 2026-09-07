import { useState, useCallback } from 'react';

export function useUndoRedo<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [canUndo, past, present, future]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [canRedo, future, past, present]);

  const set = useCallback(
    (newPresent: T | ((curr: T) => T)) => {
      setPresent((curr) => {
        const resolved = typeof newPresent === 'function' ? (newPresent as (c: T) => T)(curr) : newPresent;
        if (JSON.stringify(curr) === JSON.stringify(resolved)) {
          return curr;
        }
        setPast((p) => [...p, curr]);
        setFuture([]);
        return resolved;
      });
    },
    []
  );

  const reset = useCallback((newState: T) => {
    setPast([]);
    setPresent(newState);
    setFuture([]);
  }, []);

  return {
    state: present,
    setState: set,
    resetState: reset,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
