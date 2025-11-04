"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { Toast } from "@/components/Toast";

export type ToastIntent = "default" | "success" | "error";

export interface ToastPayload {
  title?: string;
  description?: string;
  intent?: ToastIntent;
  duration?: number;
}

interface ToastRecord extends ToastPayload {
  id: number;
}

interface ToastContextValue {
  push: (payload: ToastPayload) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const idRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ duration = 4000, intent = "default", ...rest }: ToastPayload) => {
      const id = idRef.current++;
      setItems((current) => [
        ...current,
        {
          id,
          intent,
          duration,
          ...rest,
        },
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex items-end justify-center sm:items-center sm:justify-end sm:px-6">
        <div className="flex w-full flex-col items-stretch gap-3 sm:max-w-sm">
          {items.map(({ id, intent, title, description }) => (
            <div key={id} className="pointer-events-auto">
              <Toast
                title={title}
                description={description}
                variant={intent === "error" ? "error" : intent === "success" ? "success" : "default"}
                onDismiss={() => dismiss(id)}
              />
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
