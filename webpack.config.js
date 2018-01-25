const webpack = require('webpack');
const path = require('path');
const ENTRY = './src/FacetsVisual.ts';
const regex = path.normalize(ENTRY).replace(/\\/g, '\\\\').replace(/\./g, '\\.');

const POWERBI_UTILS = [
    './node_modules/globalize/lib/cultures/globalize.culture.en-US.js',
    './node_modules/powerbi-visuals-utils-typeutils/lib/index.js',
    './node_modules/powerbi-visuals-utils-dataviewutils/lib/index.js',
    './node_modules/powerbi-visuals-utils-formattingutils/lib/index.js'
];

module.exports = {
    entry: POWERBI_UTILS.concat(ENTRY),
    devtool: 'eval',
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.js', '.ts'],
        alias: {
            'handlebars': 'handlebars/dist/handlebars.js'
        }
    },
    module: {
        preLoaders: [
            {
                test: /\.ts$/,
                loader: "tslint"
            }
        ],
        loaders: [
            {
                test: new RegExp(regex),
                loader: path.join(__dirname, 'bin', 'pbiPluginLoader'),
            },
            {
                test: /\bpowerbi\b.*?\butils\b.*?\bindex\.js\b/,
                loader: 'string-replace',
                query: {
                    multiple: [
                        { search: 'var powerbi;', replace: 'var powerbi = window.powerbi;' },
                        { search: 'var Globalize = Globalize || window["Globalize"];', replace: 'var Globalize = require(\'globalize\');' },
                    ]
                }
            },
            {
                test: /\.ts?$/,
                loader: 'ts-loader',
            },
        ]
    },
    tslint: {
        typeCheck: true,
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            _: 'lodash',
        }),
    ]
};
