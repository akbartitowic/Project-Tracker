import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import QuotationForm from './QuotationForm';
import { FK_NONE } from '../../utils/salesPitchConstants';
import { formatQuotationVersionLine, getQuotationVersions } from '../../utils/salesPitchQuotationVersions';

function YesNoButtons({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={value === 'yes' ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => onChange('yes')}>
        Ya
      </Button>
      <Button type="button" variant={value === 'no' ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => onChange('no')}>
        Tidak
      </Button>
    </div>
  );
}

export default function PitchOutcomeEditForm({
  editForm,
  setEditForm,
  formOptions,
  pitch,
  tab,
  isPresale,
  disabled,
  onToggleCategoryProject,
}) {
  const set = (key, value) => setEditForm((p) => ({ ...p, [key]: value }));
  const quotationVersions = pitch ? getQuotationVersions(pitch) : [];
  const requireFinalDeal = tab === 'win' || pitch?.outcome === 'win';

  return (
    <div className="space-y-6 py-2">
      <fieldset className="space-y-4 rounded-md border border-slate-200 p-4 dark:border-slate-700">
        <legend className="px-1 text-sm font-semibold">Informasi umum</legend>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Nama project</span>
          <Input value={editForm.title} onChange={(e) => set('title', e.target.value)} disabled={disabled} />
        </label>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Perusahaan (wajib)</span>
          <Select value={editForm.company_id} onValueChange={(v) => set('company_id', v)} disabled={disabled}>
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
          <Select value={editForm.project_category_id} onValueChange={(v) => set('project_category_id', v)} disabled={disabled}>
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
                    checked={editForm.sales_category_project_ids.includes(String(c.id))}
                    onCheckedChange={() => onToggleCategoryProject(c.id)}
                    disabled={disabled}
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
            <Input type="number" min="0" step="0.01" value={editForm.estimated_value} onChange={(e) => set('estimated_value', e.target.value)} disabled={disabled} />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Mulai lead</span>
            <Input type="date" value={editForm.lead_started_at} onChange={(e) => set('lead_started_at', e.target.value)} disabled={disabled} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Email</span>
            <Input type="email" value={editForm.email} onChange={(e) => set('email', e.target.value)} disabled={disabled} />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Telepon</span>
            <Input value={editForm.phone} onChange={(e) => set('phone', e.target.value)} disabled={disabled} />
          </label>
        </div>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Catatan</span>
          <Textarea rows={3} value={editForm.notes} onChange={(e) => set('notes', e.target.value)} disabled={disabled} />
        </label>
      </fieldset>

      {!isPresale && (
        <>
          <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-1 text-sm font-semibold">2. Sent Compro</legend>
            <span className="text-sm font-medium block">Sudah kirim compro?</span>
            <YesNoButtons value={editForm.compro_sent} onChange={(v) => set('compro_sent', v)} disabled={disabled} />
          </fieldset>

          <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-1 text-sm font-semibold">3. Proposal Sent</legend>
            <span className="text-sm font-medium block">Sudah kirim proposal?</span>
            <YesNoButtons value={editForm.proposal_sent} onChange={(v) => set('proposal_sent', v)} disabled={disabled} />
            {quotationVersions.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-sm font-medium block">File quotation</span>
                {quotationVersions.map((v) => (
                  <div
                    key={`${v.label}-${v.url}-${v.quote_no}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 p-2 text-sm"
                  >
                    <Badge variant={v.label === 'old' ? 'outline' : 'default'} className={v.label === 'new' ? 'bg-primary' : ''}>
                      {v.tag}
                    </Badge>
                    <span className="text-slate-600 dark:text-slate-300">{formatQuotationVersionLine(v)}</span>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs ml-auto">
                        Buka PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-3">Edit data quotation aktif (versi terbaru). Generate ulang PDF dari halaman pitch jika perlu file baru.</p>
              <QuotationForm
                quotation={editForm.quotation}
                onChange={(quotation) => setEditForm((p) => ({ ...p, quotation }))}
                disabled={disabled}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-1 text-sm font-semibold">4. Presentation</legend>
            <span className="text-sm font-medium block">Ada presentation?</span>
            <YesNoButtons value={editForm.meeting_has} onChange={(v) => set('meeting_has', v)} disabled={disabled} />
            {editForm.meeting_has === 'yes' && (
              <div className="space-y-3 pt-2">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Tanggal</span>
                  <Input type="date" value={editForm.meeting_date} onChange={(e) => set('meeting_date', e.target.value)} disabled={disabled} />
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Mode</span>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={editForm.meeting_mode === 'online' ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => set('meeting_mode', 'online')}>
                      Online
                    </Button>
                    <Button type="button" variant={editForm.meeting_mode === 'offline' ? 'default' : 'outline'} size="sm" disabled={disabled} onClick={() => set('meeting_mode', 'offline')}>
                      Offline
                    </Button>
                  </div>
                </div>
                {editForm.meeting_mode === 'offline' && (
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium">Lokasi</span>
                    <Input value={editForm.meeting_location} onChange={(e) => set('meeting_location', e.target.value)} disabled={disabled} />
                  </label>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
            <legend className="px-1 text-sm font-semibold">5. Negotiation</legend>
            <span className="text-sm font-medium block">Perlu generate ulang quotation?</span>
            <YesNoButtons
              value={editForm.negotiation_regenerate_quote}
              onChange={(v) => set('negotiation_regenerate_quote', v)}
              disabled={disabled}
            />
            <label className="space-y-2 block">
              <span className="text-sm font-medium">
                Harga final deal
                {requireFinalDeal ? ' (wajib untuk Sign Off)' : ''}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.final_deal_value}
                onChange={(e) => set('final_deal_value', e.target.value)}
                disabled={disabled}
              />
            </label>
          </fieldset>
        </>
      )}

      {isPresale && (
        <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">Sign Off</legend>
          <label className="space-y-2 block">
            <span className="text-sm font-medium">Harga final deal (wajib)</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editForm.final_deal_value}
              onChange={(e) => set('final_deal_value', e.target.value)}
              disabled={disabled}
            />
          </label>
        </fieldset>
      )}
    </div>
  );
}
