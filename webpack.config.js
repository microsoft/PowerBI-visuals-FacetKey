const webpack = require('webpack');
const path = require('path');
const ENTRY = './src/FacetsVisual.ts';

module.exports = {
    entry: ENTRY,
    devtool: 'eval',
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.js', '.ts'],
        alias: {
          'handlebars' : 'handlebars/dist/handlebars.js'
        }
    },
    module: {
        loaders: [
            {
              test: new RegExp(ENTRY),
              loader: path.join(__dirname, 'bin', 'pbiPluginLoader'),
            },
            {
                test: /\.ts?$/,
                loader: 'ts-loader',
            },
        ]
    },
    externals: [
        {
            jquery: "jQuery",
            "lodash": "_"
        },
    ]
}
