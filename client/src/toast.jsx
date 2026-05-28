import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', durationMs = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((curr) => [...curr, { id, message, type }]);
    setTimeout(() => setToasts((curr) => curr.filter((t) => t.id !== id)), durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`px-4 py-3 rounded-xl border backdrop-blur-md animate-slide-up shadow-lg ${
              t.type === 'error'
                ? 'bg-red-500/15 border-red-400/40 text-red-100'
                : t.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                : 'bg-navy-100/80 border-white/15 text-white/90'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
