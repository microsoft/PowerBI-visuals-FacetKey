'use strict';

const fs = require('node:fs');
const webpackConfig = require('./webpack.config');
const isTddMode = process.argv.includes('--tdd');

if (!process.env.CHROME_BIN && process.platform === 'darwin') {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(chrome)) process.env.CHROME_BIN = chrome;
}

module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'webpack'],
        files: ['tests/browser-setup.ts', 'src/**/*.spec.ts'],
        preprocessors: {
            'tests/browser-setup.ts': ['webpack'],
            'src/**/*.spec.ts': ['webpack'],
        },
        webpack: webpackConfig,
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: isTddMode,
        browsers: [isTddMode ? 'Chrome' : 'ChromeHeadless'],
        singleRun: !isTddMode,
        concurrency: 1,
        browserNoActivityTimeout: 30000,
    });
};
