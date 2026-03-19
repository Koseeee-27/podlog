"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  型定義                                                             */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 任意のコンポーネントからトーストを呼び出すためのフック。
 *
 * 使い方:
 * ```ts
 * const { showToast } = useToast();
 * showToast("保存しました");           // 成功（デフォルト）
 * showToast("エラーが発生しました", "error");
 * ```
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast は ToastProvider の内側で使用してください");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = String(++nextId);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* トースト表示エリア — ボトムナビ (h-14 + safe-area) の上に配置 */}
      <div
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  個別トースト                                                       */
/* ------------------------------------------------------------------ */

const TOAST_DURATION = 3000;

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
  info: "bg-blue-500 text-white",
};

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // マウント直後に表示アニメーション
    const frame = requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      setVisible(false);
      // フェードアウト完了後に DOM から除去
      setTimeout(() => onDismiss(toast.id), 200);
    }, TOAST_DURATION);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${typeStyles[toast.type]}`}
    >
      {toast.message}
    </div>
  );
}
