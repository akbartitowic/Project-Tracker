import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {total === 0 ? 'Tidak ada data' : `Menampilkan ${from}–${to} dari ${total}`}
            </p>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Per halaman</span>
                <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((s) => (
                            <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums min-w-[60px] text-center">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
