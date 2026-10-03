import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html: JS, CSS and fonts are inlined so the file
// that QA screenshots is byte-for-byte the file that ships (no network at runtime).
export default defineConfig({
  plugins: [tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    modulePreload: false,
    reportCompressedSize: true,
  },
});
