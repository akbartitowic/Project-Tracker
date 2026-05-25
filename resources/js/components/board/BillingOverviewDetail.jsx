import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBoardHours } from '../../utils/projectBoardMetrics';

function BillingTypeBadge({ billing }) {
    if (billing === 'mixed') {
        return (
            <Badge variant="outline" className="text-[9px] font-bold uppercase border-violet-300 text-violet-700 dark:text-violet-300">
                Mixed
            </Badge>
        );
    }
    if (billing === 'non-billable') {
        return (
            <Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border-slate-200">
                Non-billable
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-[9px] font-bold uppercase border-emerald-300 text-emerald-700 dark:text-emerald-300">
            Billable
        </Badge>
    );
}

function TaskLine({ row, showHours, onOpen }) {
    return (
        <button
            type="button"
            onClick={() => onOpen(row.kind === 'subtask' ? row.parentId : row.id)}
            className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    {row.featureTitle && (
                        <p className="text-[10px] font-bold text-primary uppercase truncate">{row.featureTitle}</p>
                    )}
                    {row.kind === 'subtask' && (
                        <p className="text-[10px] text-slate-400 truncate">↳ {row.parentTitle}</p>
                    )}
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-primary">
                        {row.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{row.status}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <BillingTypeBadge billing={row.billing} />
                    {showHours && row.hours > 0 && (
                        <span className="text-[10px] tabular-nums text-slate-500">{formatBoardHours(row.hours)}h</span>
                    )}
                    {showHours && row.billing === 'non-billable' && row.kind === 'task' && (
                        <span className="text-[10px] text-slate-400">—</span>
                    )}
                </div>
            </div>
        </button>
    );
}

function BillingSection({ title, count, accentClass, defaultOpen, children, emptyText }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left"
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    {title}
                </span>
                <span className={`text-sm font-bold tabular-nums ${accentClass}`}>{count}</span>
            </button>
            {open && (
                <div className="px-2 py-2 space-y-0.5 border-t border-slate-100 dark:border-slate-800 max-h-[220px] overflow-y-auto">
                    {children}
                    {count === 0 && (
                        <p className="text-xs text-slate-500 italic px-2 py-2">{emptyText}</p>
                    )}
                </div>
            )}
        </div>
    );
}

function ParentWithSubtasks({ parent, showHours, onOpen }) {
    return (
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 mb-2 last:mb-0 overflow-hidden">
            <TaskLine row={parent} showHours={showHours} onOpen={onOpen} />
            {parent.children?.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 pl-3 pr-1 py-1 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
                        Subtasks ({parent.children.length})
                    </p>
                    {parent.children.map((st) => (
                        <TaskLine key={st.id} row={st} showHours={showHours} onOpen={onOpen} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BillingOverviewDetail({ breakdown, summary, projectId, showHours = true }) {
    const navigate = useNavigate();
    const [detailOpen, setDetailOpen] = useState(false);

    const openTask = (taskId) => {
        if (taskId) navigate(`/board/${projectId}?task=${taskId}`);
    };

    return (
        <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Billable (task level)</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {summary.billableTaskCount}
                </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Non-billable (task level)</span>
                <span className="font-semibold">{summary.nonBillableTaskCount}</span>
            </div>
            {summary.mixedParentCount > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Mixed (billable + non-billable subtasks)</span>
                    <span className="font-semibold text-violet-700 dark:text-violet-300">
                        {summary.mixedParentCount}
                    </span>
                </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Billable subtasks</span>
                <span className="font-semibold">{summary.billableSubtasks}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Non-billable subtasks</span>
                <span className="font-semibold">{summary.nonBillableSubtasks}</span>
            </div>
            <p className="text-xs text-slate-500">
                Total billable hours (quota):{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                    {formatBoardHours(summary.billableHours)}h
                </strong>
            </p>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setDetailOpen((v) => !v)}
            >
                <span>{detailOpen ? 'Sembunyikan' : 'Tampilkan'} rincian task & subtask</span>
                {detailOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>

            {detailOpen && (
                <div className="space-y-3 pt-1">
                    <BillingSection
                        title="Billable"
                        count={breakdown.billable.length}
                        accentClass="text-emerald-700 dark:text-emerald-400"
                        defaultOpen
                        emptyText="Tidak ada task billable."
                    >
                        {breakdown.billable.map((parent) => (
                            <ParentWithSubtasks
                                key={parent.id}
                                parent={parent}
                                showHours={showHours}
                                onOpen={openTask}
                            />
                        ))}
                    </BillingSection>

                    <BillingSection
                        title="Non-billable"
                        count={breakdown.nonBillable.length}
                        accentClass="text-slate-600 dark:text-slate-400"
                        emptyText="Tidak ada task non-billable."
                    >
                        {breakdown.nonBillable.map((parent) => (
                            <ParentWithSubtasks
                                key={parent.id}
                                parent={parent}
                                showHours={showHours}
                                onOpen={openTask}
                            />
                        ))}
                    </BillingSection>

                    {breakdown.mixed.length > 0 && (
                        <BillingSection
                            title="Mixed billing"
                            count={breakdown.mixed.length}
                            accentClass="text-violet-700 dark:text-violet-300"
                            emptyText="Tidak ada task mixed."
                        >
                            {breakdown.mixed.map((parent) => (
                                <div key={parent.id} className="mb-3 last:mb-0">
                                    <ParentWithSubtasks
                                        parent={{ ...parent, billing: 'mixed' }}
                                        showHours={showHours}
                                        onOpen={openTask}
                                    />
                                    <p className="text-[10px] text-slate-500 px-2 mt-1">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            {parent.billableSubtasks?.length || 0} billable
                                        </span>
                                        {' · '}
                                        <span className="font-medium">
                                            {parent.nonBillableSubtasks?.length || 0} non-billable
                                        </span>
                                        {' '}subtask
                                    </p>
                                </div>
                            ))}
                        </BillingSection>
                    )}
                </div>
            )}
        </div>
    );
}
