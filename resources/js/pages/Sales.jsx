import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchAPI, getApiUrl } from '../services/api';
import QuotationEditorSection from '../components/sales/QuotationEditorSection';
import PitchOutcomeEditForm from '../components/sales/PitchOutcomeEditForm';
import {
  buildQuotationFromPitch,
  emptyQuotation,
  formatIdr,
  finalDealValueFromQuotation,
  quotationPayloadForApi,
  quotationTotal,
} from '../utils/salesQuotationDefaults';
import { buildOutcomeSummarySections } from '../utils/salesPitchSummary';
import { pitchToEditForm, editFormToApiPayload } from '../utils/salesPitchEditForm';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ArrowLeft, Check, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

const FK_NONE = '__none__';

const STEPS = [
  { key: 'new_prospect', label: 'New Prospect' },
  { key: 'sent_compro', label: 'Sent Compro' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed', label: 'Sign Off' },
];

function getWinRowKey(row) {
  if (row?.win_entry_type === 'presale' && row?.presale_id != null) {
    return `presale-${row.presale_id}`;
  }
  return String(row?.id ?? '');
}

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

/** YYYY-MM-DD in local timezone */
function getLocalDateYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Stored as 'yes' | 'no' in compro_url / proposal_url (legacy URL values → yes). */
function parseYesNoField(stored) {
  const v = String(stored ?? '').trim().toLowerCase();
  if (v === 'yes' || v === 'ya') return 'yes';
  if (v === 'no' || v === 'tidak') return 'no';
  if (!v) return '';
  return 'yes';
}

function formatYesNoLabel(sent) {
  if (sent === 'yes') return 'Ya';
  if (sent === 'no') return 'Tidak';
  return '';
}

function parseMeetingHasFromPitch(p) {
  if (!p) return '';
  if (p.meeting_mode === 'no') return 'no';
  if (p.meeting_at || p.meeting_mode === 'online' || p.meeting_mode === 'offline') return 'yes';
  return '';
}

function formatMeetingDateOnly(iso) {
  if (!iso) return '';
  const raw = String(iso).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return raw;
}

function buildMeetingPayload(form) {
  if (form.meeting_has === 'no') {
    return { meeting_at: null, meeting_location: null, meeting_mode: 'no' };
  }
  if (form.meeting_has === 'yes') {
    const date = (form.meeting_date || '').trim();
    const mode = form.meeting_mode !== FK_NONE ? form.meeting_mode : null;
    return {
      meeting_at: date || null,
      meeting_location: mode === 'offline' ? (form.meeting_location || '').trim() || null : null,
      meeting_mode: mode,
    };
  }
  return { meeting_at: null, meeting_location: null, meeting_mode: null };
}

export default function Sales() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [quotationPdfLoading, setQuotationPdfLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: '', message: '' });
  const [outcomeDialog, setOutcomeDialog] = useState({ open: false, mode: null, row: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, row: null, data: null, loading: false });
  const [pitchEditDialog, setPitchEditDialog] = useState({ open: false, row: null, data: null, loading: false });
  const [pitchEditForm, setPitchEditForm] = useState(() => pitchToEditForm(null));
  const [outcomeForm, setOutcomeForm] = useState({
    final_deal_value: '',
    estimated_value: '',
    company_id: FK_NONE,
    project_category_id: FK_NONE,
    sales_category_project_ids: [],
    email: '',
    phone: '',
    notes: '',
  });
  const [formOptions, setFormOptions] = useState({
    companies: [],
    company_categories: [],
    category_projects: [],
  });

  const [form, setForm] = useState({
    title: '',
    company_id: FK_NONE,
    project_category_id: FK_NONE,
    sales_category_project_ids: [],
    email: '',
    phone: '',
    estimated_value: '',
    final_deal_value: '',
    notes: '',
    lead_started_at: getLocalDateYmd(),
    compro_sent: '',
    proposal_sent: '',
    quotation_url: '',
    quotation: emptyQuotation(),
    meeting_has: '',
    meeting_date: '',
    meeting_location: '',
    meeting_mode: FK_NONE,
    negotiation_regenerate_quote: '',
  });

  const showFeedback = (title, message) => setFeedback({ open: true, title, message });

  const toFk = (v) => (v && v !== FK_NONE ? Number(v) : null);

  const toggleCategoryProject = (id) => {
    const sid = String(id);
    setForm((prev) => ({
      ...prev,
      sales_category_project_ids: prev.sales_category_project_ids.includes(sid)
        ? prev.sales_category_project_ids.filter((x) => x !== sid)
        : [...prev.sales_category_project_ids, sid],
    }));
  };

  const categoryProjectSummary = useMemo(() => {
    if (pitch?.category_project_name) {
      return pitch.category_project_name;
    }
    const names = form.sales_category_project_ids
      .map((id) => formOptions.category_projects.find((c) => String(c.id) === id)?.name)
      .filter(Boolean);
    return names.join(', ');
  }, [pitch?.category_project_name, form.sales_category_project_ids, formOptions.category_projects]);

  const loadFormOptions = useCallback(async () => {
    const res = await fetchAPI('/sales-pitches/form-options');
    setFormOptions({
      companies: res.companies || [],
      company_categories: res.company_categories || [],
      category_projects: res.category_projects || [],
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFormOptions();
      } catch (e) {
        if (!cancelled) showFeedback('Gagal memuat master data', e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFormOptions]);

  useEffect(() => {
    if (!isNewPitch) return;
    setForm({
      title: '',
      company_id: FK_NONE,
      project_category_id: FK_NONE,
      sales_category_project_ids: [],
      email: '',
      phone: '',
      estimated_value: '',
      final_deal_value: '',
      notes: '',
      lead_started_at: getLocalDateYmd(),
      compro_sent: '',
      proposal_sent: '',
      quotation_url: '',
      quotation: emptyQuotation(),
      meeting_has: '',
      meeting_date: '',
      meeting_location: '',
      meeting_mode: FK_NONE,
      negotiation_regenerate_quote: '',
    });
  }, [isNewPitch]);

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
        title: p.title || p.prospect_name || '',
        company_id: p.company_id != null ? String(p.company_id) : FK_NONE,
        project_category_id: p.project_category_id != null ? String(p.project_category_id) : FK_NONE,
        sales_category_project_ids: Array.isArray(p.sales_category_project_ids)
          ? p.sales_category_project_ids.map(String)
          : p.sales_category_project_id != null
            ? [String(p.sales_category_project_id)]
            : [],
        email: p.email || '',
        phone: p.phone || '',
        estimated_value: p.estimated_value != null ? String(p.estimated_value) : '',
        final_deal_value: p.final_deal_value != null ? String(p.final_deal_value) : '',
        notes: p.notes || '',
        lead_started_at: p.lead_started_at ? String(p.lead_started_at).slice(0, 10) : getLocalDateYmd(),
        compro_sent: parseYesNoField(p.compro_url),
        proposal_sent: parseYesNoField(p.proposal_url),
        quotation_url: p.quotation_url || '',
        quotation: buildQuotationFromPitch(p, p.quotation_data),
        meeting_has: parseMeetingHasFromPitch(p),
        meeting_date: p.meeting_at ? String(p.meeting_at).slice(0, 10) : '',
        meeting_location: p.meeting_location || '',
        meeting_mode: p.meeting_mode === 'online' || p.meeting_mode === 'offline' ? p.meeting_mode : FK_NONE,
        negotiation_regenerate_quote:
          p.quotation_data?.negotiation_regenerate_quote === 'yes' ||
          p.quotation_data?.negotiation_regenerate_quote === 'no'
            ? p.quotation_data.negotiation_regenerate_quote
            : '',
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

  const stepParamRaw = searchParams.get('step');
  const stepParam = stepParamRaw === 'meeting' ? 'presentation' : stepParamRaw;
  const currentStepKey = useMemo(() => {
    const rawReached = pitch?.current_step || 'new_prospect';
    const reachedKey = rawReached === 'meeting' ? 'presentation' : rawReached;
    const reachedIdx = STEPS.findIndex((s) => s.key === reachedKey);
    if (!stepParam) return reachedKey;
    const wantedIdx = STEPS.findIndex((s) => s.key === stepParam);
    // Only allow viewing valid steps that have already been reached.
    if (wantedIdx >= 0 && wantedIdx <= reachedIdx) return stepParam;
    return reachedKey;
  }, [pitch?.current_step, stepParam]);

  const goTab = (next) => {
    setTab(next);
    navigate(`/sales?tab=${next}`);
  };

  const createPitch = async (e, { asDraft = false } = {}) => {
    e?.preventDefault();
    if (!can('sales.create')) {
      showFeedback('Akses ditolak', 'Anda tidak punya izin membuat pitch.');
      return;
    }
    const nextStep = asDraft ? 'new_prospect' : 'sent_compro';
    setSaving(true);
    try {
      const res = await fetchAPI('/sales-pitches', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          prospect_name: form.title.trim(),
          company_id: toFk(form.company_id),
          project_category_id: toFk(form.project_category_id),
          sales_category_project_ids: form.sales_category_project_ids.map((id) => Number(id)),
          email: form.email || null,
          phone: form.phone || null,
          estimated_value: form.estimated_value !== '' ? Number(form.estimated_value) : null,
          notes: form.notes || null,
          lead_started_at: form.lead_started_at || getLocalDateYmd(),
          current_step: nextStep,
        }),
      });
      if (res.id) {
        navigate(`/sales/pitch/${res.id}?step=${nextStep}`, { replace: true });
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
          prospect_name: form.title.trim(),
          company_id: toFk(form.company_id),
          project_category_id: toFk(form.project_category_id),
          sales_category_project_ids: form.sales_category_project_ids.map((id) => Number(id)),
          email: form.email || null,
          phone: form.phone || null,
          estimated_value: form.estimated_value !== '' ? Number(form.estimated_value) : null,
          final_deal_value: form.final_deal_value !== '' ? Number(form.final_deal_value) : null,
          notes: form.notes || null,
          lead_started_at: form.lead_started_at || getLocalDateYmd(),
          compro_url: form.compro_sent || null,
          proposal_url: form.proposal_sent || null,
          quotation_url: form.quotation_url.trim() || null,
          quotation_data: quotationPayloadForApi(form.quotation, form.negotiation_regenerate_quote || null),
          ...buildMeetingPayload(form),
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

  const setStepInternal = async (key) => {
    if (!pitch?.id) return;
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ current_step: key }),
      });
      await loadPitch();
      setSearchParams({ step: key }, { replace: true });
    } catch (e) {
      showFeedback('Gagal ubah step', e.message);
    } finally {
      setSaving(false);
    }
  };

  const goToStepFromTab = async (key) => {
    if (!pitch?.id) return;
    const curIdx = STEPS.findIndex((s) => s.key === pitch.current_step);
    const targetIdx = STEPS.findIndex((s) => s.key === key);
    if (targetIdx < 0 || targetIdx > curIdx) return;
    if (key === pitch.current_step) {
      setSearchParams({ step: key }, { replace: true });
      return;
    }
    await setStepInternal(key);
  };

  const goToStepFromFlow = (key) => {
    if (!pitch?.id) return;
    const reachedIdx = STEPS.findIndex((s) => s.key === (pitch.current_step || 'new_prospect'));
    const targetIdx = STEPS.findIndex((s) => s.key === key);
    if (targetIdx < 0 || targetIdx > reachedIdx) return;
    if (!can('sales.update') || pitch.outcome) return;
    setSearchParams({ step: key }, { replace: true });
  };

  const stepMundur = async () => {
    if (!pitch) return;
    const curIdx = STEPS.findIndex((s) => s.key === pitch.current_step);
    if (curIdx <= 0) return;
    const prev = STEPS[curIdx - 1].key;
    await setStepInternal(prev);
  };

  const stepMaju = async () => {
    if (!pitch) return;
    const curIdx = STEPS.findIndex((s) => s.key === pitch.current_step);
    if (curIdx < 0 || curIdx >= STEPS.length - 1) return;
    const next = STEPS[curIdx + 1].key;
    if (pitch.current_step === 'sent_compro') {
      const sent =
        form.compro_sent || parseYesNoField(pitch.compro_url);
      if (sent !== 'yes' && sent !== 'no') {
        showFeedback('Pilihan diperlukan', 'Pilih Ya atau Tidak untuk compro sebelum maju.');
        return;
      }
      await patchPitchFields({ compro_url: sent, current_step: next });
      return;
    }
    if (pitch.current_step === 'proposal_sent') {
      const proposal =
        form.proposal_sent || parseYesNoField(pitch.proposal_url);
      const qu = (form.quotation_url || '').trim() || String(pitch.quotation_url || '').trim();
      if (proposal !== 'yes' && proposal !== 'no') {
        showFeedback('Pilihan diperlukan', 'Pilih Ya atau Tidak untuk proposal sebelum maju.');
        return;
      }
      if (!qu) {
        showFeedback('Quotation belum dibuat', 'Generate PDF quotation terlebih dahulu sebelum maju.');
        return;
      }
      await patchPitchFields({
        proposal_url: proposal,
        quotation_url: qu,
        quotation_data: quotationPayloadForApi(form.quotation),
        current_step: next,
      });
      return;
    }
    if (pitch.current_step === 'presentation') {
      const has = form.meeting_has || parseMeetingHasFromPitch(pitch);
      if (has !== 'yes' && has !== 'no') {
        showFeedback('Pilihan diperlukan', 'Pilih apakah ada presentation atau tidak sebelum maju.');
        return;
      }
      if (has === 'no') {
        await patchPitchFields({ ...buildMeetingPayload({ ...form, meeting_has: 'no' }), current_step: next });
        return;
      }
      const date = (form.meeting_date || '').trim() || (pitch.meeting_at ? String(pitch.meeting_at).slice(0, 10) : '');
      const mode = (form.meeting_mode !== FK_NONE ? form.meeting_mode : '') || String(pitch.meeting_mode || '');
      const loc = (form.meeting_location || '').trim() || String(pitch.meeting_location || '').trim();
      if (!date) {
        showFeedback('Tanggal diperlukan', 'Isi tanggal presentation sebelum maju.');
        return;
      }
      if (mode !== 'online' && mode !== 'offline') {
        showFeedback('Mode diperlukan', 'Pilih presentation online atau offline.');
        return;
      }
      if (mode === 'offline' && !loc) {
        showFeedback('Lokasi diperlukan', 'Isi lokasi untuk presentation offline.');
        return;
      }
      await patchPitchFields({
        ...buildMeetingPayload({
          ...form,
          meeting_has: 'yes',
          meeting_date: date,
          meeting_mode: mode,
          meeting_location: loc,
        }),
        current_step: next,
      });
      return;
    }
    if (pitch.current_step === 'negotiation') {
      const choice = form.negotiation_regenerate_quote;
      if (choice !== 'yes' && choice !== 'no') {
        showFeedback('Pilihan diperlukan', 'Pilih apakah perlu generate ulang quotation.');
        return;
      }
      if (choice === 'yes') {
        const qu = (form.quotation_url || '').trim() || String(pitch.quotation_url || '').trim();
        if (!qu) {
          showFeedback('Quotation belum dibuat', 'Generate ulang quotation setelah selesai mengedit data.');
          return;
        }
      }
      await patchPitchFields({
        quotation_data: quotationPayloadForApi(
          choice === 'yes' ? form.quotation : buildQuotationFromPitch(pitch, pitch.quotation_data || {}),
          choice
        ),
        current_step: next,
      });
      return;
    }
    await setStepInternal(next);
  };

  const patchPitchFields = async (body) => {
    if (!pitch?.id) return;
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      await loadPitch();
      if (body.current_step && typeof body.current_step === 'string') {
        setSearchParams({ step: body.current_step }, { replace: true });
      }
    } catch (e) {
      showFeedback('Gagal memperbarui status', e.message);
    } finally {
      setSaving(false);
    }
  };

  const closeOutcomeDialog = () => {
    setOutcomeDialog({ open: false, mode: null, row: null });
  };

  const closeDetailDialog = () => {
    setDetailDialog({ open: false, row: null, data: null, loading: false });
  };

  const populateOutcomeFormFromRow = (row) => {
    setOutcomeForm({
      final_deal_value:
        row.final_deal_value != null && row.final_deal_value !== ''
          ? String(row.final_deal_value)
          : row.estimated_value != null
            ? String(row.estimated_value)
            : '',
      estimated_value: row.estimated_value != null ? String(row.estimated_value) : '',
      company_id: row.company_id != null ? String(row.company_id) : FK_NONE,
      project_category_id: row.project_category_id != null ? String(row.project_category_id) : FK_NONE,
      sales_category_project_ids: Array.isArray(row.sales_category_project_ids)
        ? row.sales_category_project_ids.map(String)
        : [],
      email: row.email || '',
      phone: row.phone || '',
      notes: row.notes || '',
    });
  };

  const openOutcomeDetail = async (row) => {
    setDetailDialog({ open: true, row, data: null, loading: true });
    try {
      if (row.id) {
        const res = await fetchAPI(`/sales-pitches/${row.id}`);
        setDetailDialog({ open: true, row, data: res.data, loading: false });
      } else {
        setDetailDialog({ open: true, row, data: row, loading: false });
      }
    } catch (e) {
      closeDetailDialog();
      showFeedback('Gagal memuat detail', e.message);
    }
  };

  const detailSummarySections = useMemo(
    () => buildOutcomeSummarySections(detailDialog.data),
    [detailDialog.data],
  );

  const openWinDialog = (row) => {
    populateOutcomeFormFromRow(row);
    setOutcomeDialog({ open: true, mode: 'win', row });
  };

  const openLostDialog = (row) => {
    setOutcomeDialog({ open: true, mode: 'lost', row });
  };

  const closePitchEditDialog = () => {
    setPitchEditDialog({ open: false, row: null, data: null, loading: false });
    setPitchEditForm(pitchToEditForm(null));
  };

  const openPitchEdit = async (row, { closeDetail = false } = {}) => {
    if (closeDetail) closeDetailDialog();
    const isPresale = row.win_entry_type === 'presale' && row.presale_id != null;
    setPitchEditDialog({ open: true, row, data: null, loading: !isPresale && !!row.id });
    if (isPresale) {
      setPitchEditForm(pitchToEditForm(row));
      setPitchEditDialog({ open: true, row, data: row, loading: false });
      return;
    }
    if (!row.id) return;
    try {
      const res = await fetchAPI(`/sales-pitches/${row.id}`);
      setPitchEditForm(pitchToEditForm(res.data));
      setPitchEditDialog({ open: true, row, data: res.data, loading: false });
    } catch (e) {
      closePitchEditDialog();
      showFeedback('Gagal memuat data', e.message);
    }
  };

  const togglePitchEditCategoryProject = (id) => {
    const sid = String(id);
    setPitchEditForm((prev) => ({
      ...prev,
      sales_category_project_ids: prev.sales_category_project_ids.includes(sid)
        ? prev.sales_category_project_ids.filter((x) => x !== sid)
        : [...prev.sales_category_project_ids, sid],
    }));
  };

  const submitPitchEdit = async () => {
    const row = pitchEditDialog.row;
    const data = pitchEditDialog.data;
    if (!row) return;
    const isPresale = row.win_entry_type === 'presale' && row.presale_id != null;
    if (!can('sales.update')) {
      showFeedback('Akses ditolak', 'Anda tidak punya izin mengubah pitch.');
      return;
    }
    if (!toFk(pitchEditForm.company_id)) {
      showFeedback('Data belum lengkap', 'Pilih perusahaan.');
      return;
    }
    if (!toFk(pitchEditForm.project_category_id)) {
      showFeedback('Data belum lengkap', 'Pilih kategori company.');
      return;
    }
    const outcome = data?.outcome || row.outcome;
    if ((tab === 'win' || outcome === 'win') && isPresale) {
      const finalNum = Number(pitchEditForm.final_deal_value);
      if (!Number.isFinite(finalNum) || finalNum < 0) {
        showFeedback('Harga final', 'Isi harga final deal (angka ≥ 0).');
        return;
      }
    }
    if ((tab === 'win' || outcome === 'win') && !isPresale) {
      const finalNum = Number(pitchEditForm.final_deal_value);
      if (!Number.isFinite(finalNum) || finalNum < 0) {
        showFeedback('Harga final', 'Isi harga final deal (angka ≥ 0).');
        return;
      }
    }

    setSaving(true);
    try {
      if (isPresale) {
        const finalNum = Number(pitchEditForm.final_deal_value);
        const customTitle = (pitchEditForm.title || '').trim();
        await fetchAPI(`/sales-pitches/link-won-presale/${row.presale_id}`, {
          method: 'POST',
          body: JSON.stringify({
            ...(customTitle ? { title: customTitle } : {}),
            company_id: toFk(pitchEditForm.company_id),
            project_category_id: toFk(pitchEditForm.project_category_id),
            sales_category_project_ids: pitchEditForm.sales_category_project_ids.map((id) => Number(id)),
            final_deal_value: finalNum,
            estimated_value:
              pitchEditForm.estimated_value !== '' ? Number(pitchEditForm.estimated_value) : null,
          }),
        });
        showFeedback('Berhasil', 'Data terhubung ke Sales Sign Off.');
      } else {
        const payload = editFormToApiPayload(pitchEditForm, {
          outcome: outcome === 'win' ? 'win' : undefined,
          toFk,
        });
        await fetchAPI(`/sales-pitches/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showFeedback('Berhasil', 'Semua data pitch diperbarui.');
      }
      closePitchEditDialog();
      await loadList();
      if (detailDialog.open) {
        const refreshId = isPresale ? null : row.id;
        if (refreshId) {
          const res = await fetchAPI(`/sales-pitches/${refreshId}`);
          setDetailDialog((d) => ({ ...d, data: res.data }));
        }
      }
    } catch (e) {
      showFeedback('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleOutcomeCategoryProject = (id) => {
    const sid = String(id);
    setOutcomeForm((prev) => ({
      ...prev,
      sales_category_project_ids: prev.sales_category_project_ids.includes(sid)
        ? prev.sales_category_project_ids.filter((x) => x !== sid)
        : [...prev.sales_category_project_ids, sid],
    }));
  };

  const submitWinFromList = async () => {
    const row = outcomeDialog.row;
    if (!row) return;
    const isPresaleEntry = row.win_entry_type === 'presale' && row.presale_id != null;
    if (!isPresaleEntry && !row.id) return;
    if (!can('sales.update')) {
      showFeedback('Akses ditolak', 'Anda tidak punya izin mengubah pitch.');
      return;
    }
    if (!toFk(outcomeForm.company_id)) {
      showFeedback('Data belum lengkap', 'Pilih perusahaan sebelum melengkapi data Sign Off.');
      return;
    }
    if (!toFk(outcomeForm.project_category_id)) {
      showFeedback('Data belum lengkap', 'Pilih kategori company sebelum melengkapi data Sign Off.');
      return;
    }
    const finalNum = Number(outcomeForm.final_deal_value);
    if (!Number.isFinite(finalNum) || finalNum < 0) {
      showFeedback('Harga final', 'Isi harga final deal (angka ≥ 0).');
      return;
    }
    const payload = {
      final_deal_value: finalNum,
      company_id: toFk(outcomeForm.company_id),
      project_category_id: toFk(outcomeForm.project_category_id),
      sales_category_project_ids: outcomeForm.sales_category_project_ids.map((id) => Number(id)),
      estimated_value:
        outcomeForm.estimated_value !== '' ? Number(outcomeForm.estimated_value) : null,
    };
    setSaving(true);
    try {
      if (isPresaleEntry) {
        await fetchAPI(`/sales-pitches/link-won-presale/${row.presale_id}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        closeOutcomeDialog();
        showFeedback('Berhasil', `"${row.title || row.prospect_name}" terhubung ke Sales Sign Off.`);
      } else {
        const body =
          row.outcome === 'win'
            ? payload
            : { ...payload, outcome: 'win' };
        await fetchAPI(`/sales-pitches/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        closeOutcomeDialog();
        showFeedback(
          'Berhasil',
          row.outcome === 'win'
            ? `Data "${row.title || row.prospect_name}" diperbarui.`
            : `"${row.title || row.prospect_name}" ditandai Sign Off.`,
        );
      }
      await loadList();
      goTab('win');
      const refreshPitchId = !isPresaleEntry ? row.id : null;
      if (detailDialog.open && refreshPitchId) {
        const res = await fetchAPI(`/sales-pitches/${refreshPitchId}`);
        setDetailDialog((d) => ({ ...d, data: res.data }));
      }
    } catch (e) {
      showFeedback('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitLostFromList = async () => {
    const row = outcomeDialog.row;
    if (!row?.id) return;
    if (!can('sales.update')) {
      showFeedback('Akses ditolak', 'Anda tidak punya izin mengubah pitch.');
      return;
    }
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ outcome: 'lost' }),
      });
      closeOutcomeDialog();
      showFeedback('Berhasil', `"${row.title || row.prospect_name}" ditandai Lost.`);
      await loadList();
      goTab('lost');
    } catch (e) {
      showFeedback('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const finalizeOutcome = async (outcome) => {
    if (!pitch?.id) return;
    if (outcome === 'win') {
      const raw = String(form.final_deal_value ?? '').trim();
      const fromSaved =
        pitch.final_deal_value != null && pitch.final_deal_value !== ''
          ? String(pitch.final_deal_value)
          : '';
      const valStr = raw !== '' ? raw : fromSaved;
      const num = valStr === '' ? NaN : Number(valStr);
      if (!Number.isFinite(num) || num < 0) {
        showFeedback('Harga final', 'Isi harga final deal (angka ≥ 0) sebelum Sign Off.');
        return;
      }
      setSaving(true);
      try {
        await fetchAPI(`/sales-pitches/${pitch.id}`, {
          method: 'PUT',
          body: JSON.stringify({ outcome: 'win', final_deal_value: num }),
        });
        showFeedback('Berhasil', 'Pitch ditandai Sign Off.');
        navigate('/sales?tab=win');
      } catch (e) {
        showFeedback('Gagal', e.message);
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ outcome: 'lost' }),
      });
      showFeedback('Berhasil', 'Pitch ditandai sebagai Lost.');
      navigate('/sales?tab=lost');
    } catch (e) {
      showFeedback('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  const previewQuotationPdf = async () => {
    if (!pitch?.id) return;
    setQuotationPdfLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiUrl()}/sales-pitches/${pitch.id}/quotation/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quotation_data: quotationPayloadForApi(form.quotation) }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal preview quotation PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      showFeedback('Gagal preview PDF', e.message);
    } finally {
      setQuotationPdfLoading(false);
    }
  };

  const generateQuotationPdf = async ({ regenerate = false } = {}) => {
    if (!pitch?.id) return;
    setQuotationPdfLoading(true);
    try {
      const res = await fetchAPI(`/sales-pitches/${pitch.id}/quotation/generate`, {
        method: 'POST',
        body: JSON.stringify({
          quotation_data: quotationPayloadForApi(form.quotation, form.negotiation_regenerate_quote || null),
          regenerate,
        }),
      });
      if (res.data) {
        setPitch(res.data);
        const quotation = buildQuotationFromPitch(res.data, res.data.quotation_data || {});
        setForm((prev) => ({
          ...prev,
          quotation_url: res.data.quotation_url || res.quotation_url || prev.quotation_url,
          quotation,
          final_deal_value: finalDealValueFromQuotation(quotation) || prev.final_deal_value,
        }));
      }
      showFeedback(
        regenerate ? 'Quotation baru dibuat' : 'Quotation dibuat',
        regenerate
          ? 'Quotation revisi dengan nomor baru berhasil di-generate.'
          : 'PDF quotation berhasil di-generate dan disimpan.'
      );
    } catch (e) {
      showFeedback('Gagal generate PDF', e.message);
    } finally {
      setQuotationPdfLoading(false);
    }
  };

  const activeQuotationForFinalDeal = useMemo(() => {
    if (form.negotiation_regenerate_quote === 'yes') {
      return form.quotation;
    }
    if (pitch?.quotation_data) {
      return buildQuotationFromPitch(pitch, pitch.quotation_data);
    }
    return form.quotation;
  }, [form.negotiation_regenerate_quote, form.quotation, pitch?.quotation_data]);

  const latestQuotationTotal = useMemo(
    () => quotationTotal(activeQuotationForFinalDeal),
    [activeQuotationForFinalDeal]
  );

  useEffect(() => {
    if (currentStepKey !== 'negotiation' && currentStepKey !== 'closed') return;
    const next = finalDealValueFromQuotation(activeQuotationForFinalDeal);
    if (!next) return;
    setForm((prev) => (prev.final_deal_value === next ? prev : { ...prev, final_deal_value: next }));
  }, [currentStepKey, activeQuotationForFinalDeal, latestQuotationTotal]);

  const loadQuotationForNegotiationEdit = useCallback(() => {
    if (!pitch) return;
    const quotation = buildQuotationFromPitch(pitch, pitch.quotation_data);
    setForm((prev) => ({
      ...prev,
      negotiation_regenerate_quote: 'yes',
      quotation_url: pitch.quotation_url || prev.quotation_url,
      quotation,
      final_deal_value: finalDealValueFromQuotation(quotation) || prev.final_deal_value,
    }));
  }, [pitch]);

  const skipNegotiationRegenerate = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      negotiation_regenerate_quote: 'no',
    }));
  }, []);

  const deleteDraftForCurrentStep = async () => {
    if (!pitch?.id) return;
    let payload = null;
    if (currentStepKey === 'sent_compro') {
      payload = { compro_url: null };
    } else if (currentStepKey === 'proposal_sent') {
      payload = { proposal_url: null, quotation_url: null, quotation_data: null };
      try {
        if (pitch.quotation_logo_url) {
          await fetchAPI(`/sales-pitches/${pitch.id}/quotation/logo`, { method: 'DELETE' });
        }
      } catch {
        /* logo removal is best-effort when clearing draft */
      }
    } else if (currentStepKey === 'presentation') {
      payload = { meeting_at: null, meeting_location: null, meeting_mode: null };
    } else if (currentStepKey === 'negotiation') {
      payload = {
        final_deal_value: null,
        quotation_data: pitch?.quotation_data
          ? { ...pitch.quotation_data, negotiation_regenerate_quote: null }
          : null,
      };
    } else if (currentStepKey === 'closed') {
      payload = { final_deal_value: null };
    }
    if (!payload) {
      showFeedback('Tidak ada draft', 'Step ini tidak memiliki field draft yang bisa dihapus.');
      return;
    }
    setSaving(true);
    try {
      await fetchAPI(`/sales-pitches/${pitch.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await loadPitch();
      showFeedback('Draft dihapus', 'Draft pada step aktif berhasil dihapus.');
    } catch (e) {
      showFeedback('Gagal hapus draft', e.message);
    } finally {
      setSaving(false);
    }
  };

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === currentStepKey), [currentStepKey]);
  const maxReachableIdx = useMemo(() => {
    const reached = STEPS.findIndex((s) => s.key === (pitch?.current_step || 'new_prospect'));
    return reached >= 0 ? reached : 0;
  }, [pitch?.current_step]);
  // Summary should reflect saved draft from backend, not unsaved local edits.
  const comproSent = parseYesNoField(pitch?.compro_url);
  const comproLabel = formatYesNoLabel(comproSent);
  const proposalSent = parseYesNoField(pitch?.proposal_url);
  const proposalLabel = formatYesNoLabel(proposalSent);
  const quotationHref = String(pitch?.quotation_url || '').trim();
  const meetingHasSummary = parseMeetingHasFromPitch(pitch);
  const meetingDateSummary = pitch?.meeting_at ? String(pitch.meeting_at) : '';
  const meetingLocationSummary = String(pitch?.meeting_location || '').trim();
  const meetingModeSummary = String(pitch?.meeting_mode || '');
  const finalDealSummary = pitch?.final_deal_value != null ? String(pitch.final_deal_value) : '';
  const leadStartedSummary = pitch?.lead_started_at ? String(pitch.lead_started_at).slice(0, 10) : '';
  const isStepGroupDisabled = (stepKey) => {
    if (isNewPitch || !pitch) return false;
    const idx = STEPS.findIndex((s) => s.key === stepKey);
    return idx >= 0 && idx < maxReachableIdx;
  };

  useEffect(() => {
    if (isNewPitch || !pitchId || !pitch?.current_step) return;
    if (stepParamRaw === 'meeting') {
      setSearchParams({ step: 'presentation' }, { replace: true });
      return;
    }
    const reachedKey = pitch.current_step === 'meeting' ? 'presentation' : pitch.current_step;
    const reachedIdx = STEPS.findIndex((s) => s.key === reachedKey);
    const wantedIdx = stepParam ? STEPS.findIndex((s) => s.key === stepParam) : -1;
    const invalidParam = !stepParam || wantedIdx < 0 || wantedIdx > reachedIdx;
    if (invalidParam) {
      setSearchParams({ step: reachedKey }, { replace: true });
    }
  }, [isNewPitch, pitchId, pitch?.current_step, stepParam, stepParamRaw, setSearchParams]);

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
            {isNewPitch
              ? 'Isi data lead baru. Setelah disimpan, lanjutkan ke step berikutnya (Sent Compro, Proposal, dan seterusnya) satu per satu.'
              : 'Prev / Next memindahkan satu tahap sekaligus. Klik step yang sudah dicapai pada progress flow untuk meninjau. Simpan draft secara berkala. Pada step Sign Off: Sign Off memerlukan harga final; Lost langsung ke tab Lost.'}
          </p>
        </div>

        {!isNewPitch && pitch && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Status pipeline</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1 max-w-xl">
                    Progress flow menunjukkan tahap pipeline. Klik step yang sudah dicapai untuk meninjau; gunakan Prev / Next untuk maju satu tahap.
                  </p>
                </div>
                {pitch.outcome && (
                  <Badge className={pitch.outcome === 'win' ? 'bg-emerald-600 shrink-0' : 'bg-rose-600 shrink-0'}>
                    {pitch.outcome === 'win' ? 'Sign Off' : 'Lost'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <nav aria-label="Progress pipeline" className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <ol className="flex w-full items-start">
                  {STEPS.map((s, idx) => {
                    const isActive = s.key === currentStepKey;
                    const isLocked = idx > maxReachableIdx;
                    const isComplete = idx < maxReachableIdx || (idx === maxReachableIdx && !isActive);
                    const isClickable = !isLocked && !pitch.outcome && can('sales.update');
                    const connectorDone = idx < maxReachableIdx;

                    return (
                      <li key={s.key} className="flex flex-1 min-w-0 items-start last:flex-none">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <button
                            type="button"
                            disabled={!isClickable}
                            onClick={() => goToStepFromFlow(s.key)}
                            className={[
                              'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                              isActive && 'border-primary bg-primary text-white shadow-md shadow-primary/25 scale-110',
                              !isActive && isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                              !isActive && !isComplete && !isLocked && 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
                              isLocked && 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500',
                              isClickable && !isActive && 'cursor-pointer hover:border-primary/60 hover:bg-primary/5',
                              !isClickable && 'cursor-default',
                            ].filter(Boolean).join(' ')}
                          >
                            {isComplete && !isActive ? (
                              <Check className="size-4" strokeWidth={3} />
                            ) : (
                              idx + 1
                            )}
                          </button>
                          <div className="mt-2 w-full px-1 text-center">
                            <p
                              className={[
                                'text-[10px] sm:text-xs font-semibold leading-tight',
                                isActive && 'text-primary',
                                isComplete && !isActive && 'text-emerald-600 dark:text-emerald-400',
                                isLocked && 'text-slate-400 dark:text-slate-500',
                                !isActive && !isComplete && !isLocked && 'text-slate-600 dark:text-slate-400',
                              ].filter(Boolean).join(' ')}
                            >
                              {s.label}
                            </p>
                          </div>
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div
                            className={[
                              'mt-[18px] h-0.5 flex-1 min-w-[8px] mx-0.5 sm:mx-1 rounded-full transition-colors',
                              connectorDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700',
                            ].join(' ')}
                            aria-hidden
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-4">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {STEPS.find((x) => x.key === currentStepKey)?.label}
                </p>

                {stepIndex > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ringkasan step sebelumnya</p>
                    <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                      <p className="font-medium text-slate-700 dark:text-slate-200">1. New Prospect</p>
                      <div className="text-slate-600 dark:text-slate-300">Nama project: {(form.title || pitch?.title || pitch?.prospect_name || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Perusahaan: {(pitch?.company_name || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Kategori company: {(pitch?.company_category_name || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Kategori project: {(categoryProjectSummary || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">
                        Estimasi nilai: {pitch?.estimated_value != null ? Number(pitch.estimated_value).toLocaleString('id-ID') : '—'}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">Email: {(form.email || pitch?.email || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Telepon: {(form.phone || pitch?.phone || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Mulai lead: {(leadStartedSummary || '—')}</div>
                      <div className="text-slate-600 dark:text-slate-300">Catatan: {(form.notes || pitch?.notes || '—')}</div>
                    </div>
                    {stepIndex > 1 && comproSent && (
                      <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-slate-700 dark:text-slate-200">2. Sent Compro</p>
                        <div className="text-slate-600 dark:text-slate-300">
                          Sudah kirim compro: {comproLabel}
                        </div>
                      </div>
                    )}
                    {stepIndex > 2 && (proposalSent || quotationHref) && (
                      <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-slate-700 dark:text-slate-200">3. Proposal Sent</p>
                        {proposalSent && (
                          <div className="text-slate-600 dark:text-slate-300">
                            Sudah kirim proposal: {proposalLabel}
                          </div>
                        )}
                        {quotationHref && (
                          <div className="text-slate-600 dark:text-slate-300">
                            Link quotation:{' '}
                            <a href={quotationHref.startsWith('http') ? quotationHref : `https://${quotationHref}`} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                              {quotationHref}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {stepIndex > 3 && meetingHasSummary && (
                      <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-slate-700 dark:text-slate-200">4. Presentation</p>
                        <div className="text-slate-600 dark:text-slate-300">
                          Ada presentation: {formatYesNoLabel(meetingHasSummary)}
                        </div>
                        {meetingHasSummary === 'yes' && meetingDateSummary && (
                          <div className="text-slate-600 dark:text-slate-300">
                            Tanggal: {formatMeetingDateOnly(meetingDateSummary)}
                          </div>
                        )}
                        {meetingHasSummary === 'yes' && meetingModeSummary && meetingModeSummary !== 'no' && (
                          <div className="text-slate-600 dark:text-slate-300">
                            Mode: {meetingModeSummary === 'online' ? 'Online' : 'Offline'}
                          </div>
                        )}
                        {meetingHasSummary === 'yes' && meetingLocationSummary && (
                          <div className="text-slate-600 dark:text-slate-300">Lokasi: {meetingLocationSummary}</div>
                        )}
                      </div>
                    )}
                    {stepIndex > 4 && finalDealSummary !== '' && (
                      <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-slate-700 dark:text-slate-200">5. Negotiation</p>
                        <div className="text-slate-600 dark:text-slate-300">
                          Harga final deal: {Number(finalDealSummary).toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}
                    {stepIndex > 5 && (
                      <div className="rounded-md border border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-950/50 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-slate-700 dark:text-slate-200">6. Sign Off</p>
                        <div className="text-slate-600 dark:text-slate-300">Outcome: {pitch?.outcome === 'win' ? 'Sign Off' : pitch?.outcome === 'lost' ? 'Lost' : '—'}</div>
                      </div>
                    )}
                  </div>
                )}

                {currentStepKey === 'new_prospect' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Lead baru. Gunakan tombol Next untuk masuk ke Sent Compro setelah siap.
                    </p>
                  </div>
                )}

                {currentStepKey === 'sent_compro' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <span className="text-sm font-medium block">Sudah kirim compro?</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={form.compro_sent === 'yes' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('sent_compro') || !!pitch?.outcome || saving}
                          onClick={() => setForm((p) => ({ ...p, compro_sent: 'yes' }))}
                        >
                          Ya
                        </Button>
                        <Button
                          type="button"
                          variant={form.compro_sent === 'no' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('sent_compro') || !!pitch?.outcome || saving}
                          onClick={() => setForm((p) => ({ ...p, compro_sent: 'no' }))}
                        >
                          Tidak
                        </Button>
                      </div>
                    </div>
                    {(form.compro_sent || comproSent) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pilihan:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatYesNoLabel(form.compro_sent || comproSent)}
                        </span>
                        . Gunakan Simpan draft atau Next untuk menyimpan.
                      </p>
                    )}
                  </div>
                )}

                {currentStepKey === 'proposal_sent' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <span className="text-sm font-medium block">Sudah kirim proposal?</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={form.proposal_sent === 'yes' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('proposal_sent') || !!pitch?.outcome || saving}
                          onClick={() => setForm((p) => ({ ...p, proposal_sent: 'yes' }))}
                        >
                          Ya
                        </Button>
                        <Button
                          type="button"
                          variant={form.proposal_sent === 'no' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('proposal_sent') || !!pitch?.outcome || saving}
                          onClick={() => setForm((p) => ({ ...p, proposal_sent: 'no' }))}
                        >
                          Tidak
                        </Button>
                      </div>
                    </div>
                    {(form.proposal_sent || proposalSent) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pilihan proposal:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatYesNoLabel(form.proposal_sent || proposalSent)}
                        </span>
                        . Gunakan Simpan draft atau Next untuk menyimpan.
                      </p>
                    )}
                    {quotationHref !== '' && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium block">Quotation PDF</span>
                        <a
                          href={quotationHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline break-all text-sm"
                        >
                          Unduh / buka quotation PDF
                        </a>
                        {pitch?.quotation_data?.quote_no && (
                          <p className="text-xs text-slate-500">
                            {pitch.quotation_data.quote_no} · Total {formatIdr(quotationTotal(buildQuotationFromPitch(pitch, pitch.quotation_data)))}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Isi pilihan proposal di atas, form quotation di kartu Detail pitch, lalu Generate PDF. Next memerlukan proposal (Ya/Tidak) dan quotation PDF yang sudah di-generate.
                    </p>
                  </div>
                )}

                {currentStepKey === 'presentation' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-sm font-medium block">Ada presentation?</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={form.meeting_has === 'yes' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('presentation') || !!pitch?.outcome || saving}
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              meeting_has: 'yes',
                              meeting_date: p.meeting_date || getLocalDateYmd(),
                            }))
                          }
                        >
                          Ada
                        </Button>
                        <Button
                          type="button"
                          variant={form.meeting_has === 'no' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('presentation') || !!pitch?.outcome || saving}
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              meeting_has: 'no',
                              meeting_date: '',
                              meeting_location: '',
                              meeting_mode: FK_NONE,
                            }))
                          }
                        >
                          Tidak ada
                        </Button>
                      </div>
                    </div>
                    {form.meeting_has === 'yes' && (
                      <div className="space-y-4 rounded-md border border-slate-200 dark:border-slate-700 p-3">
                        <label className="space-y-2 block">
                          <span className="text-sm font-medium">Tanggal presentation</span>
                          <Input
                            type="date"
                            value={form.meeting_date}
                            disabled={isStepGroupDisabled('presentation') || !!pitch?.outcome || saving}
                            onChange={(e) => setForm((p) => ({ ...p, meeting_date: e.target.value }))}
                          />
                        </label>
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Online atau offline</span>
                          <Select
                            value={form.meeting_mode}
                            disabled={isStepGroupDisabled('presentation') || !!pitch?.outcome || saving}
                            onValueChange={(v) =>
                              setForm((p) => ({
                                ...p,
                                meeting_mode: v,
                                meeting_location: v === 'online' ? '' : p.meeting_location,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full border-slate-200 dark:border-slate-700">
                              <SelectValue placeholder="Pilih mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FK_NONE}>Pilih mode</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {form.meeting_mode === 'offline' && (
                          <label className="space-y-2 block">
                            <span className="text-sm font-medium">Lokasi</span>
                            <Input
                              type="text"
                              placeholder="Alamat / nama gedung"
                              value={form.meeting_location}
                              disabled={isStepGroupDisabled('presentation') || !!pitch?.outcome || saving}
                              onChange={(e) => setForm((p) => ({ ...p, meeting_location: e.target.value }))}
                            />
                          </label>
                        )}
                      </div>
                    )}
                    {(form.meeting_has || meetingHasSummary) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gunakan Simpan draft atau Next ke Negosiasi setelah pilihan presentation lengkap.
                      </p>
                    )}
                  </div>
                )}

                {currentStepKey === 'negotiation' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-sm font-medium block">Perlu generate ulang quotation?</span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={form.negotiation_regenerate_quote === 'yes' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('negotiation') || !!pitch?.outcome || saving}
                          onClick={loadQuotationForNegotiationEdit}
                        >
                          Ya
                        </Button>
                        <Button
                          type="button"
                          variant={form.negotiation_regenerate_quote === 'no' ? 'default' : 'outline'}
                          disabled={isStepGroupDisabled('negotiation') || !!pitch?.outcome || saving}
                          onClick={skipNegotiationRegenerate}
                        >
                          Tidak
                        </Button>
                      </div>
                    </div>
                    {form.negotiation_regenerate_quote === 'no' && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Quotation proposal tetap dipakai.
                        {quotationHref && (
                          <>
                            {' '}
                            <a href={quotationHref} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              Buka PDF quotation
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    {form.negotiation_regenerate_quote === 'yes' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Data quotation awal sudah dimuat di kartu Detail pitch. Edit lalu Generate ulang quotation.
                      </p>
                    )}
                    {pitch?.estimated_value != null && Number(pitch.estimated_value) > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Estimasi awal:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {Number(pitch.estimated_value).toLocaleString('id-ID')}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {currentStepKey === 'closed' && !pitch.outcome && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Step Sign Off. Sign Off: isi harga final di kartu di bawah lalu konfirmasi. Lost: satu klik di kartu di bawah.
                  </p>
                )}

                {currentStepKey === 'closed' && pitch.outcome && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pitch telah ditutup.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(isNewPitch || (!isNewPitch && pitch)) && (
          <Card>
          <CardHeader>
            <CardTitle>{isNewPitch ? 'Data awal lead' : 'Detail pitch'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={
                isNewPitch
                  ? (e) => createPitch(e, { asDraft: false })
                  : (e) => {
                      e.preventDefault();
                      saveDetails();
                    }
              }
            >
              {currentStepKey === 'new_prospect' && (
              <fieldset className="space-y-4 rounded-md border border-slate-200 p-4 dark:border-slate-700" disabled={isStepGroupDisabled('new_prospect')}>
                <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">1. New Prospect</legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium">Nama Project</span>
                    <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Perusahaan</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih dari master List Company (menu Bisnis).</p>
                  <Select value={form.company_id} onValueChange={(v) => setForm((p) => ({ ...p, company_id: v }))}>
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Pilih perusahaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FK_NONE}>Tidak dipilih</SelectItem>
                      {formOptions.companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Kategori company</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Master Category Company.</p>
                    <Select value={form.project_category_id} onValueChange={(v) => setForm((p) => ({ ...p, project_category_id: v }))}>
                      <SelectTrigger className="w-full border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FK_NONE}>Tidak dipilih</SelectItem>
                        {formOptions.company_categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium">Kategori project</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bisa pilih lebih dari satu (master Category Project Sales).</p>
                    <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 p-3 space-y-2 dark:border-slate-700">
                      {formOptions.category_projects.length === 0 ? (
                        <p className="text-xs text-slate-500">Belum ada kategori di master.</p>
                      ) : (
                        formOptions.category_projects.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            <Checkbox
                              checked={form.sales_category_project_ids.includes(String(c.id))}
                              onCheckedChange={() => toggleCategoryProject(c.id)}
                            />
                            <span>{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {form.sales_category_project_ids.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Terpilih: {form.sales_category_project_ids.length} kategori
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Estimasi nilai (opsional)</span>
                    <Input type="number" min="0" value={form.estimated_value} onChange={(e) => setForm((p) => ({ ...p, estimated_value: e.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Email</span>
                    <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </label>
                </div>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Telepon</span>
                  <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Mulai lead</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal saja; default hari ini.</p>
                  <Input type="date" value={form.lead_started_at} onChange={(e) => setForm((p) => ({ ...p, lead_started_at: e.target.value }))} />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Catatan</span>
                  <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={4} />
                </label>
              </fieldset>
              )}

              {currentStepKey === 'sent_compro' && (
              <p className="text-sm text-slate-600 dark:text-slate-400 rounded-md border border-dashed border-slate-200 dark:border-slate-700 p-3">
                Pilihan compro (Ya/Tidak) ada di kartu <strong>Status pipeline</strong> di atas. Gunakan <strong>Simpan draft</strong> di bawah untuk menyimpan.
              </p>
              )}

              {currentStepKey === 'proposal_sent' && (
              <fieldset className="space-y-4 rounded-md border border-slate-200 p-4 dark:border-slate-700" disabled={isStepGroupDisabled('proposal_sent')}>
                <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">3. Proposal Sent</legend>
                <p className="text-sm text-slate-600 dark:text-slate-400 rounded-md border border-dashed border-slate-200 dark:border-slate-700 p-3">
                  Pilihan proposal (Ya/Tidak) ada di kartu <strong>Status pipeline</strong> di atas. Gunakan <strong>Simpan draft</strong> untuk menyimpan sebelum generate quotation.
                </p>
                <QuotationEditorSection
                  pitchId={pitch?.id}
                  pitch={pitch}
                  quotation={form.quotation}
                  quotationUrl={quotationHref || null}
                  quotationLogoUrl={pitch?.quotation_logo_url || null}
                  disabled={isStepGroupDisabled('proposal_sent') || !!pitch?.outcome}
                  canUpdate={can('sales.update')}
                  loading={quotationPdfLoading}
                  onQuotationChange={(quotation) => setForm((p) => ({ ...p, quotation }))}
                  onPitchUpdated={(data) => data && setPitch(data)}
                  onError={(msg) => showFeedback('Logo quotation', msg)}
                  onPreview={previewQuotationPdf}
                  onGenerate={() => generateQuotationPdf({ regenerate: false })}
                  generateLabel="Generate PDF"
                  description="Format mengikuti template Noohtify (contoh Sunpride)."
                />
              </fieldset>
              )}

              {currentStepKey === 'presentation' && (
              <p className="text-sm text-slate-600 dark:text-slate-400 rounded-md border border-dashed border-slate-200 dark:border-slate-700 p-3">
                Data presentation (Ada/Tidak, tanggal, mode) ada di kartu <strong>Status pipeline</strong> di atas. Gunakan <strong>Simpan draft</strong> untuk menyimpan.
              </p>
              )}

              {currentStepKey === 'negotiation' && (
              <fieldset className="space-y-4 rounded-md border border-slate-200 p-4 dark:border-slate-700" disabled={isStepGroupDisabled('negotiation')}>
                <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">5. Negotiation</legend>
                <div className="space-y-2">
                  <span className="text-sm font-medium block">Perlu generate ulang quotation?</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih <strong>Ya</strong> untuk memuat data quotation dari Proposal Sent dan mengedit. Pilih <strong>Tidak</strong> jika quotation proposal tetap dipakai.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={form.negotiation_regenerate_quote === 'yes' ? 'default' : 'outline'}
                      disabled={isStepGroupDisabled('negotiation') || !!pitch?.outcome || saving}
                      onClick={loadQuotationForNegotiationEdit}
                    >
                      Ya
                    </Button>
                    <Button
                      type="button"
                      variant={form.negotiation_regenerate_quote === 'no' ? 'default' : 'outline'}
                      disabled={isStepGroupDisabled('negotiation') || !!pitch?.outcome || saving}
                      onClick={skipNegotiationRegenerate}
                    >
                      Tidak
                    </Button>
                  </div>
                </div>
                {form.negotiation_regenerate_quote === 'no' && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 rounded-md border border-dashed border-slate-200 dark:border-slate-700 p-3">
                    Tidak ada revisi quotation. Lanjutkan dengan PDF quotation proposal yang sudah ada
                    {quotationHref && (
                      <>
                        {' '}
                        (<a href={quotationHref} target="_blank" rel="noopener noreferrer" className="text-primary underline">buka PDF</a>)
                      </>
                    )}
                    .
                  </p>
                )}
                {form.negotiation_regenerate_quote === 'yes' && (
                  <QuotationEditorSection
                    pitchId={pitch?.id}
                    pitch={pitch}
                    quotation={form.quotation}
                    quotationUrl={quotationHref || null}
                    quotationLogoUrl={pitch?.quotation_logo_url || null}
                    disabled={isStepGroupDisabled('negotiation') || !!pitch?.outcome}
                    canUpdate={can('sales.update')}
                    loading={quotationPdfLoading}
                    showLogoUpload={false}
                    description="Data quotation awal dari Proposal Sent. Edit sesuai negosiasi, lalu Generate ulang quotation untuk PDF dengan nomor baru."
                    onQuotationChange={(quotation) =>
                      setForm((p) => ({
                        ...p,
                        quotation,
                        final_deal_value: finalDealValueFromQuotation(quotation) || p.final_deal_value,
                      }))
                    }
                    onPitchUpdated={(data) => data && setPitch(data)}
                    onError={(msg) => showFeedback('Quotation', msg)}
                    onPreview={previewQuotationPdf}
                    onGenerate={() => generateQuotationPdf({ regenerate: true })}
                    generateLabel="Generate ulang quotation"
                  />
                )}
                <label className="space-y-2 block border-t border-slate-200 dark:border-slate-700 pt-4">
                  <span className="text-sm font-medium">Harga final deal</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mengikuti total quotation terbaru
                    {latestQuotationTotal > 0 ? ` (${formatIdr(latestQuotationTotal)})` : ''}.
                    {form.negotiation_regenerate_quote === 'no' && ' Menggunakan quotation dari Proposal Sent.'}
                  </p>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.final_deal_value} onChange={(e) => setForm((p) => ({ ...p, final_deal_value: e.target.value }))} />
                </label>
              </fieldset>
              )}

              {currentStepKey === 'closed' && (
              <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700" disabled={isStepGroupDisabled('negotiation')}>
                <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">6. Sign Off</legend>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Harga final deal</span>
                  <Input type="number" min="0" step="0.01" placeholder="0" value={form.final_deal_value} onChange={(e) => setForm((p) => ({ ...p, final_deal_value: e.target.value }))} />
                </label>
              </fieldset>
              )}
              <div className="flex flex-wrap gap-2">
                {isNewPitch ? (
                  <>
                    <Button type="submit" disabled={saving || !can('sales.create')}>
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || !can('sales.create')}
                      onClick={(e) => createPitch(e, { asDraft: true })}
                    >
                      {saving ? 'Menyimpan...' : 'Simpan draft'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="submit" disabled={saving || !can('sales.update') || !!pitch?.outcome}>
                      {saving ? 'Menyimpan...' : 'Simpan draft'}
                    </Button>
                    {(currentStepKey === 'sent_compro' || currentStepKey === 'proposal_sent' || currentStepKey === 'presentation' || currentStepKey === 'negotiation' || currentStepKey === 'closed') && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving || !can('sales.update') || !!pitch?.outcome}
                        onClick={deleteDraftForCurrentStep}
                      >
                        Delete draft
                      </Button>
                    )}
                  </>
                )}
              </div>
            </form>
          </CardContent>
          </Card>
        )}

        {!isNewPitch && pitch && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stepIndex <= 0 || !can('sales.update') || !!pitch.outcome || saving}
              onClick={stepMundur}
            >
              <ChevronLeft className="size-4 mr-1" />
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={stepIndex < 0 || stepIndex >= STEPS.length - 1 || !can('sales.update') || !!pitch.outcome || saving}
              onClick={stepMaju}
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        )}

        {!isNewPitch && pitch && currentStepKey === 'closed' && !pitch.outcome && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Sign Off — pilih hasil</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
                Sign Off: isi harga final deal lalu konfirmasi. Lost: langsung pindah ke tab Project Lost.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                <span className="text-sm font-medium text-slate-900 dark:text-white">Sign Off</span>
                <label className="space-y-2 block max-w-md">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Harga final deal (wajib)</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.final_deal_value}
                    onChange={(e) => setForm((p) => ({ ...p, final_deal_value: e.target.value }))}
                    disabled={saving || !can('sales.update')}
                  />
                  <span className="text-xs text-slate-500">Angka ≥ 0 (mis. IDR). Disimpan bersama status Sign Off.</span>
                </label>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={saving || !can('sales.update')}
                  onClick={() => finalizeOutcome('win')}
                >
                  <Check className="size-4 mr-2" />
                  Sign Off & ke tab Project Win
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <span className="text-sm font-medium text-slate-900 dark:text-white">Lost</span>
                <Button type="button" variant="destructive" disabled={saving || !can('sales.update')} onClick={() => finalizeOutcome('lost')}>
                  <X className="size-4 mr-2" />
                  Lost & ke tab Project Lost
                </Button>
              </div>
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
                    <th className="py-2 pr-4">Nama Project</th>
                    <th className="py-2 pr-4">Perusahaan</th>
                    <th className="py-2 pr-4">Kat. co.</th>
                    <th className="py-2 pr-4">Kat. proj.</th>
                    {tab === 'win' && <th className="py-2 pr-4">Status</th>}
                    {tab !== 'win' && <th className="py-2 pr-4">Step</th>}
                    <th className="py-2 pr-4">Durasi</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={getWinRowKey(row)} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 font-medium">
                        {row.title || row.prospect_name || '—'}
                        {row.win_entry_type === 'presale' && (
                          <span className="block text-[10px] font-normal text-slate-400">Dari Project Board</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.company_name || '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{row.company_category_name || '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{row.category_project_name || '—'}</td>
                      {tab === 'win' && (
                        <td className="py-2 pr-4">
                          {row.is_data_complete ? (
                            <Badge className="bg-emerald-600">Sign Off</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                              Data belum lengkap
                            </Badge>
                          )}
                        </td>
                      )}
                      {tab !== 'win' && (
                        <td className="py-2 pr-4">
                          <Badge variant="outline">{STEPS.find((s) => s.key === row.current_step)?.label || row.current_step}</Badge>
                        </td>
                      )}
                      <td className="py-2 pr-4 text-slate-600">
                        {row.outcome
                          ? formatDurationSeconds(row.duration_seconds_closed)
                          : formatDurationSeconds(row.duration_seconds_open)}
                        <span className="block text-[10px] text-slate-400">
                          {row.outcome ? 'Lead → Sign Off' : 'Sejak mulai lead'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {tab === 'pipeline' && !row.outcome && can('sales.update') && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                disabled={saving}
                                onClick={() => openWinDialog(row)}
                              >
                                <Check className="size-3.5 mr-1" />
                                Win
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-8"
                                disabled={saving}
                                onClick={() => openLostDialog(row)}
                              >
                                <X className="size-3.5 mr-1" />
                                Lost
                              </Button>
                            </>
                          )}
                          {(tab === 'win' || tab === 'lost') && can('sales.update') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={saving}
                              onClick={() => openPitchEdit(row)}
                            >
                              <Pencil className="size-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                          {(tab === 'win' || tab === 'lost') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={saving}
                              onClick={() => openOutcomeDetail(row)}
                            >
                              Detail
                            </Button>
                          )}
                          {tab === 'pipeline' && row.id && (
                            <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/sales/pitch/${row.id}`)}>
                              Detail
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => {
          if (!open) closeDetailDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ringkasan — {detailDialog.data?.title || detailDialog.data?.prospect_name || detailDialog.row?.title || 'Pitch'}
            </DialogTitle>
            <DialogDescription>
              {tab === 'win' ? 'Project Win / Sign Off' : 'Project Lost'}
              {detailDialog.data?.outcome === 'win' && (
                <Badge className="ml-2 bg-emerald-600">Sign Off</Badge>
              )}
              {detailDialog.data?.outcome === 'lost' && (
                <Badge className="ml-2 bg-rose-600">Lost</Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailDialog.loading ? (
            <p className="text-sm text-slate-500 py-6">Memuat ringkasan...</p>
          ) : detailSummarySections.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">Tidak ada data ringkasan.</p>
          ) : (
            <div className="space-y-4 py-2">
              {detailSummarySections.map((section) => (
                <div key={section.title} className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {section.title}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {section.rows.map((r) => (
                        <tr key={`${section.title}-${r.label}`} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pl-3 pr-4 align-top text-slate-500 w-[40%]">{r.label}</td>
                          <td className="py-2 pr-3 align-top text-slate-800 dark:text-slate-200 break-words">
                            {r.quotationVersion ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant={r.quotationVersion.label === 'old' ? 'outline' : 'default'}
                                    className={r.quotationVersion.label === 'new' ? 'bg-primary shrink-0' : 'shrink-0'}
                                  >
                                    {r.quotationVersion.tag}
                                  </Badge>
                                  {r.valueMeta && (
                                    <span className="text-xs text-slate-500">{r.valueMeta}</span>
                                  )}
                                </div>
                                {r.value !== '—' && String(r.value).startsWith('http') && (
                                  <a href={r.value} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all text-xs block">
                                    Buka PDF
                                  </a>
                                )}
                              </div>
                            ) : r.label === 'Quotation PDF' && r.value !== '—' && String(r.value).startsWith('http') ? (
                              <a href={r.value} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                                {r.value}
                              </a>
                            ) : (
                              r.value
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
            <Button type="button" variant="outline" onClick={closeDetailDialog}>
              Tutup
            </Button>
            {detailDialog.data?.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  closeDetailDialog();
                  navigate(`/sales/pitch/${detailDialog.data.id}?step=closed`);
                }}
              >
                Buka halaman pitch
              </Button>
            )}
            {detailDialog.data?.project_id && !detailDialog.data?.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  closeDetailDialog();
                  navigate(`/board/${detailDialog.data.project_id}`);
                }}
              >
                Buka board
              </Button>
            )}
            {can('sales.update') && detailDialog.data && (
              <Button
                type="button"
                onClick={() => openPitchEdit(detailDialog.data || detailDialog.row, { closeDetail: true })}
                disabled={saving || (!detailDialog.data?.id && !detailDialog.row?.presale_id)}
              >
                <Pencil className="size-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pitchEditDialog.open}
        onOpenChange={(open) => {
          if (!open) closePitchEditDialog();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit — {pitchEditDialog.data?.title || pitchEditDialog.row?.title || 'Pitch'}
            </DialogTitle>
            <DialogDescription>
              Semua field yang tampil di ringkasan detail dapat dikoreksi di sini.
            </DialogDescription>
          </DialogHeader>
          {pitchEditDialog.loading ? (
            <p className="text-sm text-slate-500 py-8">Memuat data...</p>
          ) : (
            <PitchOutcomeEditForm
              editForm={pitchEditForm}
              setEditForm={setPitchEditForm}
              formOptions={formOptions}
              pitch={pitchEditDialog.data || pitchEditDialog.row}
              tab={tab}
              isPresale={pitchEditDialog.row?.win_entry_type === 'presale'}
              disabled={saving || !can('sales.update')}
              onToggleCategoryProject={togglePitchEditCategoryProject}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closePitchEditDialog} disabled={saving}>
              Batal
            </Button>
            <Button type="button" disabled={saving || pitchEditDialog.loading} onClick={submitPitchEdit}>
              {saving ? 'Menyimpan...' : 'Simpan perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={outcomeDialog.open && outcomeDialog.mode === 'win'}
        onOpenChange={(open) => {
          if (!open) closeOutcomeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tandai sebagai Sign Off</DialogTitle>
            <DialogDescription>
              Lengkapi data berikut untuk reporting dan pembuatan New Project dari Project Win.
              {outcomeDialog.row?.win_entry_type === 'presale' ? (
                <span className="block mt-1 text-amber-700 dark:text-amber-300">
                  Project ini berasal dari board dan belum terhubung ke sales pitch.
                </span>
              ) : null}
              {outcomeDialog.row ? (
                <span className="block mt-1 font-medium text-slate-700 dark:text-slate-200">
                  {outcomeDialog.row.title || outcomeDialog.row.prospect_name}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Perusahaan (wajib)</span>
              <Select
                value={outcomeForm.company_id}
                onValueChange={(v) => setOutcomeForm((p) => ({ ...p, company_id: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FK_NONE}>Pilih perusahaan</SelectItem>
                  {formOptions.companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Kategori company (wajib)</span>
              <Select
                value={outcomeForm.project_category_id}
                onValueChange={(v) => setOutcomeForm((p) => ({ ...p, project_category_id: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FK_NONE}>Pilih kategori</SelectItem>
                  {formOptions.company_categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="space-y-2">
              <span className="text-sm font-medium">Kategori project</span>
              <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-3 space-y-2 dark:border-slate-700">
                {formOptions.category_projects.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada kategori di master.</p>
                ) : (
                  formOptions.category_projects.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={outcomeForm.sales_category_project_ids.includes(String(c.id))}
                        onCheckedChange={() => toggleOutcomeCategoryProject(c.id)}
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Estimasi nilai</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={outcomeForm.estimated_value}
                  onChange={(e) => setOutcomeForm((p) => ({ ...p, estimated_value: e.target.value }))}
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Harga final deal (wajib)</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={outcomeForm.final_deal_value}
                  onChange={(e) => setOutcomeForm((p) => ({ ...p, final_deal_value: e.target.value }))}
                />
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeOutcomeDialog} disabled={saving}>
              Batal
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
              onClick={submitWinFromList}
            >
              {saving
                ? 'Menyimpan...'
                : outcomeDialog.row?.win_entry_type === 'presale'
                  ? 'Simpan & hubungkan'
                  : outcomeDialog.row?.outcome === 'win'
                    ? 'Simpan perubahan'
                    : 'Simpan & Sign Off'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={outcomeDialog.open && outcomeDialog.mode === 'lost'}
        onOpenChange={(open) => {
          if (!open) closeOutcomeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tandai sebagai Lost</DialogTitle>
            <DialogDescription>
              Pitch akan dipindah ke tab Project Lost dan tidak bisa diedit lagi di pipeline.
              {outcomeDialog.row ? (
                <span className="block mt-1 font-medium text-slate-700 dark:text-slate-200">
                  {outcomeDialog.row.title || outcomeDialog.row.prospect_name}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeOutcomeDialog} disabled={saving}>
              Batal
            </Button>
            <Button type="button" variant="destructive" disabled={saving} onClick={submitLostFromList}>
              {saving ? 'Menyimpan...' : 'Konfirmasi Lost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
