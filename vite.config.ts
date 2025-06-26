import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy, ViteStaticCopyOptions } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';

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
      '~': resolve(__dirname, 'src'),
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
    sourcemap: !isProduction,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/js/main-module.[hash].js',
        chunkFileNames: 'assets/chunks/[name].[hash].js',
        assetFileNames: ({ names }) => assetFileNames(names),
        manualChunks: manualChunks,
      },
      watch: {
        exclude: 'node_modules/**',
        buildDelay: BUILD_INTERVAL,
      },
    },
  },
  plugins: [
    react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
    tailwindcss(),
    viteStaticCopy(getStaticFilesToCopy()),
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

function assetFileNames(names: string[]) {
  const name = names[0];
  if (/\.(woff2?|ttf|eot)$/.test(name)) {
    return 'assets/fonts/[name][extname]';
  }
  if (/\.css$/.test(name)) {
    if (name.includes('vendor')) {
      return 'assets/css/vendor.[hash][extname]';
    }
    return 'assets/css/main.[hash][extname]';
  }
  if (/\.ico$/.test(name)) {
    return 'assets/imgs/[name][extname]';
  }
  return 'assets/js/[name][extname]';
}

function manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (/\.css$/.test(id)) {
      return 'vendor';
    } else if (/\.js$/.test(id)) {
      const modulePath = id.split('node_modules/')[1];
      const topLevelFolder = modulePath.split('/')[0];
      if (topLevelFolder !== '.pnpm') {
        return topLevelFolder;
      }

      const packageName = modulePath.split('/')[1];
      switch (true) {
        case packageName.includes('@tensorflow'):
          return 'tensorflow';
        case packageName.includes('mermaid'):
          return 'mermaid';
        case packageName.includes('@excalidraw'):
          return 'excalidraw';
        case packageName.includes('microsoft-cognitiveservices-speech-sdk'):
          return 'microsoft-speech-sdk';
        case packageName.includes('lodash'):
        case packageName.includes('validator'):
          return 'utils';
        case packageName.includes('react-dnd'):
        case packageName.includes('dnd-core'):
        case packageName.includes('react-cool-virtual'):
        case packageName.includes('react-virtual'):
        case packageName.includes('react-hotkeys-hook'):
        case packageName.includes('react-draggable'):
        case packageName.includes('react-player'):
        case packageName.includes('@headlessui'):
        case packageName.includes('i18next'):
          return 'react-libs';
        case packageName.includes('plugnmeet-protocol'):
        case packageName.includes('@bufbuild'):
        case packageName.includes('axios'):
        case packageName.includes('@nats-io'):
        case packageName.includes('redux'):
          return 'pnm';
        default:
          if (!packageName.includes('react')) {
            return 'vendor';
          }
      }
    }
  }
  return null;
}

function getStaticFilesToCopy(): ViteStaticCopyOptions {
  return {
    targets: [
      {
        src: [
          'assets/audio',
          'assets/backgrounds',
          'assets/imgs',
          'assets/locales',
          'assets/lti',
          'assets/models',
          'assets/config_sample.js',
          !isProduction ? 'assets/config.js' : '',
        ].filter(Boolean),
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
  };
}
