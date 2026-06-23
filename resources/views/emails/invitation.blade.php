<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Undangan Organisasi</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 480px; margin: 0 auto; padding: 24px;">

    <p>Halo,</p>

    <p>
        <strong>{{ $invitation->invitedBy->name }}</strong> mengundang Anda untuk bergabung ke organisasi
        <strong>{{ $invitation->organization->name }}</strong> di HubTask sebagai
        <strong>{{ $invitation->role->name }}</strong>.
    </p>

    <p style="margin: 28px 0;">
        <a href="{{ $acceptUrl }}"
           style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Terima Undangan
        </a>
    </p>

    <p style="color: #64748b; font-size: 14px;">
        Atau salin link berikut ke browser:<br>
        <a href="{{ $acceptUrl }}" style="color: #6366f1;">{{ $acceptUrl }}</a>
    </p>

    <p style="color: #64748b; font-size: 13px;">
        Undangan ini berlaku hingga <strong>{{ $invitation->expires_at->format('d M Y, H:i') }}</strong>.
        Jika Anda tidak merasa diundang, abaikan email ini.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px;">HubTask — Project Management Platform</p>

</body>
</html>
