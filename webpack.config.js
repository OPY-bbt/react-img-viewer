const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './examples/heroes/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'react-img-viewer',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(jpe?g|png|gif|ico|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {},
          },
        ],
        exclude: path.join(__dirname, 'node_modules'),
      },
      {
        test: /\.(j|t)sx?$/,
        exclude: [
          path.resolve(__dirname, 'node_modules'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  useBuiltIns: "usage",
                },
              ],
              '@babel/preset-typescript',
              [
                '@babel/preset-react',
                {
                  development: true,
                },
              ],
            ],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              'react-hot-loader/babel',
            ],
          },
        }
      }
    ],
  },
  devServer: {
    contentBase: './dist',
    open: 'google chrome',
    hot: true,
    host: "0.0.0.0",
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      template: './examples/heroes/index.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
}