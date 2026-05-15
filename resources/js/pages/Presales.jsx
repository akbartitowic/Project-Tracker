import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Pencil, Plus } from 'lucide-react';
import { MENU_NEW_PROJECT } from '../constants/menuLabels';

const TAB_KEYS = ['Business', 'Operation'];
const TAB_TO_PATH = {
  Business: 'business',
  Operation: 'operation',
};
const PATH_TO_TAB = {
  business: 'Business',
  operation: 'Operation',
};

export default function Presales() {
  const navigate = useNavigate();
  const { view } = useParams();
  const [loading, setLoading] = useState(true);
  const [presales, setPresales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [projectRoles, setProjectRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [winPitches, setWinPitches] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    title: '',
    message: '',
  });

  const [newForm, setNewForm] = useState({
    sales_pitch_id: '',
    company_id: '',
    project_name: '',
    project_category_id: '',
    estimated_budget: '',
    project_description: '',
  });

  const [businessForm, setBusinessForm] = useState({
    deck_url: '',
    quotation_url: '',
    drive_url: '',
    methodology: 'Agile Scrum',
    total_manhours: '',
    role_ids: [],
    role_mh: {},
  });
  const [operationAssignments, setOperationAssignments] = useState({});
  const [editForm, setEditForm] = useState({
    id: null,
    company_id: '',
    project_name: '',
    project_category_id: '',
    estimated_budget: '',
    project_description: '',
  });

  const visiblePresales = useMemo(
    () => presales.filter((item) => !item.converted_project_id),
    [presales]
  );
  const usedWinPitchIds = useMemo(
    () => new Set((presales || []).map((item) => item.sales_pitch_id).filter((id) => id != null)),
    [presales]
  );
  const selected = useMemo(
    () => visiblePresales.find((item) => item.id?.toString() === selectedId?.toString()) || null,
    [visiblePresales, selectedId]
  );

  const canOpenOperation = !!selected?.business_acknowledged_at;
  const isProceeded = !!selected?.converted_project_id;
  const canProceed =
    !!selected?.business_acknowledged_at &&
    !!selected?.operation_acknowledged_at &&
    !isProceeded;
  const activeTab = PATH_TO_TAB[(view || '').toLowerCase()] || 'Business';
  const showFeedback = (title, message) => {
    setFeedbackDialog({
      open: true,
      title,
      message,
    });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [presaleRes, companyRes, categoryRes, roleRes, userRes, winPitchRes] = await Promise.all([
        fetchAPI('/presales'),
        fetchAPI('/companies'),
        fetchAPI('/project-categories'),
        fetchAPI('/project-roles'),
        fetchAPI('/users'),
        fetchAPI('/sales-pitches?tab=win'),
      ]);

      const items = presaleRes.data || [];
      const activeItems = items.filter((item) => !item.converted_project_id);
      setPresales(items);
      setCompanies(companyRes.data || []);
      setProjectCategories(categoryRes.data || []);
      setProjectRoles(roleRes.data || []);
      setUsers(userRes.data || []);
      setWinPitches(winPitchRes.data || []);
      if (!selectedId && activeItems.length) setSelectedId(activeItems[0].id);
    } catch (error) {
      showFeedback('Gagal Memuat Data', 'Gagal memuat data opportunity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const normalized = (view || '').toLowerCase();
    if (!normalized || !PATH_TO_TAB[normalized]) {
      navigate('/presales/business', { replace: true });
    }
  }, [view, navigate]);

  useEffect(() => {
    if (!selected) return;
    const roleReq = selected.role_requirements || [];
    const roleMh = {};
    const roleIds = roleReq.map((r) => r.project_role_id);
    roleReq.forEach((r) => {
      roleMh[r.project_role_id] = r.business_mh ?? '';
    });

    setBusinessForm({
      deck_url: selected.deck_url || '',
      quotation_url: selected.quotation_url || '',
      drive_url: selected.drive_url || '',
      methodology: selected.methodology || 'Agile Scrum',
      total_manhours: selected.total_manhours ?? '',
      role_ids: roleIds,
      role_mh: roleMh,
    });

    const opMap = {};
    (selected.operation_assignments || []).forEach((a) => {
      if (!opMap[a.project_role_id]) opMap[a.project_role_id] = [];
      opMap[a.project_role_id].push(a.user_id);
    });
    setOperationAssignments(opMap);
  }, [selected]);

  useEffect(() => {
    if (visiblePresales.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    const stillExists = visiblePresales.some((item) => item.id?.toString() === selectedId?.toString());
    if (!stillExists) {
      setSelectedId(visiblePresales[0].id);
    }
  }, [visiblePresales, selectedId]);

  const updateBusinessForm = (updater) => {
    setBusinessForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  };
  const lockManualFields = !newForm.sales_pitch_id;

  const applyPitchToNewForm = (pitchIdRaw) => {
    const pitchId = String(pitchIdRaw || '');
    if (!pitchId) {
      setNewForm((prev) => ({ ...prev, sales_pitch_id: '' }));
      return;
    }
    const picked = winPitches.find((p) => String(p.id) === pitchId);
    if (!picked) return;
    if (usedWinPitchIds.has(picked.id)) {
      showFeedback('Sudah dipakai', 'Project Win ini sudah pernah dipilih untuk New Project lain.');
      return;
    }
    setNewForm((prev) => ({
      ...prev,
      sales_pitch_id: pitchId,
      company_id: picked.company_id != null ? String(picked.company_id) : prev.company_id,
      project_name: picked.title || picked.prospect_name || prev.project_name,
      project_category_id: picked.project_category_id != null ? String(picked.project_category_id) : prev.project_category_id,
      estimated_budget:
        picked.final_deal_value != null
          ? String(picked.final_deal_value)
          : (picked.estimated_value != null ? String(picked.estimated_value) : prev.estimated_budget),
      project_description: picked.notes || prev.project_description,
    }));
  };

  const createOpportunity = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetchAPI('/presales', {
        method: 'POST',
        body: JSON.stringify({
          sales_pitch_id: newForm.sales_pitch_id ? parseInt(newForm.sales_pitch_id) : null,
          company_id: parseInt(newForm.company_id),
          project_name: newForm.project_name,
          project_category_id: parseInt(newForm.project_category_id),
          estimated_budget: Number(newForm.estimated_budget),
          project_description: newForm.project_description,
        }),
      });
      setIsNewOpen(false);
      setNewForm({
        sales_pitch_id: '',
        company_id: '',
        project_name: '',
        project_category_id: '',
        estimated_budget: '',
        project_description: '',
      });
      await loadAll();
      if (res?.id) setSelectedId(res.id);
    } catch (error) {
      showFeedback('Gagal Membuat Opportunity', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditOpportunity = (item) => {
    setEditForm({
      id: item.id,
      company_id: item.company_id?.toString() || '',
      project_name: item.project_name || item.name || '',
      project_category_id: item.project_category_id?.toString() || '',
      estimated_budget: item.estimated_budget ?? item.estimated_value ?? '',
      project_description: item.project_description || item.description || '',
    });
    setIsEditOpen(true);
  };

  const updateOpportunity = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;
    setIsSaving(true);
    try {
      await fetchAPI(`/presales/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          company_id: editForm.company_id ? parseInt(editForm.company_id) : null,
          project_name: editForm.project_name,
          project_category_id: editForm.project_category_id ? parseInt(editForm.project_category_id) : null,
          estimated_budget: editForm.estimated_budget !== '' ? Number(editForm.estimated_budget) : null,
          project_description: editForm.project_description || null,
          // keep legacy mirrored fields in sync
          name: editForm.project_name,
          estimated_value: editForm.estimated_budget !== '' ? Number(editForm.estimated_budget) : null,
          description: editForm.project_description || null,
        }),
      });
      setIsEditOpen(false);
      await loadAll();
      showFeedback('Berhasil', 'Opportunity berhasil diupdate.');
    } catch (error) {
      showFeedback('Gagal Update Opportunity', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBusiness = async () => {
    if (!selected) return;
    try {
      await submitBusinessData();
      await loadAll();
      showFeedback('Berhasil', 'Data Business tersimpan.');
    } catch (error) {
      showFeedback('Gagal Simpan Business', `Gagal menyimpan data Business: ${error.message}`);
    }
  };

  const acknowledgeBusiness = async () => {
    if (!selected) return;
    try {
      // Keep UX simple: acknowledge always persists current Business form first.
      await submitBusinessData();
      await fetchAPI(`/presales/${selected.id}/business/acknowledge`, { method: 'POST' });
      await loadAll();
      showFeedback('Berhasil', 'Business acknowledged.');
    } catch (error) {
      showFeedback('Gagal Acknowledge Business', `Gagal acknowledge Business: ${error.message}`);
    }
  };

  const saveOperation = async () => {
    if (!selected) return;
    try {
      await submitOperationData();
      await loadAll();
      showFeedback('Berhasil', 'Data Operation tersimpan.');
    } catch (error) {
      showFeedback('Gagal Simpan Operation', error.message);
    }
  };

  const acknowledgeOperation = async () => {
    if (!selected) return;
    try {
      // Keep UX simple: acknowledge always persists current Operation assignments first.
      await submitOperationData();
      await fetchAPI(`/presales/${selected.id}/operation/acknowledge`, { method: 'POST' });
      await loadAll();
      showFeedback('Berhasil', 'Operation acknowledged.');
    } catch (error) {
      showFeedback('Gagal Acknowledge Operation', error.message);
    }
  };

  const proceedProject = async () => {
    if (!selected) return;
    try {
      const res = await fetchAPI(`/presales/${selected.id}/proceed-project`, { method: 'POST' });
      if (res.project_id) navigate(`/board/${res.project_id}`);
    } catch (error) {
      showFeedback('Gagal Proceed Project', error.message);
    }
  };

  const toggleRole = (roleId) => {
    updateBusinessForm((prev) => {
      const exists = prev.role_ids.includes(roleId);
      const role_ids = exists ? prev.role_ids.filter((id) => id !== roleId) : [...prev.role_ids, roleId];
      const role_mh = { ...(prev.role_mh || {}) };
      if (exists) {
        delete role_mh[roleId];
      } else if (role_mh[roleId] == null) {
        role_mh[roleId] = '';
      }
      return { ...prev, role_ids, role_mh };
    });
  };

  useEffect(() => {
    if (businessForm.methodology !== 'Agile Scrum') return;
    const total = businessForm.role_ids.reduce((sum, roleId) => {
      const raw = businessForm.role_mh?.[roleId];
      const num = raw === '' || raw == null ? 0 : Number(raw);
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
    const nextTotal = total === 0 ? '' : String(total);
    if (String(businessForm.total_manhours ?? '') !== nextTotal) {
      setBusinessForm((prev) => ({ ...prev, total_manhours: nextTotal }));
    }
  }, [businessForm.methodology, businessForm.role_ids, businessForm.role_mh, businessForm.total_manhours]);

  const submitBusinessData = async () => {
    if (!selected) return;
    await fetchAPI(`/presales/${selected.id}/business`, {
      method: 'PUT',
      body: JSON.stringify({
        deck_url: businessForm.deck_url,
        quotation_url: businessForm.quotation_url,
        drive_url: businessForm.drive_url,
        methodology: businessForm.methodology,
        total_manhours:
          businessForm.methodology === 'Agile Scrum' ? Number(businessForm.total_manhours || 0) : null,
        project_role_ids: businessForm.role_ids,
        business_role_mh: businessForm.role_mh,
      }),
    });
  };

  const submitOperationData = async () => {
    if (!selected) return;
    const assignments = businessForm.role_ids.map((roleId) => ({
      project_role_id: roleId,
      user_ids: operationAssignments[roleId] || [],
    }));
    await fetchAPI(`/presales/${selected.id}/operation`, {
      method: 'PUT',
      body: JSON.stringify({ assignments }),
    });
  };

  const setAssignmentUsers = (roleId, userId, checked) => {
    setOperationAssignments((prev) => {
      const existing = prev[roleId] || [];
      const next = checked ? [...existing, userId] : existing.filter((id) => id !== userId);
      return { ...prev, [roleId]: Array.from(new Set(next)) };
    });
  };

  if (loading) {
    return <div className="p-4 text-slate-500 sm:p-6 lg:p-8">Memuat {MENU_NEW_PROJECT}...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{MENU_NEW_PROJECT}</h1>
          <p className="text-slate-500 mt-1">
            Untuk opportunity dengan goals dan scope yang sudah pasti — alur Business dan Operation sampai Proceed ke List Project dan Board.
          </p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="size-4 mr-2" />
          {MENU_NEW_PROJECT}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>New Project List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {visiblePresales.length === 0 ? (
              <div className="space-y-3">
                <p className="text-slate-500">Tidak ada opportunity aktif. Project yang sudah proceed dapat dilihat di List Project.</p>
                <Button variant="outline" onClick={() => navigate('/create-project')}>
                  Go to List Project
                </Button>
              </div>
            ) : (
              visiblePresales.map((item) => (
                <div
                  key={item.id}
                  className={`w-full text-left border rounded-lg p-3 transition cursor-pointer ${
                    selectedId === item.id ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.project_name || item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.company?.name || '-'} - {item.project_category?.name || '-'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={!!item.converted_project_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditOpportunity(item);
                      }}
                      title="Edit Opportunity"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                    {item.business_acknowledged_at && (
                      <Badge className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Business Ack
                      </Badge>
                    )}
                    {item.operation_acknowledged_at && (
                      <Badge className="bg-green-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Operation Ack
                      </Badge>
                    )}
                    {item.converted_project_id && (
                      <Badge className="bg-emerald-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Proceeded
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          {!selected ? (
            <CardContent className="p-8 text-slate-500">Pilih opportunity dulu.</CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle>{selected.project_name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {selected.company?.name || '-'} | {selected.project_category?.name || '-'}
                    </p>
                    {isProceeded && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        Opportunity sudah di-proceed ke project board, semua field dikunci.
                      </p>
                    )}
                  </div>
                  {canProceed && (
                    <Button onClick={proceedProject}>
                      <CheckCircle2 className="size-4 mr-2" />
                      Proceed Project
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  {TAB_KEYS.map((tab) => {
                    const disabled = tab === 'Operation' && !canOpenOperation;
                    return (
                      <Button
                        key={tab}
                        variant={activeTab === tab ? 'default' : 'outline'}
                        disabled={disabled}
                        onClick={() => navigate(`/presales/${TAB_TO_PATH[tab]}`)}
                      >
                        {tab}
                      </Button>
                    );
                  })}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {activeTab === 'Business' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium">Deck URL</span>
                        <Input
                          value={businessForm.deck_url}
                          disabled={isProceeded}
                          onChange={(e) => updateBusinessForm((prev) => ({ ...prev, deck_url: e.target.value }))}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium">Quotation URL</span>
                        <Input
                          value={businessForm.quotation_url}
                          disabled={isProceeded}
                          onChange={(e) => updateBusinessForm((prev) => ({ ...prev, quotation_url: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="space-y-2 block">
                      <span className="text-sm font-medium">Google Drive URL</span>
                      <Input
                        value={businessForm.drive_url}
                        disabled={isProceeded}
                        onChange={(e) => updateBusinessForm((prev) => ({ ...prev, drive_url: e.target.value }))}
                      />
                    </label>

                    <div>
                      <p className="text-sm font-medium mb-2">Methodology</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={businessForm.methodology === 'Agile Scrum'}
                            disabled={isProceeded}
                            onChange={() => updateBusinessForm((prev) => ({ ...prev, methodology: 'Agile Scrum' }))}
                          />
                          Agile Scrum
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={businessForm.methodology === 'Waterfall'}
                            disabled={isProceeded}
                            onChange={() => updateBusinessForm((prev) => ({ ...prev, methodology: 'Waterfall' }))}
                          />
                          Waterfall
                        </label>
                      </div>
                    </div>

                    {businessForm.methodology === 'Agile Scrum' && (
                      <label className="space-y-2 block">
                        <span className="text-sm font-medium">Total MH</span>
                        <Input
                          type="number"
                          min="0"
                          value={businessForm.total_manhours}
                          disabled
                          readOnly
                        />
                      </label>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Kebutuhan Role</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {projectRoles.map((role) => (
                          <label key={role.id} className="border rounded p-2 flex items-center justify-between">
                            <span>{role.name}</span>
                            <input
                              type="checkbox"
                              checked={businessForm.role_ids.includes(role.id)}
                              disabled={isProceeded}
                              onChange={() => toggleRole(role.id)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    {businessForm.methodology === 'Agile Scrum' && businessForm.role_ids.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">MH Business per Role</p>
                        <div className="space-y-2">
                          {businessForm.role_ids.map((roleId) => {
                            const role = projectRoles.find((r) => r.id === roleId);
                            return (
                              <div key={roleId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="w-40 shrink-0 text-sm">{role?.name || `Role ${roleId}`}</div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  value={businessForm.role_mh?.[roleId] ?? ''}
                                  disabled={isProceeded}
                                  onChange={(e) =>
                                    updateBusinessForm((prev) => ({
                                      ...prev,
                                      role_mh: { ...(prev.role_mh || {}), [roleId]: e.target.value },
                                    }))
                                  }
                                  placeholder="Isi MH role"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    <div className="flex gap-2">
                      <Button onClick={acknowledgeBusiness} disabled={isProceeded}>
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'Operation' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Pilih user berdasarkan role yang sudah disepakati.</p>
                    {businessForm.role_ids.map((roleId) => {
                      const role = projectRoles.find((r) => r.id === roleId);
                      return (
                        <div key={roleId} className="border rounded-lg p-3 space-y-2">
                          <p className="font-medium">{role?.name || `Role ${roleId}`}</p>
                          <div className="grid md:grid-cols-2 gap-2">
                            {users.map((user) => {
                              const checked = (operationAssignments[roleId] || []).includes(user.id);
                              return (
                                <label key={user.id} className="border rounded p-2 flex items-center justify-between">
                                  <span className="text-sm">
                                    {user.name} <span className="text-slate-400">({user.role?.name || user.role})</span>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isProceeded}
                                    onChange={(e) => setAssignmentUsers(roleId, user.id, e.target.checked)}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      <Button onClick={acknowledgeOperation} disabled={isProceeded}>
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{MENU_NEW_PROJECT}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createOpportunity} className="space-y-4">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Sumber Project Win</span>
              <select
                className="w-full border rounded-md p-2"
                value={newForm.sales_pitch_id}
                onChange={(e) => applyPitchToNewForm(e.target.value)}
              >
                <option value="">Pilih dari Sales - Project Win</option>
                {winPitches.map((pitch) => {
                  const used = usedWinPitchIds.has(pitch.id);
                  return (
                    <option key={pitch.id} value={pitch.id} disabled={used}>
                      {`${pitch.title || pitch.prospect_name || `Pitch #${pitch.id}`} - ${pitch.company_name || '-'}${used ? ' (sudah dipakai)' : ''}`}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Nama Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={newForm.company_id}
                disabled={lockManualFields}
                onChange={(e) => setNewForm((prev) => ({ ...prev, company_id: e.target.value }))}
                required
              >
                <option value="">Pilih company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Project Name</span>
              <Input
                value={newForm.project_name}
                disabled={lockManualFields}
                onChange={(e) => setNewForm((prev) => ({ ...prev, project_name: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Category Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={newForm.project_category_id}
                disabled={lockManualFields}
                onChange={(e) => setNewForm((prev) => ({ ...prev, project_category_id: e.target.value }))}
                required
              >
                <option value="">Pilih category</option>
                {projectCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Estimasi Budget (IDR)</span>
              <Input
                type="number"
                min="0"
                value={newForm.estimated_budget}
                disabled={lockManualFields}
                onChange={(e) => setNewForm((prev) => ({ ...prev, estimated_budget: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Deskripsi Project</span>
              <Textarea
                value={newForm.project_description}
                disabled={lockManualFields}
                onChange={(e) => setNewForm((prev) => ({ ...prev, project_description: e.target.value }))}
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || lockManualFields}>
                {isSaving ? 'Saving...' : 'Create Opportunity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>Ubah data utama opportunity dari list.</DialogDescription>
          </DialogHeader>
          <form onSubmit={updateOpportunity} className="space-y-4">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Nama Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={editForm.company_id}
                onChange={(e) => setEditForm((prev) => ({ ...prev, company_id: e.target.value }))}
                required
              >
                <option value="">Pilih company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Project Name</span>
              <Input
                value={editForm.project_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, project_name: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Category Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={editForm.project_category_id}
                onChange={(e) => setEditForm((prev) => ({ ...prev, project_category_id: e.target.value }))}
                required
              >
                <option value="">Pilih category</option>
                {projectCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Estimasi Budget (IDR)</span>
              <Input
                type="number"
                min="0"
                value={editForm.estimated_budget}
                onChange={(e) => setEditForm((prev) => ({ ...prev, estimated_budget: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Deskripsi Project</span>
              <Textarea
                value={editForm.project_description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, project_description: e.target.value }))}
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={feedbackDialog.open}
        onOpenChange={(open) => setFeedbackDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{feedbackDialog.title}</DialogTitle>
            <DialogDescription>{feedbackDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setFeedbackDialog((prev) => ({ ...prev, open: false }))}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
