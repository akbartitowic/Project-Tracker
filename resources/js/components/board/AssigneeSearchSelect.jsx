import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const UNASSIGNED = 'Unassigned';
const MIN_QUERY_LENGTH = 2;

export default function AssigneeSearchSelect({
    value = UNASSIGNED,
    onChange,
    options = [],
    placeholder = 'Cari nama atau role...',
    className,
    inputClassName,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);

    const selected = useMemo(() => {
        if (!value || value === UNASSIGNED) return null;
        return options.find((o) => String(o.id) === String(value)) ?? null;
    }, [value, options]);

    const trimmedQuery = query.trim();
    const queryReady = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const filteredOptions = useMemo(() => {
        if (!queryReady) return [];
        const q = trimmedQuery.toLowerCase();
        return options
            .filter((o) => o.label.toLowerCase().includes(q))
            .slice(0, 80);
    }, [options, trimmedQuery, queryReady]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const pick = (next) => {
        onChange(next);
        setOpen(false);
        setQuery('');
    };

    const inputDisplay = open ? query : (selected?.label || UNASSIGNED);
    const showHint = open && trimmedQuery.length > 0 && !queryReady;
    const showResults = open && queryReady;

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={inputDisplay}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => {
                        setOpen(true);
                        setQuery('');
                    }}
                    className={cn('h-9 pl-9 pr-9', inputClassName)}
                    autoComplete="off"
                />
                {value && value !== UNASSIGNED && (
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        onClick={() => pick(UNASSIGNED)}
                        aria-label="Clear assignee"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {showHint && (
                <p className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    Ketik minimal {MIN_QUERY_LENGTH} karakter untuk mencari assignee
                </p>
            )}

            {showResults && (
                <ul
                    className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    role="listbox"
                >
                    <li>
                        <button
                            type="button"
                            className={cn(
                                'w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                                value === UNASSIGNED && 'bg-primary/10 font-medium text-primary',
                            )}
                            onClick={() => pick(UNASSIGNED)}
                        >
                            Unassigned
                        </button>
                    </li>
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-500">Tidak ada hasil</li>
                    ) : (
                        filteredOptions.map((opt) => (
                            <li key={opt.id}>
                                <button
                                    type="button"
                                    className={cn(
                                        'w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                                        String(value) === String(opt.id) && 'bg-primary/10 font-medium text-primary',
                                    )}
                                    onClick={() => pick(String(opt.id))}
                                >
                                    {opt.label}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
