<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Noohtify</title>
    <link rel="icon" type="image/png" href="/favicon.png">
    @viteReactRefresh
    @vite(['resources/js/index.css', 'resources/js/main.jsx'])
</head>
<body class="antialiased font-sans">
    <div id="root"></div>
</body>
</html>
