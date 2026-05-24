import { Button } from '@/components/ui/button';
import QuotationForm from './QuotationForm';
import QuotationLogoUpload from './QuotationLogoUpload';
import { formatIdr, quotationTotal } from '../../utils/salesQuotationDefaults';

export default function QuotationEditorSection({
  pitchId,
  pitch,
  quotation,
  quotationUrl,
  quotationLogoUrl,
  disabled,
  canUpdate,
  loading,
  onQuotationChange,
  onPitchUpdated,
  onPreview,
  onGenerate,
  onError,
  generateLabel = 'Generate PDF',
  showLogoUpload = true,
  description,
}) {
  const total = formatIdr(quotationTotal(quotation));
  const quoteNo = quotation?.quote_no || pitch?.quotation_data?.quote_no;

  return (
    <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {quoteNo && (
        <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
          <span className="text-slate-500">Quotation aktif: </span>
          <span className="font-medium text-slate-800 dark:text-slate-100">{quoteNo}</span>
          <span className="text-slate-500"> · Total {total}</span>
        </div>
      )}
      {showLogoUpload && (
        <QuotationLogoUpload
          pitchId={pitchId}
          logoUrl={quotationLogoUrl}
          disabled={disabled || !canUpdate}
          onUpdated={onPitchUpdated}
          onError={onError}
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quotation PDF</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total saat ini: {total}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || disabled || !canUpdate}
            onClick={onPreview}
          >
            {loading ? 'Memproses...' : 'Preview PDF'}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading || disabled || !canUpdate}
            onClick={onGenerate}
          >
            {loading ? 'Memproses...' : generateLabel}
          </Button>
        </div>
      </div>
      {quotationUrl && (
        <p className="text-xs">
          PDF tersimpan:{' '}
          <a href={quotationUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
            buka file
          </a>
        </p>
      )}
      <QuotationForm quotation={quotation} disabled={disabled} onChange={onQuotationChange} />
    </div>
  );
}
