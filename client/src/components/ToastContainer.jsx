import useToast from '../hooks/useToast.js';

const typeStyles = {
  success: 'bg-green-600 border-green-500',
  error: 'bg-red-600 border-red-500',
  info: 'bg-blue-600 border-blue-500',
  warning: 'bg-yellow-600 border-yellow-500',
};

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-white text-sm animate-slide-in ${typeStyles[toast.type] || typeStyles.info}`}
        >
          <span className="text-lg">{typeIcons[toast.type] || typeIcons.info}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
