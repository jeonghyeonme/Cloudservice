import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const TOAST_DURATION_MS = 3200;

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.type}`}>
          <div className="toast-card-body">
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button
            type="button"
            className="toast-dismiss-button"
            onClick={() => onDismiss(toast.id)}
            aria-label="알림 닫기"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({ type = "info", title, message, duration = TOAST_DURATION_MS }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((prev) => [...prev, { id, type, title, message }]);

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, duration);

    timeoutsRef.current.set(id, timeoutId);
    return id;
  }, [dismissToast]);

  const value = useMemo(
    () => ({
      showToast,
      success: (title, message) => showToast({ type: "success", title, message }),
      error: (title, message) => showToast({ type: "error", title, message }),
      info: (title, message) => showToast({ type: "info", title, message }),
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
