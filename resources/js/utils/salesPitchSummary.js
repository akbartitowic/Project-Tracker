import { formatQuotationVersionLine, getQuotationVersions } from './salesPitchQuotationVersions';

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
  return '—';
}

function parseMeetingHasFromPitch(p) {
  if (!p) return '';
  if (p.meeting_mode === 'no') return 'no';
  if (p.meeting_at || p.meeting_mode === 'online' || p.meeting_mode === 'offline') return 'yes';
  return '';
}

function formatMeetingDateOnly(iso) {
  if (!iso) return '—';
  const raw = String(iso).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return raw;
}

function formatMoney(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('id-ID');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDurationSeconds(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return '—';
  const s = Math.floor(Number(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt`;
}

/**
 * @param {Record<string, unknown>|null|undefined} pitch
 * @returns {{ title: string, rows: { label: string, value: string }[] }[]}
 */
export function buildOutcomeSummarySections(pitch) {
  if (!pitch) return [];

  const isPresale = pitch.win_entry_type === 'presale';
  const compro = parseYesNoField(pitch.compro_url);
  const proposal = parseYesNoField(pitch.proposal_url);
  const meetingHas = parseMeetingHasFromPitch(pitch);
  const quotationVersions = getQuotationVersions(pitch);

  const sections = [
    {
      title: 'Informasi umum',
      rows: [
        { label: 'Nama project', value: String(pitch.title || pitch.prospect_name || '—') },
        { label: 'Perusahaan', value: String(pitch.company_name || '—') },
        { label: 'Kategori company', value: String(pitch.company_category_name || '—') },
        { label: 'Kategori project', value: String(pitch.category_project_name || '—') },
        { label: 'Estimasi nilai', value: formatMoney(pitch.estimated_value) },
        { label: 'Email', value: String(pitch.email || '—') },
        { label: 'Telepon', value: String(pitch.phone || '—') },
        { label: 'Mulai lead', value: formatMeetingDateOnly(pitch.lead_started_at) },
        { label: 'Catatan', value: String(pitch.notes || '—') },
        ...(isPresale
          ? [{ label: 'Sumber', value: 'Project Board (belum terhubung sales pitch)' }]
          : []),
        ...(pitch.project_id
          ? [{ label: 'Project board', value: `ID project #${pitch.project_id}` }]
          : []),
        ...(pitch.owner_name ? [{ label: 'Owner', value: String(pitch.owner_name) }] : []),
      ],
    },
  ];

  if (!isPresale) {
    sections.push(
      {
        title: '2. Sent Compro',
        rows: [{ label: 'Sudah kirim compro', value: formatYesNoLabel(compro) }],
      },
      {
        title: '3. Proposal Sent',
        rows: [
          { label: 'Sudah kirim proposal', value: formatYesNoLabel(proposal) },
          ...(quotationVersions.length > 0
            ? quotationVersions.map((v, i) => ({
                label: v.label === 'old' ? `Quotation (${v.tag})` : `Quotation (${v.tag})`,
                value: v.url || '—',
                valueMeta: formatQuotationVersionLine(v),
                quotationVersion: v,
              }))
            : [{ label: 'Quotation PDF', value: '—' }]),
        ],
      },
      {
        title: '4. Presentation',
        rows: [
          { label: 'Ada presentation', value: formatYesNoLabel(meetingHas) },
          ...(meetingHas === 'yes'
            ? [
                { label: 'Tanggal', value: formatMeetingDateOnly(pitch.meeting_at) },
                {
                  label: 'Mode',
                  value:
                    pitch.meeting_mode === 'online'
                      ? 'Online'
                      : pitch.meeting_mode === 'offline'
                        ? 'Offline'
                        : '—',
                },
                { label: 'Lokasi', value: String(pitch.meeting_location || '—') },
              ]
            : []),
        ],
      },
      {
        title: '5. Negotiation',
        rows: [
          { label: 'Harga final deal', value: formatMoney(pitch.final_deal_value) },
          ...(pitch.quotation_data?.negotiation_regenerate_quote
            ? [
                {
                  label: 'Generate ulang quotation',
                  value: pitch.quotation_data.negotiation_regenerate_quote === 'yes' ? 'Ya' : 'Tidak',
                },
              ]
            : []),
          ...(quotationVersions.length > 1
            ? [
                {
                  label: 'Versi quotation',
                  value: quotationVersions.map((v) => v.tag).join(' · '),
                },
              ]
            : []),
        ],
      },
    );
  }

  sections.push({
    title: isPresale ? 'Sign Off' : '6. Sign Off / Hasil',
    rows: [
      {
        label: 'Outcome',
        value:
          pitch.outcome === 'win'
            ? 'Sign Off'
            : pitch.outcome === 'lost'
              ? 'Lost'
              : isPresale
                ? 'Menunggu data lengkap'
                : '—',
      },
      ...(pitch.outcome === 'win'
        ? [{ label: 'Harga final deal', value: formatMoney(pitch.final_deal_value) }]
        : []),
      { label: 'Ditutup pada', value: formatDateTime(pitch.closed_at) },
      {
        label: 'Durasi (lead → tutup)',
        value: formatDurationSeconds(pitch.duration_seconds_closed),
      },
    ],
  });

  return sections;
}
