// Browser unit-test configuration only. Production and development builds use
// the webpack pipeline supplied by powerbi-visuals-tools (pbiviz).
module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    resolve: { extensions: ['.js', '.ts'] },
    module: {
        rules: [
            { test: /\.ts$/, exclude: /node_modules/, loader: 'ts-loader' },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        ],
    },
};
