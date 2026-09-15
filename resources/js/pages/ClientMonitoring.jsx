import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import ManhourBucketBreakdown from '@/components/ManhourBucketBreakdown';
import { ArrowLeft, Building2, FileText } from 'lucide-react';

const formatHours = (value) => {
    const num = Number(value || 0);
    return Number.isInteger(num) ? `${num}` : num.toFixed(1);
};

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function ConsumedBar({ consumedPct }) {
    const pct = Math.min(100, Number(consumedPct || 0));
    const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function CompanySummary({ summary, onOpenProject }) {
    const { company, totals, projects } = summary;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle>{company?.name || 'Your Company'}</CardTitle>
                    </div>
                    <CardDescription>Manhour quota bought vs. used across all your projects.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Total Quota</p>
                            <p className="text-2xl font-bold mt-1">{formatHours(totals.quota_hours)}h</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Used</p>
                            <p className="text-2xl font-bold mt-1">{formatHours(totals.consumed_hours)}h</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Remaining</p>
                            <p className="text-2xl font-bold mt-1">{formatHours(totals.remaining_hours)}h</p>
                        </div>
                    </div>
                    <ConsumedBar consumedPct={totals.consumed_pct} />
                    <p className="text-xs text-slate-500 mt-1">{totals.consumed_pct}% of total quota used</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Projects</CardTitle>
                    <CardDescription>Click a project to see its role-by-role breakdown and top-up history.</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No projects found for your account yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {projects.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => onOpenProject(p.id)}
                                    className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div>
                                            <p className="font-medium">{p.name}</p>
                                            <p className="text-xs text-slate-500">{p.methodology} &middot; {p.status}</p>
                                        </div>
                                        <Badge variant="outline">{p.consumed_pct}% used</Badge>
                                    </div>
                                    <ConsumedBar consumedPct={p.consumed_pct} />
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatHours(p.consumed_hours)}h used of {formatHours(p.quota_hours)}h ({formatHours(p.remaining_hours)}h remaining)
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ProjectDetail({ detail, onBack }) {
    const { project, roles, meta, change_requests: changeRequests } = detail;
    const hasTopup = Number(meta?.totals?.topup_total_manhours || 0) > 0;

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Back to summary
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                        {project.methodology} &middot; {project.status} &middot; {formatDate(project.start_date)} – {formatDate(project.end_date)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ManhourBucketBreakdown
                        buckets={meta.manhour_buckets}
                        overflowHours={meta.mh_overflow_hours}
                        hasTopup={hasTopup}
                    />
                </CardContent>
            </Card>

            {roles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">By Role</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {roles.map((role) => (
                            <div key={role.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium">{role.role_name}</p>
                                    <Badge variant={role.is_active ? 'outline' : 'secondary'}>
                                        {role.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <ManhourBucketBreakdown
                                    buckets={role.manhour_buckets}
                                    overflowHours={0}
                                    hasTopup={Number(role.topup_hours || 0) > 0}
                                    compact
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Top-Up &amp; Change Request History</CardTitle>
                    </div>
                    <CardDescription>Top-ups are shown in the quota breakdown above; change requests are listed below.</CardDescription>
                </CardHeader>
                <CardContent>
                    {changeRequests.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">No change requests recorded.</p>
                    ) : (
                        <div className="space-y-2">
                            {changeRequests.map((cr) => (
                                <div key={cr.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm">{cr.cr_feature || 'Change Request'}</p>
                                        <span className="text-xs text-slate-500">{formatDate(cr.cr_date)}</span>
                                    </div>
                                    {cr.description && (
                                        <p className="text-xs text-slate-500 mt-1">{cr.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ClientMonitoring() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadSummary = useCallback(async () => {
        try {
            const res = await fetchAPI('/client-monitoring/summary');
            setSummary(res.data);
        } catch (err) {
            setError(err.message || 'Failed to load company summary.');
        }
    }, []);

    const loadDetail = useCallback(async (id) => {
        try {
            const res = await fetchAPI(`/client-monitoring/projects/${id}`);
            setDetail(res.data);
        } catch (err) {
            setError(err.message || 'Failed to load project detail.');
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            loadSummary(),
            projectId ? loadDetail(projectId) : Promise.resolve(setDetail(null)),
        ]).finally(() => setLoading(false));
    }, [projectId, loadSummary, loadDetail]);

    if (loading) {
        return <div className="py-20 text-center text-slate-500">Loading...</div>;
    }

    if (error) {
        return <div className="py-20 text-center text-rose-500">{error}</div>;
    }

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Client Monitoring</h1>
            {projectId && detail ? (
                <ProjectDetail detail={detail} onBack={() => navigate('/client-monitoring')} />
            ) : (
                summary && <CompanySummary summary={summary} onOpenProject={(id) => navigate(`/client-monitoring/${id}`)} />
            )}
        </div>
    );
}
