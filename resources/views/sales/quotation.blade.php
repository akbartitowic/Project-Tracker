<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation - {{ $project_name }}</title>
    <style>
        @page { margin: 28px 32px 36px 32px; }
        * { box-sizing: border-box; }
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 10px;
            color: #1e293b;
            line-height: 1.45;
            margin: 0;
            padding: 0;
        }
        .logo img { height: 42px; width: auto; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .header-table td { vertical-align: top; padding: 0; }
        .meta-box {
            border: 1px solid #cbd5e1;
            width: 220px;
            margin-left: auto;
        }
        .meta-box td {
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 9px;
        }
        .meta-box tr:last-child td { border-bottom: none; }
        .meta-label { color: #64748b; width: 38%; }
        .meta-value { font-weight: bold; text-align: right; }
        .project-line { margin: 2px 0; font-size: 10px; }
        .project-line strong { display: inline-block; width: 52px; }
        .client-address { margin-top: 4px; max-width: 340px; white-space: pre-line; }
        table.services {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9px;
        }
        table.services th {
            background: #e85d04;
            color: #fff;
            font-weight: bold;
            text-align: center;
            padding: 7px 5px;
            border: 1px solid #e85d04;
        }
        table.services td {
            border: 1px solid #cbd5e1;
            padding: 7px 6px;
            vertical-align: top;
        }
        .section-row td {
            color: #e85d04;
            font-weight: bold;
            font-size: 10px;
            border: 1px solid #cbd5e1;
            padding: 6px;
        }
        .col-service { width: 16%; }
        .col-detail { width: 38%; }
        .col-rate, .col-qty, .col-unit { width: 10%; text-align: center; }
        .col-amount { width: 16%; text-align: right; white-space: nowrap; }
        .detail-text { white-space: pre-line; font-size: 8.5px; line-height: 1.35; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 0; }
        .summary-table td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: middle; }
        .words-cell { font-size: 9px; font-style: italic; width: 62%; }
        .total-label { text-align: right; font-weight: bold; width: 18%; }
        .total-value { text-align: right; font-weight: bold; width: 20%; }
        .final-row td {
            background: #1e3a5f;
            color: #fff;
            font-weight: bold;
            font-size: 11px;
            border: 1px solid #1e3a5f;
        }
        .final-label { text-align: right; padding-right: 12px !important; }
        .final-value { text-align: right; }
        .terms-title {
            background: #e85d04;
            color: #fff;
            font-weight: bold;
            padding: 6px 10px;
            margin-top: 14px;
            font-size: 10px;
        }
        .terms-body {
            border: 1px solid #cbd5e1;
            border-top: none;
            padding: 10px 12px;
            font-size: 8.5px;
        }
        .terms-body h4 {
            margin: 8px 0 4px;
            font-size: 9px;
            color: #e85d04;
        }
        .terms-body h4:first-child { margin-top: 0; }
        .terms-body p { margin: 0 0 4px; white-space: pre-line; }
        .signature-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        .signature-table td { width: 50%; vertical-align: bottom; padding: 0 10px; }
        .sig-box {
            border: 1px solid #cbd5e1;
            height: 70px;
            margin-bottom: 6px;
        }
        .sig-name { text-align: center; font-weight: bold; font-size: 10px; }
        .sig-bar {
            background: #e85d04;
            color: #fff;
            text-align: center;
            font-weight: bold;
            padding: 5px;
            margin-top: 10px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                <div class="logo">
                    @if($logo_base64)
                        <img src="{{ $logo_base64 }}" alt="Noohtify">
                    @else
                        <strong style="font-size: 22px; color: #e85d04;">noohtify</strong>
                    @endif
                </div>
                <p class="project-line"><strong>Project:</strong> {{ $project_name }}</p>
                <p class="project-line"><strong>To:</strong> {{ $client_name }}</p>
                @if($client_address !== '')
                    <div class="client-address"><strong>Address:</strong> {{ $client_address }}</div>
                @endif
            </td>
            <td style="width: 45%;">
                <table class="meta-box">
                    <tr>
                        <td class="meta-label">Quote No</td>
                        <td class="meta-value">{{ $quote_no }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Date</td>
                        <td class="meta-value">{{ $quote_date }}</td>
                    </tr>
                    <tr>
                        <td class="meta-label">Valid until</td>
                        <td class="meta-value">{{ $valid_until }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="services">
        <thead>
            <tr>
                <th class="col-service">Services</th>
                <th class="col-detail">Detail</th>
                <th class="col-rate">Rate</th>
                <th class="col-qty">Qty</th>
                <th class="col-unit">Unit</th>
                <th class="col-amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr class="section-row">
                <td colspan="6">{{ $section_title }}</td>
            </tr>
            @foreach($line_items as $item)
                <tr>
                    <td>{{ $item['service'] }}</td>
                    <td><div class="detail-text">{{ $item['detail'] }}</div></td>
                    <td class="col-rate">{{ \App\Services\SalesQuotationService::formatIdrStatic($item['rate']) }}</td>
                    <td class="col-qty">{{ rtrim(rtrim(number_format((float) $item['qty'], 2, '.', ''), '0'), '.') }}</td>
                    <td class="col-unit">{{ $item['unit'] }}</td>
                    <td class="col-amount">{{ \App\Services\SalesQuotationService::formatIdrStatic($item['amount']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="summary-table">
        <tr>
            <td class="words-cell" rowspan="2">{{ $amount_in_words }}</td>
            <td class="total-label">Total</td>
            <td class="total-value">{{ $total_formatted }}</td>
        </tr>
        <tr class="final-row">
            <td class="final-label">Final Amount</td>
            <td class="final-value">{{ $total_formatted }}</td>
        </tr>
    </table>

    <div class="terms-title">Terms &amp; Conditions</div>
    <div class="terms-body">
        <h4>Notes</h4>
        <p>{{ $notes }}</p>
        <h4>Payment Terms</h4>
        <p>{{ $payment_terms }}</p>
        <h4>Project Cancellation Penalty</h4>
        <p>{{ $cancellation_penalty }}</p>
    </div>

    <table class="signature-table">
        <tr>
            <td>
                <div class="sig-box"></div>
                <div class="sig-name">{{ $signature_left }}</div>
            </td>
            <td>
                <div class="sig-box"></div>
                <div class="sig-name">{{ $signature_right }}</div>
            </td>
        </tr>
    </table>
    <div class="sig-bar">Signature</div>
</body>
</html>
