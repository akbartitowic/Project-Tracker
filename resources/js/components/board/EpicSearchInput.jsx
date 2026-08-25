import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MIN_QUERY_LENGTH = 2;

export default function EpicSearchInput({
    value = '',
    onChange,
    options = [],
    placeholder,
    className,
    inputClassName,
    required = false,
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    const trimmed = value.trim();
    const queryReady = trimmed.length >= MIN_QUERY_LENGTH;

    const filteredOptions = useMemo(() => {
        if (!queryReady) return [];
        const q = trimmed.toLowerCase();
        return options
            .filter((opt) => opt.toLowerCase() !== q && opt.toLowerCase().includes(q))
            .slice(0, 20);
    }, [options, trimmed, queryReady]);

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const pick = (next) => {
        onChange(next);
        setOpen(false);
    };

    const showHint = open && value.length > 0 && !queryReady;
    const showResults = open && queryReady && filteredOptions.length > 0;

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <Input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        // Prevent submitting the surrounding task form — Enter here just
                        // confirms the typed value (new or existing) and closes the dropdown.
                        e.preventDefault();
                        setOpen(false);
                    } else if (e.key === 'Escape') {
                        setOpen(false);
                    }
                }}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
                className={inputClassName}
            />

            {showHint && (
                <p className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    Type at least {MIN_QUERY_LENGTH} characters to search existing epics
                </p>
            )}

            {showResults && (
                <ul
                    className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    role="listbox"
                >
                    {filteredOptions.map((opt) => (
                        <li key={opt}>
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => pick(opt)}
                            >
                                {opt}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
