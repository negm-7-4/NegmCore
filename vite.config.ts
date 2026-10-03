import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// POLISH-03: Vite leaves a `/*$vite$:1*/` marker in the inlined stylesheet; the shipped file
// carries no build comments.
const stripMarkers = (): Plugin => ({
  name: 'negm:strip-markers',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'asset' && file.fileName.endsWith('.html') && typeof file.source === 'string') file.source = file.source.replaceAll('/*$vite$:1*/', '');
    }
  },
});

// One self-contained dist/index.html: JS, CSS and fonts are inlined so the file
// that QA screenshots is byte-for-byte the file that ships (no network at runtime).
export default defineConfig({
  plugins: [tailwindcss(), viteSingleFile({ removeViteModuleLoader: true }), stripMarkers()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    modulePreload: false,
    reportCompressedSize: true,
    rolldownOptions: {
      // POLISH-03: the shipped file logs nothing. Library info logs (three, MorphSVG's parser)
      // are dropped as pure calls; warn and error stay, so a shader or WebGL failure still
      // reaches the console and the QA error collector.
      treeshake: { manualPureFunctions: ['console.log', 'console.info', 'console.debug'] },
    },
  },
});
