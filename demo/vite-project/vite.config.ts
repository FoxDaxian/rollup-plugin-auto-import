import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoImport from 'rollup-plugin-auto-import';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        autoImport({
            exclude: [/\.less\b/],
            inject: {
                vue: ['ref', 'computed'],
            },
        }),
    ],
});
