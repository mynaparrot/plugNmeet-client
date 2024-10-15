const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const postcssNested = require('postcss-nested');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ReactRefreshTypeScript = require('react-refresh-typescript');
const pkg = require('./package.json');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.tsx',
  optimization: {
    usedExports: true,
  },
  output: {
    filename: 'assets/js/[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  watchOptions: {
    ignored: '**/node_modules',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: () => ({
            before: [!isProduction && ReactRefreshTypeScript()].filter(Boolean),
          }),
          transpileOnly: true,
        },
      },
      {
        test: /\.(scss|css)$/,
        use: [
          process.env.NODE_ENV !== 'production'
            ? 'style-loader'
            : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              postcssOptions: {
                plugins: [tailwindcss, autoprefixer, postcssNested],
              },
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: './assets/fonts/[name][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@tensorflow/tfjs$': path.resolve(
        __dirname,
        './custom_tfjs/custom_tfjs.js',
      ),
      '@tensorflow/tfjs-core$': path.resolve(
        __dirname,
        './custom_tfjs/custom_tfjs_core.js',
      ),
    },
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.initialize.tap('PlugNmeet', () => {
          // temporary work around for worker files
          const from = path.resolve(
            __dirname,
            'node_modules',
            'livekit-client',
            'dist',
            'livekit-client.e2ee.worker.js',
          );
          const to = path.resolve(
            __dirname,
            'src',
            'helpers',
            'livekit',
            'e2ee-worker',
            'livekit-client.e2ee.worker.js',
          );
          fs.copyFileSync(from, to);
        });
      },
    },
    new webpack.DefinePlugin({
      IS_PRODUCTION: isProduction,
      PNM_VERSION: JSON.stringify(pkg.version),
      BUILD_TIME: Math.floor(Date.now() / 1000),
      process: {
        env: {
          IS_PREACT: false,
        },
      },
    }),
    !isProduction && new ReactRefreshWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'assets/css/[name].[contenthash].css',
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new HtmlWebpackPlugin({
      filename: 'login.html',
      template: './src/login.html',
      inject: false,
    }),
    new ForkTsCheckerWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/assets',
          to: 'assets',
          globOptions: {
            ignore: ['assets/fonts', '**/assets/tflite'],
          },
          info: { minimized: true },
        },
        {
          from: 'src/assets/tflite/*',
          to() {
            return 'assets/js/[name][ext]';
          },
        },
      ],
    }),
  ].filter(Boolean),
};
