import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from 'tailwindcss';

const isProduction = process.env.NODE_ENV === 'production';
const BUILD_INTERVAL = 1500;

export default defineConfig({
  root: join(__dirname, 'src'),
  base: '',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@tensorflow/tfjs$': resolve(__dirname, './custom_tfjs/custom_tfjs.js'),
      '@tensorflow/tfjs-core$': resolve(
        __dirname,
        './custom_tfjs/custom_tfjs_core.js',
      ),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
    preprocessorOptions: {
      scss: {},
    },
  },
  server: {
    port: 3000,
    watch: {
      interval: BUILD_INTERVAL,
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    emitAssets: true,
    sourcemap: !isProduction,
    rollupOptions: {
      output: {
        compact: true,
        entryFileNames: 'assets/js/main-module.[hash].js',
        chunkFileNames: 'assets/chunks/[name].[hash].js',
        assetFileNames: ({ names }) => {
          const name = names[0];
          if (/\.(woff2?|ttf|eot)$/.test(name)) {
            return 'assets/fonts/[name][extname]';
          }
          if (/\.css$/.test(name)) {
            if (name === 'vendor.css') {
              return 'assets/css/vendor.[hash][extname]';
            }
            return 'assets/css/main.[hash][extname]';
          }
          if (/\.ico$/.test(name)) {
            return 'assets/imgs/[name][extname]';
          }
          return 'assets/js/[name][extname]';
        },
        manualChunks: (id) => {
          if (id.includes('node_modules') && /\.css$/.test(id)) {
            return 'vendor';
          }

          if (id.includes('node_modules') && /\.js$/.test(id)) {
            const modulePath = id.split('node_modules/')[1];
            const topLevelFolder = modulePath.split('/')[0];
            if (topLevelFolder !== '.pnpm') {
              return topLevelFolder;
            }

            const scopedPackageName = modulePath.split('/')[1];
            switch (true) {
              case scopedPackageName.includes('@tensorflow'):
                return 'tensorflow';
              case scopedPackageName.includes('mermaid'):
                return 'mermaid';
              case scopedPackageName.includes('@excalidraw'):
                return 'excalidraw';
              case scopedPackageName.includes(
                'microsoft-cognitiveservices-speech-sdk',
              ):
                return 'microsoft-speech-sdk';
              case scopedPackageName.includes('lodash'):
              case scopedPackageName.includes('validator'):
                return 'utils';
              case scopedPackageName.includes('react-dnd'):
              case scopedPackageName.includes('dnd-core'):
              case scopedPackageName.includes('react-cool-virtual'):
              case scopedPackageName.includes('react-virtual'):
              case scopedPackageName.includes('react-hotkeys-hook'):
              case scopedPackageName.includes('react-draggable'):
              case scopedPackageName.includes('react-player'):
              case scopedPackageName.includes('@headlessui'):
              case scopedPackageName.includes('i18next'):
                return 'react-libs';
              case scopedPackageName.includes('plugnmeet-protocol'):
              case scopedPackageName.includes('@bufbuild'):
              case scopedPackageName.includes('axios'):
              case scopedPackageName.includes('@nats-io'):
              case scopedPackageName.includes('redux'):
                return 'pnm';
              default:
                if (!scopedPackageName.includes('react')) {
                  return 'vendor';
                }
            }
          }
          return null;
        },
      },
      watch: {
        exclude: 'node_modules/**',
        buildDelay: BUILD_INTERVAL,
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: [
            'assets/audio',
            'assets/backgrounds',
            'assets/fonts',
            'assets/imgs',
            'assets/locales',
            'assets/lti',
            'assets/models',
            'assets/config_sample.js',
            isProduction ? '' : 'assets/config.js',
          ],
          dest: 'assets/',
        },
        {
          src: 'assets/tflite/*',
          dest: 'assets/js/',
        },
        {
          src: 'login.html',
          dest: './',
        },
      ],
    }),
  ],
  define: {
    IS_PRODUCTION: isProduction,
    PNM_VERSION: JSON.stringify(process.env.npm_package_version),
    BUILD_TIME: Math.floor(Date.now() / 1000),
    'process.env': {
      IS_PREACT: false,
    },
  },
});
