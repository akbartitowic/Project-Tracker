import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Handshake, Plus, ArrowLeft, Check, X } from 'lucide-react';

const STEPS = [
  { key: 'new_prospect', label: 'New Prospect' },
  { key: 'sent_compro', label: 'Sent Compro' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed', label: 'Closed' },
];

function formatDurationSeconds(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return '-';
  const s = Math.floor(Number(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt`;
}

export default function Sales() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pitchId } = useParams();
  const { user } = useAuth();
  const can = (slug) => hasPermission(user, slug);

  const isNewPitch = location.pathname === '/sales/pitch/new';
  const isWizard = isNewPitch || (pitchId && pitchId !== 'new');

  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'pipeline');
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pitch, setPitch] = useState(null);
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: '', message: '' });

  const [form, setForm] = useState({
    title: '',
    prospect_name: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    notes: '',
    lead_started_at: '',
  });

  const showFeedback = (title, message) => setFeedback({ open: true, title, message });

  const loadList = useCallback(async () => {
    if (isWizard) return;
    setLoadingList(true);
    try {
      const res = await fetchAPI(`/sales-pitches?tab=${encodeURIComponent(tab)}`);
      setList(res.data || []);
    } catch (e) {
      showFeedback('Gagal memuat', e.message);
    } finally {
      setLoadingList(false);
    }
  }, [tab, isWizard]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('tab');
    if (!isWizard && q && ['pipeline', 'win', 'lost'].includes(q)) {
      setTab(q);
    }
  }, [location.search, isWizard]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadPitch = useCallback(async () => {
    if (!pitchId || isNewPitch) {
      setPitch(null);
      return;
    }
    setLoadingPitch(true);
    try {
      const res = await fetchAPI(`/sales-pitches/${pitchId}`);
      const p = res.data;
      setPitch(p);
      setForm({
        title: p.title || '',
        prospect_name: p.prospect_name || '',
        company_name: p.company_name || '',
        email: p.email || '',
        phone: p.phone || '',
        estimated_value: p.estimated_value != null ? String(p.estimated_value) : '',
        notes: p.notes || '',
        lead_started_at: p.lead_started_at ? String(p.lead_started_at).slice(0, 16) : '',
      });
    } catch (e) {
      showFeedback('Gagal memuat pitch', e.message);
      navigate('/sales');
    } finally {
      setLoadingPitch(false);
    }
  }, [pitchId, isNewPitch, navigate]);

  useEffect(() => {
    loadPitch();
  }, [loadPitch]);

  const currentStepKey = pitch?.current_step || 'new_prospect';

  const goTab = (next) => {
    setTab(next);
    navigate(`/sales?tab=${next}`);
  };

  const createPitch = async (e) => {
    e.preventDefault();
    if (!can('sales.create')) {
      showFeedback('Akses ditolak', 'Anda tidak punya izin membuat pitch.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI('/sales-pitches', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          prospect_name: form.prospect_name,
          company_name: form.company_name || null,
          email: form.email || null,
          phone: form.phone || null,
          estimated_value: form.estimated_value !== '' ? Number(form.estimated_value) : null,
          notes: form.notes || null,
          lead_started_at: form.lead_started_at || null,
        }),
      });
      if (res.id) {
        navigate(`/sales/pitch/${res.id}`, { replace: true });
      }
    } catch (e) {
      showFeedback('Gagal membuat', e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async () => {
    if (!pitch?.id) return;
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: form.title,
          prospect_name: form.prospect_name,
          company_name: form.company_name || null,
          email: form.email || null,
          phone: form.phone || null,
          estimated_value: form.estimated_value !== '' ? Number(form.estimated_value) : null,
          notes: form.notes || null,
          lead_started_at: form.lead_started_at || null,
        }),
      });
      await loadPitch();
      showFeedback('Tersimpan', 'Detail pitch berhasil disimpan.');
    } catch (e) {
      showFeedback('Gagal simpan', e.message);
    } finally {
      setSaving(false);
    }
  };

  const setStep = async (key) => {
    if (!pitch?.id) return;
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ current_step: key }),
      });
      await loadPitch();
    } catch (e) {
      showFeedback('Gagal ubah step', e.message);
    } finally {
      setSaving(false);
    }
  };

  const finalizeOutcome = async (outcome) => {
    if (!pitch?.id) return;
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ outcome }),
      });
      showFeedback('Berhasil', outcome === 'win' ? 'Pitch ditandai sebagai Win.' : 'Pitch ditandai sebagai Lost.');
      navigate('/sales?tab=' + (outcome === 'win' ? 'win' : 'lost'));
    } catch (e) {
      showFeedback('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === currentStepKey), [currentStepKey]);

  if (isWizard) {
    if (!isNewPitch && pitchId && loadingPitch) {
      return <div className="p-6 text-slate-500">Memuat pitch...</div>;
    }

    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/sales')}>
            <ArrowLeft className="size-4 mr-1" />
            Kembali
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{isNewPitch ? 'New Pitch' : 'Detail Pitch'}</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Step bisa diloncat sesuai kondisi. Simpan detail secara berkala. Pada step Closed, pilih Win atau Lost untuk menutup siklus.
          </p>
        </div>

        {!isNewPitch && pitch && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {STEPS.map((s, idx) => {
                  const active = s.key === currentStepKey;
                  const done = stepIndex > idx;
                  return (
                    <Button
                      key={s.key}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : done ? 'secondary' : 'outline'}
                      disabled={!can('sales.update') || !!pitch.outcome}
                      onClick={() => setStep(s.key)}
                    >
                      {idx + 1}. {s.label}
                    </Button>
                  );
                })}
              </div>
              {pitch.outcome && (
                <Badge className={pitch.outcome === 'win' ? 'bg-emerald-600' : 'bg-rose-600'}>
                  {pitch.outcome === 'win' ? 'Win' : 'Lost'}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isNewPitch ? 'Data awal lead' : 'Detail pitch'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={isNewPitch ? createPitch : (e) => { e.preventDefault(); saveDetails(); }}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Judul pitch</span>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Nama prospek</span>
                  <Input value={form.prospect_name} onChange={(e) => setForm((p) => ({ ...p, prospect_name: e.target.value }))} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Perusahaan</span>
                  <Input value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Estimasi nilai (opsional)</span>
                  <Input type="number" min="0" value={form.estimated_value} onChange={(e) => setForm((p) => ({ ...p, estimated_value: e.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Email</span>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Telepon</span>
                  <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Mulai lead (opsional, default sekarang)</span>
                <Input type="datetime-local" value={form.lead_started_at} onChange={(e) => setForm((p) => ({ ...p, lead_started_at: e.target.value }))} />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Catatan</span>
                <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={4} />
              </label>
              <div className="flex gap-2">
                {isNewPitch ? (
                  <Button type="submit" disabled={saving || !can('sales.create')}>
                    {saving ? 'Menyimpan...' : 'Buat pitch'}
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving || !can('sales.update') || !!pitch?.outcome}>
                    {saving ? 'Menyimpan...' : 'Simpan detail'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {!isNewPitch && pitch && currentStepKey === 'closed' && !pitch.outcome && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Closed — pilih hasil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || !can('sales.update')} onClick={() => finalizeOutcome('win')}>
                <Check className="size-4 mr-2" />
                Win
              </Button>
              <Button type="button" variant="destructive" disabled={saving || !can('sales.update')} onClick={() => finalizeOutcome('lost')}>
                <X className="size-4 mr-2" />
                Lost
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={feedback.open} onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{feedback.title}</DialogTitle>
              <DialogDescription>{feedback.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => setFeedback((f) => ({ ...f, open: false }))}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sales</h1>
          <p className="text-slate-500 mt-1 text-sm">Pitching: lacak durasi dari lead hingga closed. Win / Lost dipisah per tab.</p>
        </div>
        {can('sales.create') && (
          <Button onClick={() => navigate('/sales/pitch/new')}>
            <Plus className="size-4 mr-2" />
            New Pitch
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'win', label: 'Project Win' },
          { id: 'lost', label: 'Project Lost' },
        ].map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => goTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar pitch</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <p className="text-slate-500">Loading...</p>
          ) : list.length === 0 ? (
            <p className="text-slate-500">Belum ada data pada tab ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 pr-4">Judul</th>
                    <th className="py-2 pr-4">Prospek</th>
                    <th className="py-2 pr-4">Step</th>
                    <th className="py-2 pr-4">Durasi</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4">{row.prospect_name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{STEPS.find((s) => s.key === row.current_step)?.label || row.current_step}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {row.outcome
                          ? formatDurationSeconds(row.duration_seconds_closed)
                          : formatDurationSeconds(row.duration_seconds_open)}
                        <span className="block text-[10px] text-slate-400">
                          {row.outcome ? 'Lead → closed' : 'Sejak mulai lead'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/sales/pitch/${row.id}`)}>
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
