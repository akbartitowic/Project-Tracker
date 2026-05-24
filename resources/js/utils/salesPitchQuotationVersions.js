import { buildQuotationFromPitch, formatIdr, quotationTotal } from './salesQuotationDefaults';

/**
 * @param {Record<string, unknown>|null|undefined} pitch
 * @returns {{ tag: string, label: 'old' | 'new', url: string, quote_no: string, total: number, saved_at?: string }[]}
 */
export function getQuotationVersions(pitch) {
  if (!pitch) return [];

  const versions = [];
  const history = pitch.quotation_data?.quotation_history;

  if (Array.isArray(history)) {
    history.forEach((entry, index) => {
      const data = entry?.quotation_data || {};
      const url = String(entry?.quotation_url || '').trim();
      if (!url && !data?.quote_no) return;
      versions.push({
        tag: history.length > 1 ? `Old Quotation ${index + 1}` : 'Old Quotation',
        label: 'old',
        url,
        quote_no: String(data.quote_no || '—'),
        total: quotationTotal(buildQuotationFromPitch(pitch, data)),
        saved_at: entry?.saved_at,
      });
    });
  }

  const currentUrl = String(pitch.quotation_url || '').trim();
  const currentData = pitch.quotation_data || {};
  if (currentUrl || currentData?.quote_no) {
    const hasOld = versions.length > 0;
    versions.push({
      tag: hasOld ? 'New Quotation' : 'Quotation',
      label: hasOld ? 'new' : 'new',
      url: currentUrl,
      quote_no: String(currentData.quote_no || '—'),
      total: quotationTotal(buildQuotationFromPitch(pitch, currentData)),
    });
  }

  return versions;
}

export function formatQuotationVersionLine(v) {
  const parts = [v.tag];
  if (v.quote_no && v.quote_no !== '—') parts.push(v.quote_no);
  if (v.total > 0) parts.push(formatIdr(v.total));
  return parts.join(' · ');
}
