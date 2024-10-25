const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    static: './dist',
    port: 3003,
    compress: true,
    open: false,
    historyApiFallback: true,
  },
});
