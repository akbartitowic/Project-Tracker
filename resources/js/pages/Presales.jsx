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

const TAB_KEYS = ['Business', 'Tech', 'Operation'];
const TAB_TO_PATH = {
  Business: 'business',
  Tech: 'tech',
  Operation: 'operation',
};
const PATH_TO_TAB = {
  business: 'Business',
  tech: 'Tech',
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

  const [selectedId, setSelectedId] = useState(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newForm, setNewForm] = useState({
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
  const [developmentMh, setDevelopmentMh] = useState({});
  const [operationAssignments, setOperationAssignments] = useState({});
  const [businessReadyToAcknowledge, setBusinessReadyToAcknowledge] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    company_id: '',
    project_name: '',
    project_category_id: '',
    estimated_budget: '',
    project_description: '',
  });

  const selected = useMemo(
    () => presales.find((item) => item.id?.toString() === selectedId?.toString()) || null,
    [presales, selectedId]
  );

  const canOpenTech = !!selected?.business_acknowledged_at;
  const canOpenOperation = !!selected?.development_acknowledged_at;
  const isProceeded = !!selected?.converted_project_id;
  const canProceed =
    !!selected?.business_acknowledged_at &&
    !!selected?.development_acknowledged_at &&
    !!selected?.operation_acknowledged_at &&
    !isProceeded;
  const activeTab = PATH_TO_TAB[(view || '').toLowerCase()] || 'Business';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [presaleRes, companyRes, categoryRes, roleRes, userRes] = await Promise.all([
        fetchAPI('/presales'),
        fetchAPI('/companies'),
        fetchAPI('/project-categories'),
        fetchAPI('/project-roles'),
        fetchAPI('/users'),
      ]);

      const items = presaleRes.data || [];
      setPresales(items);
      setCompanies(companyRes.data || []);
      setProjectCategories(categoryRes.data || []);
      setProjectRoles(roleRes.data || []);
      setUsers(userRes.data || []);
      if (!selectedId && items.length) setSelectedId(items[0].id);
    } catch (error) {
      alert('Gagal memuat data presales: ' + error.message);
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

    const devMap = {};
    roleReq.forEach((r) => {
      devMap[r.project_role_id] = r.development_mh ?? '';
    });
    setDevelopmentMh(devMap);

    const opMap = {};
    (selected.operation_assignments || []).forEach((a) => {
      if (!opMap[a.project_role_id]) opMap[a.project_role_id] = [];
      opMap[a.project_role_id].push(a.user_id);
    });
    setOperationAssignments(opMap);
    // Require explicit save before acknowledging, per request.
    setBusinessReadyToAcknowledge(false);
  }, [selected]);

  const updateBusinessForm = (updater) => {
    setBusinessForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
    setBusinessReadyToAcknowledge(false);
  };

  const createOpportunity = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetchAPI('/presales', {
        method: 'POST',
        body: JSON.stringify({
          company_id: parseInt(newForm.company_id),
          project_name: newForm.project_name,
          project_category_id: parseInt(newForm.project_category_id),
          estimated_budget: Number(newForm.estimated_budget),
          project_description: newForm.project_description,
        }),
      });
      setIsNewOpen(false);
      setNewForm({
        company_id: '',
        project_name: '',
        project_category_id: '',
        estimated_budget: '',
        project_description: '',
      });
      await loadAll();
      if (res?.id) setSelectedId(res.id);
    } catch (error) {
      alert(error.message);
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
      alert('Opportunity berhasil diupdate.');
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBusiness = async () => {
    if (!selected) return;
    try {
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
      await loadAll();
      setBusinessReadyToAcknowledge(true);
      alert('Data Business tersimpan.');
    } catch (error) {
      alert(`Gagal menyimpan data Business: ${error.message}`);
    }
  };

  const acknowledgeBusiness = async () => {
    if (!selected) return;
    if (!businessReadyToAcknowledge) {
      alert('Silakan klik Save Business terlebih dahulu sebelum Acknowledge.');
      return;
    }
    try {
      await fetchAPI(`/presales/${selected.id}/business/acknowledge`, { method: 'POST' });
      await loadAll();
      setBusinessReadyToAcknowledge(false);
      alert('Business acknowledged.');
    } catch (error) {
      alert(`Gagal acknowledge Business: ${error.message}`);
    }
  };

  const saveDevelopment = async () => {
    if (!selected) return;
    try {
      await fetchAPI(`/presales/${selected.id}/development`, {
        method: 'PUT',
        body: JSON.stringify({
          development_role_mh: developmentMh,
        }),
      });
      await loadAll();
      alert('Data Tech tersimpan.');
    } catch (error) {
      alert(error.message);
    }
  };

  const acknowledgeDevelopment = async () => {
    if (!selected) return;
    try {
      // Acknowledge hanya baca data di server. Untuk Agile Scrum, MH tech harus sudah tersimpan
      // lewat PUT /development — tanpa save, isian form belum masuk DB dan acknowledge gagal.
      if (selected.methodology === 'Agile Scrum') {
        await fetchAPI(`/presales/${selected.id}/development`, {
          method: 'PUT',
          body: JSON.stringify({
            development_role_mh: developmentMh,
          }),
        });
      }
      await fetchAPI(`/presales/${selected.id}/development/acknowledge`, { method: 'POST' });
      await loadAll();
      alert('Development acknowledged.');
    } catch (error) {
      alert(error.message);
    }
  };

  const saveOperation = async () => {
    if (!selected) return;
    try {
      const assignments = businessForm.role_ids.map((roleId) => ({
        project_role_id: roleId,
        user_ids: operationAssignments[roleId] || [],
      }));
      await fetchAPI(`/presales/${selected.id}/operation`, {
        method: 'PUT',
        body: JSON.stringify({ assignments }),
      });
      await loadAll();
      alert('Data Operation tersimpan.');
    } catch (error) {
      alert(error.message);
    }
  };

  const acknowledgeOperation = async () => {
    if (!selected) return;
    try {
      await fetchAPI(`/presales/${selected.id}/operation/acknowledge`, { method: 'POST' });
      await loadAll();
      alert('Operation acknowledged.');
    } catch (error) {
      alert(error.message);
    }
  };

  const proceedProject = async () => {
    if (!selected) return;
    try {
      const res = await fetchAPI(`/presales/${selected.id}/proceed-project`, { method: 'POST' });
      if (res.project_id) navigate(`/board/${res.project_id}`);
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleRole = (roleId) => {
    updateBusinessForm((prev) => {
      const exists = prev.role_ids.includes(roleId);
      const role_ids = exists ? prev.role_ids.filter((id) => id !== roleId) : [...prev.role_ids, roleId];
      return { ...prev, role_ids };
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
    return <div className="p-8 text-slate-500">Loading presales flow...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Presales</h1>
          <p className="text-slate-500 mt-1">Flow Business to Tech to Operation sampai Proceed Project.</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="size-4 mr-2" />
          New Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Opportunity List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {presales.length === 0 ? (
              <p className="text-slate-500">Belum ada opportunity.</p>
            ) : (
              presales.map((item) => (
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
                    {item.development_acknowledged_at && (
                      <Badge className="bg-purple-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Tech Ack
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
                    const disabled = (tab === 'Tech' && !canOpenTech) || (tab === 'Operation' && !canOpenOperation);
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
                          disabled={isProceeded}
                          onChange={(e) => updateBusinessForm((prev) => ({ ...prev, total_manhours: e.target.value }))}
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


                    <div className="flex gap-2">
                      <Button onClick={saveBusiness} disabled={isProceeded}>Save Business</Button>
                      <Button variant="outline" onClick={acknowledgeBusiness} disabled={isProceeded || !businessReadyToAcknowledge}>
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'Tech' && (
                  <div className="space-y-4">
                    {businessForm.methodology === 'Agile Scrum' && (
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>
                          Total MH dari Business: <b>{selected.total_manhours || 0}</b>
                        </p>
                        <p className="text-xs text-slate-500">
                          MH Tech dicek terhadap <b>MH Business per role</b> (tersimpan saat Save Business). Angka Total di atas
                          dipakai sebagai batas per role jika breakdown per role tidak diisi.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Role dari Business</p>
                      {businessForm.role_ids.length === 0 ? (
                        <p className="text-slate-500 text-sm">Belum ada role dipilih di Business.</p>
                      ) : (
                        businessForm.role_ids.map((roleId) => {
                          const role = projectRoles.find((r) => r.id === roleId);
                          const reqRow = (selected.role_requirements || []).find(
                            (r) => Number(r.project_role_id) === Number(roleId)
                          );
                          const bizCap =
                            reqRow != null && reqRow.business_mh != null && reqRow.business_mh !== ''
                              ? Number(reqRow.business_mh)
                              : null;
                          return (
                            <div key={roleId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <div className="w-40 shrink-0">
                                <span className="text-sm block">{role?.name || `Role ${roleId}`}</span>
                                {businessForm.methodology === 'Agile Scrum' && (
                                  <span className="text-[10px] text-slate-500">
                                    Batas Business:{' '}
                                    {bizCap != null && !Number.isNaN(bizCap) ? `${bizCap} MH` : '—'}
                                  </span>
                                )}
                              </div>
                              {businessForm.methodology === 'Agile Scrum' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  value={developmentMh[roleId] ?? ''}
                                  disabled={isProceeded}
                                  onChange={(e) => setDevelopmentMh((prev) => ({ ...prev, [roleId]: e.target.value }))}
                                  placeholder="MH Development"
                                />
                              ) : (
                                <span className="text-sm text-slate-500">Waterfall - tanpa input MH</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {businessForm.methodology === 'Agile Scrum' && (
                      <p className="text-xs text-slate-500">
                        Tombol Acknowledge akan menyimpan MH Tech terlebih dahulu, lalu mengunci tab ini.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={saveDevelopment} disabled={isProceeded}>Save Development</Button>
                      <Button variant="outline" onClick={acknowledgeDevelopment} disabled={isProceeded}>
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
                      <Button onClick={saveOperation} disabled={isProceeded}>Save Operation</Button>
                      <Button variant="outline" onClick={acknowledgeOperation} disabled={isProceeded}>
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
            <DialogTitle>New Opportunity</DialogTitle>
            <DialogDescription>Buat opportunity baru dari alur presales.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createOpportunity} className="space-y-4">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Nama Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={newForm.company_id}
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
                onChange={(e) => setNewForm((prev) => ({ ...prev, project_name: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Category Company</span>
              <select
                className="w-full border rounded-md p-2"
                value={newForm.project_category_id}
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
                onChange={(e) => setNewForm((prev) => ({ ...prev, estimated_budget: e.target.value }))}
                required
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium">Deskripsi Project</span>
              <Textarea
                value={newForm.project_description}
                onChange={(e) => setNewForm((prev) => ({ ...prev, project_description: e.target.value }))}
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
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
    </div>
  );
}
