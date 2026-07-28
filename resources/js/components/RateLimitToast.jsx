import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export const RATE_LIMIT_EVENT = 'ratelimit:show';

export default function RateLimitToast() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        function handleShow(e) {
            const { message, retryAfter } = e.detail || {};
            setToast({ message, retryAfter: retryAfter || 0 });
        }
        window.addEventListener(RATE_LIMIT_EVENT, handleShow);
        return () => window.removeEventListener(RATE_LIMIT_EVENT, handleShow);
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        if (!toast.retryAfter) {
            const hide = setTimeout(() => setToast(null), 6000);
            return () => clearTimeout(hide);
        }
        const tick = setInterval(() => {
            setToast((prev) => {
                if (!prev) return prev;
                if (prev.retryAfter <= 1) return null;
                return { ...prev, retryAfter: prev.retryAfter - 1 };
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [toast?.message]);

    if (!toast) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-[340px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#151b28] p-4 shadow-lg shadow-black/30">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Clock className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">Terlalu banyak permintaan</p>
                    <p className="mt-1 text-xs text-slate-400">
                        {toast.message || 'Silakan tunggu sebentar sebelum mencoba lagi.'}
                    </p>
                    {toast.retryAfter > 0 && (
                        <p className="mt-1.5 text-[11px] font-medium text-accent">
                            Coba lagi dalam {toast.retryAfter} detik
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setToast(null)}
                    className="shrink-0 text-slate-500 hover:text-slate-300 text-lg leading-none"
                    aria-label="Tutup"
                >
                    &times;
                </button>
            </div>
        </div>
    );
}
