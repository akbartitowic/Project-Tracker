<?php

namespace App\Services;

use App\Models\SalesPitch;
use App\Support\AmountInWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use App\Support\PublicStorageUrl;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SalesQuotationService
{
    public const DEFAULT_DETAIL = "Based on the agile nature of the client's needs for this project, where requirements and demands are still highly dynamic, we propose a retainer package based on a man-hour quota. This quota can be utilized for various needs within the application project, with requests aligned to the capabilities that Noohtify can provide. The services we offer under this man-hour quota include:\n- Design\n- Mobile development\n- Backend development";

    public const DEFAULT_NOTES = "Additional expenses that come from 3rd parties (if any), are not included in this quotation such as infrastructure cost, 3rd party subscription, etc.\nProduction will be started after Purchase Order Received.";

    public const DEFAULT_PAYMENT_TERMS = "Payment 1: 50% Down Payment at the time the proposal is approved.\nPayment 2: 50% 1 month after proposal approved.";

    public const DEFAULT_CANCELLATION = "If the project is canceled after more than 50% completion, the client will be charged a 100% penalty based on the overall project progress.\nIf the project is canceled before 50% completion, the client will be charged a 70% penalty based on the overall project progress.\nThe initial costs to run the project must be paid.";

    public function defaultQuotationData(SalesPitch $pitch): array
    {
        $quoteDate = now();
        $estimated = (float) ($pitch->estimated_value ?? 0);
        $rate = 312500;
        $qty = $estimated > 0 ? max(1, (int) round($estimated / $rate)) : 350;

        return [
            'quote_no' => $this->nextQuoteNumber($quoteDate),
            'quote_date' => $quoteDate->format('Y-m-d'),
            'valid_until' => $quoteDate->copy()->addMonth()->format('Y-m-d'),
            'client_address' => '',
            'section_title' => $pitch->title ?: $pitch->prospect_name ?: 'Project',
            'line_items' => [
                [
                    'service' => 'Flexible Quota Manhour',
                    'detail' => self::DEFAULT_DETAIL,
                    'rate' => $rate,
                    'qty' => $qty,
                    'unit' => 'Hours',
                ],
            ],
            'notes' => self::DEFAULT_NOTES,
            'payment_terms' => self::DEFAULT_PAYMENT_TERMS,
            'cancellation_penalty' => self::DEFAULT_CANCELLATION,
            'signature_left' => 'Noohtify',
            'signature_right' => $pitch->company?->name ?? $pitch->company_name ?? 'Client',
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    public function normalizeQuotationData(array $raw, SalesPitch $pitch): array
    {
        $defaults = $this->defaultQuotationData($pitch);
        $merged = array_merge($defaults, $raw);

        $lineItems = [];
        foreach ($raw['line_items'] ?? $defaults['line_items'] as $row) {
            if (!is_array($row)) {
                continue;
            }
            $rate = (float) ($row['rate'] ?? 0);
            $qty = (float) ($row['qty'] ?? 0);
            $lineItems[] = [
                'service' => trim((string) ($row['service'] ?? '')),
                'detail' => trim((string) ($row['detail'] ?? '')),
                'rate' => $rate,
                'qty' => $qty,
                'unit' => trim((string) ($row['unit'] ?? 'Hours')),
                'amount' => round($rate * $qty, 2),
            ];
        }
        if ($lineItems === []) {
            $lineItems = $defaults['line_items'];
            foreach ($lineItems as $i => $row) {
                $lineItems[$i]['amount'] = round((float) $row['rate'] * (float) $row['qty'], 2);
            }
        }

        $merged['line_items'] = $lineItems;
        $merged['quote_no'] = trim((string) ($merged['quote_no'] ?? '')) ?: $defaults['quote_no'];
        $merged['quote_date'] = $this->normalizeDate($merged['quote_date'] ?? $defaults['quote_date']);
        $merged['valid_until'] = $this->normalizeDate($merged['valid_until'] ?? $defaults['valid_until']);
        $merged['client_address'] = trim((string) ($merged['client_address'] ?? ''));
        $merged['section_title'] = trim((string) ($merged['section_title'] ?? '')) ?: $defaults['section_title'];
        $merged['notes'] = trim((string) ($merged['notes'] ?? ''));
        $merged['payment_terms'] = trim((string) ($merged['payment_terms'] ?? ''));
        $merged['cancellation_penalty'] = trim((string) ($merged['cancellation_penalty'] ?? ''));
        $merged['signature_left'] = trim((string) ($merged['signature_left'] ?? 'Noohtify')) ?: 'Noohtify';
        $merged['signature_right'] = trim((string) ($merged['signature_right'] ?? '')) ?: ($pitch->company?->name ?? $pitch->company_name ?? 'Client');

        if (array_key_exists('negotiation_regenerate_quote', $raw)) {
            $flag = $raw['negotiation_regenerate_quote'];
            $merged['negotiation_regenerate_quote'] = in_array($flag, ['yes', 'no'], true) ? $flag : null;
        }

        return $merged;
    }

    /**
     * @param  array<string, mixed>  $quotationData
     * @return array<string, mixed>
     */
    public function buildViewData(SalesPitch $pitch, array $quotationData): array
    {
        $data = $this->normalizeQuotationData($quotationData, $pitch);
        $total = collect($data['line_items'])->sum(fn ($row) => (float) ($row['amount'] ?? 0));

        $logoBase64 = $this->resolveLogoBase64($pitch);

        return [
            'pitch' => $pitch,
            'quotation' => $data,
            'project_name' => $pitch->title ?: $pitch->prospect_name,
            'client_name' => $pitch->company?->name ?? $pitch->company_name ?? '—',
            'quote_no' => $data['quote_no'],
            'quote_date' => Carbon::parse($data['quote_date'])->format('j/n/Y'),
            'valid_until' => Carbon::parse($data['valid_until'])->format('j/n/Y'),
            'client_address' => $data['client_address'],
            'section_title' => $data['section_title'],
            'line_items' => $data['line_items'],
            'total' => $total,
            'total_formatted' => $this->formatIdr($total),
            'amount_in_words' => AmountInWords::idrToEnglish($total),
            'notes' => $data['notes'],
            'payment_terms' => $data['payment_terms'],
            'cancellation_penalty' => $data['cancellation_penalty'],
            'signature_left' => $data['signature_left'],
            'signature_right' => $data['signature_right'],
            'logo_base64' => $logoBase64,
        ];
    }

    /**
     * @param  array<string, mixed>  $quotationData
     */
    public function makePdf(SalesPitch $pitch, array $quotationData)
    {
        $viewData = $this->buildViewData($pitch, $quotationData);

        return Pdf::loadView('sales.quotation', $viewData)
            ->setPaper('a4', 'portrait');
    }

    /**
     * @param  array<string, mixed>  $quotationData
     * @return array{quotation_data: array, quotation_url: string, pdf_path: string}
     */
    public function generateAndStore(SalesPitch $pitch, array $quotationData, bool $asNewRevision = false): array
    {
        $quotationHistory = [];
        if ($asNewRevision && ($pitch->quotation_url || is_array($pitch->quotation_data))) {
            $quotationHistory = is_array($pitch->quotation_data['quotation_history'] ?? null)
                ? $pitch->quotation_data['quotation_history']
                : [];
            $snapshot = is_array($pitch->quotation_data) ? $pitch->quotation_data : [];
            unset($snapshot['quotation_history']);
            $quotationHistory[] = [
                'label' => 'old',
                'quotation_url' => $pitch->quotation_url,
                'quotation_data' => $snapshot,
                'saved_at' => now()->toIso8601String(),
            ];
        }

        if ($asNewRevision) {
            $now = now();
            $quotationData['quote_no'] = $this->nextQuoteNumber($now);
            $quotationData['quote_date'] = $now->format('Y-m-d');
            $quotationData['valid_until'] = $now->copy()->addMonth()->format('Y-m-d');
        }

        $normalized = $this->normalizeQuotationData($quotationData, $pitch);
        if ($quotationHistory !== []) {
            $normalized['quotation_history'] = $quotationHistory;
        }
        $pdf = $this->makePdf($pitch, $normalized);
        $binary = $pdf->output();

        $slug = Str::slug($pitch->title ?: $pitch->prospect_name ?: 'quotation');
        $fileName = "quotation-{$pitch->id}-{$slug}-" . now()->format('YmdHis') . '.pdf';
        $path = "sales-quotations/{$fileName}";

        Storage::disk('public')->put($path, $binary);

        return [
            'quotation_data' => $normalized,
            'quotation_url' => PublicStorageUrl::for($path),
            'pdf_path' => $path,
        ];
    }

    public function nextQuoteNumber(?Carbon $date = null): string
    {
        $date = $date ?? now();
        $prefix = sprintf('NA-QTN/%s/%02d/', $date->year, $date->month);

        $latest = SalesPitch::query()
            ->whereNotNull('quotation_data')
            ->orderByDesc('id')
            ->limit(200)
            ->get(['quotation_data'])
            ->map(function ($row) {
                $no = is_array($row->quotation_data) ? ($row->quotation_data['quote_no'] ?? '') : '';

                return (string) $no;
            })
            ->first(fn ($no) => str_starts_with($no, $prefix));

        $seq = 1;
        if ($latest) {
            $tail = (int) substr($latest, strrpos($latest, '/') + 1);
            $seq = $tail + 1;
        } else {
            $count = SalesPitch::query()
                ->whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->count();
            $seq = max(1, $count);
        }

        return $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
    }

    public function resolveLogoBase64(SalesPitch $pitch): ?string
    {
        $candidates = [];
        if ($pitch->quotation_logo_path && Storage::disk('public')->exists($pitch->quotation_logo_path)) {
            $candidates[] = Storage::disk('public')->path($pitch->quotation_logo_path);
        }
        $default = public_path('logo.png');
        if (is_file($default)) {
            $candidates[] = $default;
        }

        foreach ($candidates as $fullPath) {
            if (!is_file($fullPath)) {
                continue;
            }
            $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
            $mime = match ($ext) {
                'jpg', 'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                'svg' => 'image/svg+xml',
                default => 'image/png',
            };

            return 'data:' . $mime . ';base64,' . base64_encode((string) file_get_contents($fullPath));
        }

        return null;
    }

    public function formatIdr(float|int $amount): string
    {
        return self::formatIdrStatic($amount);
    }

    public static function formatIdrStatic(float|int $amount): string
    {
        return 'Rp' . number_format((float) $amount, 0, ',', '.');
    }

    private function normalizeDate(mixed $value): string
    {
        if ($value === null || $value === '') {
            return now()->format('Y-m-d');
        }

        return Carbon::parse($value)->format('Y-m-d');
    }
}
