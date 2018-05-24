/*
 * Copyright 2018 Uncharted Software Inc.
 */

const webpack = require('webpack');
const path = require('path');
const ENTRY = './src/FacetsVisual.ts';
const regex = path.normalize(ENTRY).replace(/\\/g, '\\\\').replace(/\./g, '\\.');
const HANDLEBAR_RUNTIME = 'handlebars/dist/handlebars.runtime.min';

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
        extensions: ['.json', '.webpack.js', '.web.js', '.js', '.ts'],
        alias: {
            handlebars: HANDLEBAR_RUNTIME,
        },
    },
    module: {
        rules: [
            {
                test: new RegExp(regex),
                loader: path.join(__dirname, 'bin', 'pbiPluginLoader'),
            },
            {
                test: /\.handlebars$/,
                loader: 'handlebars-loader',
                query: {
                    helperDirs: [
                        path.resolve(__dirname, 'lib/@uncharted/cards/src/handlebarHelper'),
                    ],
                    runtime: HANDLEBAR_RUNTIME,
                },
            },
            {
                test: /\bpowerbi\b.*?\butils\b.*?\bindex\.js\b/,
                loader: 'string-replace-loader',
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
        ],
    },
    plugins: [
        new webpack.ProvidePlugin({
            _: 'lodash',
            $: 'jquery',
            jQuery: 'jquery',
        }),
    ],
};
