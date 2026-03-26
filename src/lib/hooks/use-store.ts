"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const storedValueRef = useRef<T>(storedValue);

  // Keep ref in sync with state
  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
        storedValueRef.current = parsed;
      }
    } catch {
      // Corrupted data — clear the key so next load starts fresh
      try { window.localStorage.removeItem(key); } catch {}
    }
    setReady(true);
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
      setStoredValue(valueToStore);
      storedValueRef.current = valueToStore;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        console.warn(`[useLocalStorage] QuotaExceededError: cannot write key "${key}". localStorage is full.`);
      }
    }
  }, [key]);

  return { value: storedValue, setValue, ready };
}
