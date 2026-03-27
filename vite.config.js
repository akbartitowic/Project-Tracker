import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/index.css', 'resources/js/main.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: true,
        hmr: {
            host: '192.168.55.112',
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./resources/js"),
        },
    },
});
