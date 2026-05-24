import { FK_NONE } from './salesPitchConstants';
import { buildQuotationFromPitch, quotationPayloadForApi } from './salesQuotationDefaults';

export { FK_NONE };

function parseYesNoField(stored) {
  const v = String(stored ?? '').trim().toLowerCase();
  if (v === 'yes' || v === 'ya') return 'yes';
  if (v === 'no' || v === 'tidak') return 'no';
  return '';
}

function parseMeetingHasFromPitch(p) {
  if (!p) return '';
  if (p.meeting_mode === 'no') return 'no';
  if (p.meeting_at || p.meeting_mode === 'online' || p.meeting_mode === 'offline') return 'yes';
  return '';
}

export function pitchToEditForm(pitch) {
  if (!pitch) {
    return {
      title: '',
      company_id: FK_NONE,
      project_category_id: FK_NONE,
      sales_category_project_ids: [],
      estimated_value: '',
      final_deal_value: '',
      email: '',
      phone: '',
      notes: '',
      lead_started_at: '',
      compro_sent: '',
      proposal_sent: '',
      meeting_has: '',
      meeting_date: '',
      meeting_location: '',
      meeting_mode: FK_NONE,
      negotiation_regenerate_quote: '',
      quotation: buildQuotationFromPitch(null, null),
    };
  }

  return {
    title: pitch.title || pitch.prospect_name || '',
    company_id: pitch.company_id != null ? String(pitch.company_id) : FK_NONE,
    project_category_id: pitch.project_category_id != null ? String(pitch.project_category_id) : FK_NONE,
    sales_category_project_ids: Array.isArray(pitch.sales_category_project_ids)
      ? pitch.sales_category_project_ids.map(String)
      : [],
    estimated_value: pitch.estimated_value != null ? String(pitch.estimated_value) : '',
    final_deal_value:
      pitch.final_deal_value != null && pitch.final_deal_value !== ''
        ? String(pitch.final_deal_value)
        : '',
    email: pitch.email || '',
    phone: pitch.phone || '',
    notes: pitch.notes || '',
    lead_started_at: pitch.lead_started_at ? String(pitch.lead_started_at).slice(0, 10) : '',
    compro_sent: parseYesNoField(pitch.compro_url),
    proposal_sent: parseYesNoField(pitch.proposal_url),
    meeting_has: parseMeetingHasFromPitch(pitch),
    meeting_date: pitch.meeting_at ? String(pitch.meeting_at).slice(0, 10) : '',
    meeting_location: pitch.meeting_location || '',
    meeting_mode:
      pitch.meeting_mode === 'online' || pitch.meeting_mode === 'offline' ? pitch.meeting_mode : FK_NONE,
    negotiation_regenerate_quote:
      pitch.quotation_data?.negotiation_regenerate_quote === 'yes' ||
      pitch.quotation_data?.negotiation_regenerate_quote === 'no'
        ? pitch.quotation_data.negotiation_regenerate_quote
        : '',
    quotation: buildQuotationFromPitch(pitch, pitch.quotation_data),
    _quotation_history: Array.isArray(pitch.quotation_data?.quotation_history)
      ? pitch.quotation_data.quotation_history
      : [],
  };
}

function buildMeetingPayload(editForm) {
  if (editForm.meeting_has === 'no') {
    return { meeting_at: null, meeting_location: null, meeting_mode: 'no' };
  }
  if (editForm.meeting_has === 'yes') {
    const date = (editForm.meeting_date || '').trim();
    const mode = editForm.meeting_mode !== FK_NONE ? editForm.meeting_mode : null;
    return {
      meeting_at: date || null,
      meeting_location: mode === 'offline' ? (editForm.meeting_location || '').trim() || null : null,
      meeting_mode: mode,
    };
  }
  return { meeting_at: null, meeting_location: null, meeting_mode: null };
}

/**
 * @param {ReturnType<typeof pitchToEditForm>} editForm
 * @param {{ outcome?: string, toFk: (v: string) => number|null }} opts
 */
export function editFormToApiPayload(editForm, { outcome, toFk }) {
  const meeting = buildMeetingPayload(editForm);
  const qPayload = quotationPayloadForApi(
    editForm.quotation,
    editForm.negotiation_regenerate_quote || null,
  );
  const existingHistory = editForm._quotation_history;
  if (Array.isArray(existingHistory) && existingHistory.length > 0) {
    qPayload.quotation_history = existingHistory;
  }

  const payload = {
    title: (editForm.title || '').trim() || undefined,
    prospect_name: (editForm.title || '').trim() || undefined,
    company_id: toFk(editForm.company_id),
    project_category_id: toFk(editForm.project_category_id),
    sales_category_project_ids: editForm.sales_category_project_ids.map((id) => Number(id)),
    estimated_value: editForm.estimated_value !== '' ? Number(editForm.estimated_value) : null,
    email: editForm.email.trim() || null,
    phone: editForm.phone.trim() || null,
    notes: editForm.notes.trim() || null,
    lead_started_at: editForm.lead_started_at || null,
    compro_url: editForm.compro_sent || null,
    proposal_url: editForm.proposal_sent || null,
    quotation_data: qPayload,
    ...meeting,
  };

  if (outcome === 'win') {
    const finalNum = Number(editForm.final_deal_value);
    if (Number.isFinite(finalNum) && finalNum >= 0) {
      payload.final_deal_value = finalNum;
    }
  } else if (editForm.final_deal_value !== '') {
    const finalNum = Number(editForm.final_deal_value);
    if (Number.isFinite(finalNum) && finalNum >= 0) {
      payload.final_deal_value = finalNum;
    }
  }

  return payload;
}
