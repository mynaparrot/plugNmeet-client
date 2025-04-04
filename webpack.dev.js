import { merge } from 'webpack-merge';
import common from './webpack.common.js';

export default merge(common, {
  mode: 'development',
  optimization: {
    usedExports: true,
  },
  devtool: 'source-map',
  devServer: {
    static: './dist',
    port: 3000,
    compress: true,
    open: false,
    historyApiFallback: true,
  },
});
