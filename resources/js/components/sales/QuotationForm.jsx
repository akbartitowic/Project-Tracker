import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import {
  emptyLineItem,
  formatIdr,
  quotationDiscountAmount,
  quotationSubtotal,
  lineItemAmount,
  quotationTotal,
} from '../../utils/salesQuotationDefaults';

export default function QuotationForm({ quotation, onChange, disabled }) {
  const setField = (key, value) => {
    onChange({ ...quotation, [key]: value });
  };

  const setLineItem = (index, key, value) => {
    const items = [...(quotation.line_items || [])];
    items[index] = { ...items[index], [key]: value };
    onChange({ ...quotation, line_items: items });
  };

  const addLineItem = () => {
    onChange({
      ...quotation,
      line_items: [...(quotation.line_items || []), emptyLineItem()],
    });
  };

  const removeLineItem = (index) => {
    const items = [...(quotation.line_items || [])];
    if (items.length <= 1) return;
    items.splice(index, 1);
    onChange({ ...quotation, line_items: items });
  };

  const subtotal = quotationSubtotal(quotation);
  const discountAmount = quotationDiscountAmount(quotation);
  const total = quotationTotal(quotation);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Quote No</span>
          <Input
            value={quotation.quote_no || ''}
            onChange={(e) => setField('quote_no', e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Date</span>
          <Input
            type="date"
            value={quotation.quote_date || ''}
            onChange={(e) => setField('quote_date', e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Valid until</span>
          <Input
            type="date"
            value={quotation.valid_until || ''}
            onChange={(e) => setField('valid_until', e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Alamat klien</span>
        <Textarea
          rows={2}
          value={quotation.client_address || ''}
          onChange={(e) => setField('client_address', e.target.value)}
          disabled={disabled}
          placeholder="Alamat perusahaan penerima quotation"
        />
      </label>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Judul section layanan</span>
        <Input
          value={quotation.section_title || ''}
          onChange={(e) => setField('section_title', e.target.value)}
          disabled={disabled}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Line items</span>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addLineItem}>
            <Plus className="size-4 mr-1" />
            Tambah baris
          </Button>
        </div>
        {(quotation.line_items || []).map((row, index) => (
          <div
            key={index}
            className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Item {index + 1}</span>
              {(quotation.line_items || []).length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-rose-600"
                  disabled={disabled}
                  onClick={() => removeLineItem(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Services</span>
              <Input
                value={row.service || ''}
                onChange={(e) => setLineItem(index, 'service', e.target.value)}
                disabled={disabled}
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Detail</span>
              <Textarea
                rows={4}
                value={row.detail || ''}
                onChange={(e) => setLineItem(index, 'detail', e.target.value)}
                disabled={disabled}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Rate (IDR)</span>
                <Input
                  type="number"
                  min="0"
                  value={row.rate ?? ''}
                  onChange={(e) => setLineItem(index, 'rate', e.target.value)}
                  disabled={disabled}
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Qty</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.qty ?? ''}
                  onChange={(e) => setLineItem(index, 'qty', e.target.value)}
                  disabled={disabled}
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Unit</span>
                <Input
                  value={row.unit || ''}
                  onChange={(e) => setLineItem(index, 'unit', e.target.value)}
                  disabled={disabled}
                />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Amount</span>
                <Input value={formatIdr(lineItemAmount(row))} readOnly disabled className="bg-slate-100 dark:bg-slate-800" />
              </label>
            </div>
          </div>
        ))}
        <div className="ml-auto w-full max-w-xs space-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40">
          <p className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Subtotal</span>
            <span className="font-medium">{formatIdr(subtotal)}</span>
          </p>
          <p className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Diskon</span>
            <span className="font-medium">- {formatIdr(discountAmount)}</span>
          </p>
          <p className="flex items-center justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
            <span>Total</span>
            <span>{formatIdr(total)}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Tipe diskon</span>
          <Select
            value={quotation.discount_type === 'percent' ? 'percent' : 'fixed'}
            onValueChange={(value) => setField('discount_type', value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tipe diskon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Nominal (IDR)</SelectItem>
              <SelectItem value="percent">Persentase (%)</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">
            Nilai diskon {quotation.discount_type === 'percent' ? '(%)' : '(IDR)'}
          </span>
          <Input
            type="number"
            min="0"
            max={quotation.discount_type === 'percent' ? '100' : undefined}
            step={quotation.discount_type === 'percent' ? '0.01' : '1'}
            value={quotation.discount_value ?? ''}
            onChange={(e) => setField('discount_value', e.target.value)}
            disabled={disabled}
            placeholder={quotation.discount_type === 'percent' ? 'Contoh: 10' : 'Contoh: 500000'}
          />
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Notes</span>
        <Textarea
          rows={3}
          value={quotation.notes || ''}
          onChange={(e) => setField('notes', e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="space-y-2 block">
        <span className="text-sm font-medium">Payment terms</span>
        <Textarea
          rows={3}
          value={quotation.payment_terms || ''}
          onChange={(e) => setField('payment_terms', e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="space-y-2 block">
        <span className="text-sm font-medium">Project cancellation penalty</span>
        <Textarea
          rows={4}
          value={quotation.cancellation_penalty || ''}
          onChange={(e) => setField('cancellation_penalty', e.target.value)}
          disabled={disabled}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Tanda tangan kiri</span>
          <Input
            value={quotation.signature_left || ''}
            onChange={(e) => setField('signature_left', e.target.value)}
            disabled={disabled}
          />
        </label>
        <label className="space-y-2 block">
          <span className="text-sm font-medium">Tanda tangan kanan</span>
          <Input
            value={quotation.signature_right || ''}
            onChange={(e) => setField('signature_right', e.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
