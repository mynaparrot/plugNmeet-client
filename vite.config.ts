import { resolve, join } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from 'tailwindcss';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: join(__dirname, 'src'),
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
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    emitAssets: true,
    rollupOptions: {
      output: {
        compact: true,
        entryFileNames: 'assets/js/main.[hash].js',
        chunkFileNames: 'assets/chunks/[name].[hash].js',
        assetFileNames: ({ names }) => {
          const name = names[0];
          if (/\.(woff2?|ttf|eot)$/.test(name)) {
            return 'assets/fonts/[name][extname]';
          }
          if (/\.css$/.test(name)) {
            return 'assets/css/main.[hash][extname]';
          }
          if (/\.ico$/.test(name)) {
            return 'assets/imgs/[name][extname]';
          }
          return 'assets/js/[name][extname]';
        },
      },
      watch: {
        include: 'src/**',
        buildDelay: 1500,
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
        {
          src: '../node_modules/livekit-client/dist/livekit-client.e2ee.worker.js',
          dest: 'assets/',
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
