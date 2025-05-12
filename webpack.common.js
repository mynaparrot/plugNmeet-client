import { resolve, dirname } from 'path';
import { copyFileSync } from 'fs';
import webpack from 'webpack';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import postcssNested from 'postcss-nested';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import ReactRefreshTypeScript from 'react-refresh-typescript';
import * as pkg from './package.json' with { type: 'json' };

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  entry: './src/index.tsx',
  output: {
    filename: 'assets/js/[name].[contenthash].js',
    path: resolve(dirname(''), 'dist'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@tensorflow/tfjs$': resolve(dirname(''), './custom_tfjs/custom_tfjs.js'),
      '@tensorflow/tfjs-core$': resolve(
        dirname(''),
        './custom_tfjs/custom_tfjs_core.js',
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: () => ({
                before: [!isProduction && ReactRefreshTypeScript()].filter(Boolean),
              }),
              // handle by ForkTsCheckerWebpackPlugin
              // transpileOnly: true,
            },
          }
        ],
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
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      },
    ],
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.initialize.tap('PlugNmeet', () => {
          // temporary work around for worker files
          const from = resolve(
            dirname(''),
            'node_modules',
            'livekit-client',
            'dist',
            'livekit-client.e2ee.worker.js',
          );
          const to = resolve(
            dirname(''),
            'src',
            'helpers',
            'livekit',
            'e2ee-worker',
            'livekit-client.e2ee.worker.js',
          );
          copyFileSync(from, to);
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
    new ForkTsCheckerWebpackPlugin({
      async: !isProduction,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/assets',
          to: 'assets',
          globOptions: {
            ignore: ['assets/fonts', '**/assets/tflite', '**/assets/Icons'],
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

export default config;
