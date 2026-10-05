'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { compileTemplates, listTemplateFiles } = require('../build/compile-templates');

test('shared template compiler emits runtime-only modules with escaped values', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'facets-template-'));
    try {
        const input = path.join(root, 'input');
        const output = path.join(root, 'output');
        fs.mkdirSync(input);
        fs.writeFileSync(path.join(input, 'hello.hbs'), '<b>{{name}}</b>');
        fs.writeFileSync(path.join(input, 'ignore.txt'), 'not a template');
        assert.deepEqual(compileTemplates(input, output), ['hello.hbs']);
        const source = fs.readFileSync(path.join(output, 'hello.js'), 'utf8');
        assert.ok(source.includes("require('handlebars/runtime')"));
        const module = { exports: {} };
        vm.runInNewContext(source, { module, require: createRequire(__filename) });
        assert.equal(module.exports({ name: '<unsafe>' }), '<b>&lt;unsafe&gt;</b>');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('template compiler rejects symlinked input and output files', { skip: process.platform === 'win32' }, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'facets-template-links-'));
    try {
        const input = path.join(root, 'input');
        const output = path.join(root, 'output');
        fs.mkdirSync(input);
        fs.mkdirSync(output);
        const protectedFile = path.join(root, 'protected.txt');
        fs.writeFileSync(protectedFile, 'unchanged');
        fs.symlinkSync(protectedFile, path.join(input, 'unsafe.hbs'));
        assert.throws(() => listTemplateFiles(input), /symlinked/);
        fs.unlinkSync(path.join(input, 'unsafe.hbs'));
        fs.writeFileSync(path.join(input, 'hello.hbs'), 'hello');
        fs.symlinkSync(protectedFile, path.join(output, 'hello.js'));
        assert.throws(() => compileTemplates(input, output));
        assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'unchanged');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
