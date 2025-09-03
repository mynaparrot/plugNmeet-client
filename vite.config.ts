import { join, resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy, ViteStaticCopyOptions } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';
import oxlintPlugin from 'vite-plugin-oxlint';

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
  experimental: {
    enableNativePlugin: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: !isProduction,
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/js/main-module.[hash].js',
        chunkFileNames: 'assets/chunks/[name].[hash].js',
        assetFileNames: ({ names }) => assetFileNames(names),
        advancedChunks: {
          groups: [
            {
              name: (moduleId: string) => manualChunks(moduleId),
            },
          ],
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
    tailwindcss(),
    viteStaticCopy(getStaticFilesToCopy()),
    oxlintPlugin(),
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
  if (name.endsWith('.css')) {
    if (name.startsWith('index.')) {
      return 'assets/css/main.[hash][extname]';
    }
    return 'assets/css/[name].[hash][extname]';
  }
  if (name.endsWith('.ico')) {
    return 'assets/imgs/[name][extname]';
  }
  return 'assets/js/[name][extname]';
}

const vendorChunkMap: Record<string, string[]> = {
  tensorflow: ['@tensorflow'],
  mermaid: ['mermaid'],
  excalidraw: ['@excalidraw'],
  'microsoft-speech-sdk': ['microsoft-cognitiveservices-speech-sdk'],
  utils: ['lodash', 'validator'],
  'react-libs': [
    'react-dnd',
    'dnd-core',
    'react-cool-virtual',
    'react-virtual',
    'react-hotkeys-hook',
    'react-draggable',
    'react-player',
    '@headlessui',
    'i18next',
  ],
  pnm: ['plugnmeet-protocol', '@bufbuild', 'axios', '@nats-io', 'redux'],
};

function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return null;
  }

  const modulePath = id.split('node_modules/')[1];
  const topLevelFolder = modulePath.split('/')[0];
  if (topLevelFolder !== '.pnpm') {
    return topLevelFolder;
  }

  if (id.endsWith('.css')) {
    return 'vendor';
  } else if (id.endsWith('.js')) {
    const packageName = modulePath.split('/')[1];
    for (const chunk in vendorChunkMap) {
      if (vendorChunkMap[chunk].some((pkg) => packageName.includes(pkg))) {
        return chunk;
      }
    }

    if (/react(-dom)?/.test(packageName)) {
      return 'react';
    } else {
      // If we can't find a specific chunk, we can return 'vendor'
      return 'vendor';
    }
  }
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
