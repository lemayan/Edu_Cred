import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// esbuild plugin: resolve libsodium-sumo during pre-bundling
const fixLibsodium = {
  name: 'fix-libsodium',
  setup(build) {
    build.onResolve({ filter: /\.\/libsodium-sumo\.mjs$/ }, () => ({
      path: path.resolve(
        __dirname,
        'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs'
      ),
    }));
  },
};

/**
 * Vite plugin: patch `module.require` references in @sidan-lab WASM glue code.
 * These are Node.js fallbacks (TextEncoder/TextDecoder, require) that never
 * execute in browsers but throw "module is not defined" in ESM mode.
 */
function patchSidanCjsPlugin() {
  return {
    name: 'patch-sidan-cjs',
    enforce: 'pre',
    transform(code, id) {
      // Strip query params (Vite appends ?v=xxx for cache busting)
      const cleanId = id.split('?')[0];
      if (!cleanId.includes('sidan-csl-rs') && !cleanId.includes('sidan_csl_rs')) return null;
      if (!cleanId.endsWith('.js')) return null;

      console.log('[patch-sidan-cjs] Checking:', cleanId);

      if (!code.includes('module.require') && !code.includes('module.exports')) {
        console.log('[patch-sidan-cjs] No module refs found');
        return null;
      }

      console.log('[patch-sidan-cjs] Patching module.require references...');
      let patched = code;
      // (0, module.require)('util').TextDecoder → TextDecoder
      patched = patched.replace(
        /typeof TextDecoder === 'undefined' \? \(0, module\.require\)\('util'\)\.TextDecoder : TextDecoder/g,
        'TextDecoder'
      );
      // (0, module.require)('util').TextEncoder → TextEncoder
      patched = patched.replace(
        /typeof TextEncoder === 'undefined' \? \(0, module\.require\)\('util'\)\.TextEncoder : TextEncoder/g,
        'TextEncoder'
      );
      // const ret = module.require; → const ret = undefined;
      patched = patched.replace(
        /const ret = module\.require;/g,
        'const ret = undefined;'
      );

      if (patched !== code) {
        console.log('[patch-sidan-cjs] Successfully patched!');
        return { code: patched, map: null };
      }
      console.log('[patch-sidan-cjs] No changes needed');
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      './libsodium-sumo.mjs': path.resolve(
        __dirname,
        'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs'
      ),
      events: path.resolve(__dirname, 'node_modules/events/'),
      stream: path.resolve(__dirname, 'node_modules/stream-browserify/'),
      util: path.resolve(__dirname, 'node_modules/util/'),
      crypto: path.resolve(__dirname, 'node_modules/crypto-browserify/'),
      // Force browser version of sidan packages
      '@sidan-lab/sidan-csl-rs-nodejs': '@sidan-lab/sidan-csl-rs-browser',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: [
      '@emurgo/cardano-serialization-lib-browser',
      '@sidan-lab/sidan-csl-rs-browser',
      '@sidan-lab/sidan-csl-rs-nodejs',
      '@emurgo/cardano-message-signing-nodejs',
    ],
    esbuildOptions: {
      target: 'esnext',
      define: { global: 'globalThis' },
      plugins: [fixLibsodium],
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
