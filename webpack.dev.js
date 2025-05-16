import { merge } from 'webpack-merge';
import common from './webpack.common.js';

export default merge(common, {
  mode: 'development',
  watchOptions: {
    ignored: '**/node_modules',
    aggregateTimeout: 2000,
  },
  optimization: {
    usedExports: true,
  },
  devtool: 'source-map',
  devServer: {
    static: './dist',
    host: 'localhost',
    port: 3000,
    allowedHosts: 'all',
    compress: true,
    open: false,
    historyApiFallback: true,
  },
});
