// Behavioral tests for restored tslint-microsoft-contrib security rule
// policy (see eslint.config.mjs). These run the real
// ESLint Linter against small accepted/rejected snippets so comment-only
// mentions of banned terms are proven NOT to trigger (AST-based, not text
// matching), and the original no-http-string example-URL exceptions are
// proven to still be honored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint, Linter } from 'eslint';
import { fileURLToPath } from 'node:url';
import parser from '@typescript-eslint/parser';
import powerbiVisualsPlugin from 'eslint-plugin-powerbi-visuals';
import globals from 'globals';
import securityParityPlugin from './eslint-plugin-security-parity.mjs';
import projectConfig from '../eslint.config.mjs';

const linter = new Linter({ configType: 'flat' });

function lint(code, rules, { filename = 'test.ts', jsx = false, sourceType = 'module', useTsParser = true } = {}) {
    const config = {
        files: [jsx ? '**/*.tsx' : '**/*.ts'],
        languageOptions: {
            ...(useTsParser ? { parser } : {}),
            sourceType,
            globals: { ...globals.browser, ...globals.es2017 },
            parserOptions: jsx ? { ecmaFeatures: { jsx: true } } : {},
        },
        plugins: {
            'powerbi-visuals': powerbiVisualsPlugin,
            'security-parity': securityParityPlugin,
        },
        rules,
    };
    const messages = linter.verify(code, [config], { filename });
    const fatal = messages.find((m) => m.fatal);
    assert.equal(fatal, undefined, `unexpected parse error: ${fatal && fatal.message}`);
    return messages;
}

function assertRejects(code, rules, opts) {
    const messages = lint(code, rules, opts);
    assert.ok(messages.length > 0, `expected a violation for: ${code}`);
    return messages;
}

function assertAccepts(code, rules, opts) {
    const messages = lint(code, rules, opts);
    assert.deepEqual(messages, [], `expected no violations for: ${code}, got ${JSON.stringify(messages)}`);
}

// --- powerbi-visuals/no-banned-terms (no-eval, no-cookies, caller/callee/arguments) ---

test('no-banned-terms rejects eval() call', () => {
    assertRejects('eval("2+2");', { 'powerbi-visuals/no-banned-terms': 'error' });
});

test('no-banned-terms rejects document.cookie read', () => {
    assertRejects('const c = document.cookie;', { 'powerbi-visuals/no-banned-terms': 'error' });
});

test('no-banned-terms rejects document.cookie write', () => {
    assertRejects('document.cookie = "a=b";', { 'powerbi-visuals/no-banned-terms': 'error' });
});

test('no-banned-terms does not trigger on a comment mentioning eval/cookie (AST-based)', () => {
    assertAccepts(
        '// eval and cookie are dangerous, do not use document.cookie\nconst x = 1;',
        { 'powerbi-visuals/no-banned-terms': 'error' }
    );
});

test('no-banned-terms accepts unrelated code', () => {
    assertAccepts('const sum = 1 + 2;', { 'powerbi-visuals/no-banned-terms': 'error' });
});

// --- powerbi-visuals/insecure-random ---

test('insecure-random rejects Math.random()', () => {
    assertRejects('const r = Math.random();', { 'powerbi-visuals/insecure-random': 'error' });
});

test('insecure-random accepts crypto.getRandomValues()', () => {
    assertAccepts('window.crypto.getRandomValues(new Uint32Array(1));', {
        'powerbi-visuals/insecure-random': 'error',
    });
});

// --- powerbi-visuals/no-document-write ---

test('no-document-write rejects document.write', () => {
    assertRejects('document.write("<p>hi</p>");', { 'powerbi-visuals/no-document-write': 'error' });
});

test('no-document-write does not trigger on a comment (AST-based)', () => {
    assertAccepts('// document.write is forbidden\nconst x = 1;', {
        'powerbi-visuals/no-document-write': 'error',
    });
});

// --- powerbi-visuals/no-document-domain ---

test('no-document-domain rejects document.domain assignment', () => {
    assertRejects('document.domain = "example.com";', { 'powerbi-visuals/no-document-domain': 'error' });
});

test('no-document-domain accepts unrelated assignment', () => {
    assertAccepts('const domain = "example.com";', { 'powerbi-visuals/no-document-domain': 'error' });
});

// --- powerbi-visuals/no-inner-outer-html (no-inner-html parity) ---

test('no-inner-outer-html rejects innerHTML assignment', () => {
    assertRejects('el.innerHTML = userInput;', { 'powerbi-visuals/no-inner-outer-html': 'error' });
});

test('no-inner-outer-html rejects outerHTML assignment', () => {
    assertRejects('el.outerHTML = userInput;', { 'powerbi-visuals/no-inner-outer-html': 'error' });
});

test('no-inner-outer-html accepts textContent assignment', () => {
    assertAccepts('el.textContent = userInput;', { 'powerbi-visuals/no-inner-outer-html': 'error' });
});

// --- powerbi-visuals/no-implied-inner-html ---

test('no-implied-inner-html rejects insertAdjacentHTML', () => {
    assertRejects('el.insertAdjacentHTML("beforeend", userInput);', {
        'powerbi-visuals/no-implied-inner-html': 'error',
    });
});

test('no-implied-inner-html rejects jQuery-style .html(string)', () => {
    assertRejects('$el.html(userInput);', { 'powerbi-visuals/no-implied-inner-html': 'error' });
});

// --- powerbi-visuals/no-http-string (preserving original policy exceptions) ---

const httpRule = Object.fromEntries(
    ['powerbi-visuals/no-http-string', 'security-parity/no-http-template']
        .map((name) => [name, projectConfig[0].rules[name]])
);

test('no-http-string rejects a plain http:// URL', () => {
    assertRejects('const u = "http://insecure.site/path";', httpRule);
});

test('no-http-string rejects an ftp:// URL', () => {
    assertRejects('const u = "ftp://insecure.site/path";', httpRule);
});

test('no-http-string allows the original example.com exception', () => {
    assertAccepts('const u = "http://www.example.com/?foo=bar";', httpRule);
});

test('no-http-string allows the original examples.com exception', () => {
    assertAccepts('const u = "http://www.examples.com/?foo=bar";', httpRule);
});

test('no-http-string accepts https:// URLs', () => {
    assertAccepts('const u = "https://secure.site/path";', httpRule);
});

// --- security-parity/no-string-based-timers ---

const timerRuleId = 'security-parity/no-string-based-timers';
const timerRule = { [timerRuleId]: projectConfig[0].rules[timerRuleId] };

test('no-string-based-set-immediate rejects a string body', () => {
    assertRejects('setImmediate("doSomething()");', timerRule);
});

test('no-string-based-set-immediate accepts a function body', () => {
    assertAccepts('setImmediate(() => doSomething());', timerRule);
});

// --- powerbi-visuals/non-literal-require ---

test('non-literal-require rejects a dynamic specifier', () => {
    assertRejects('require(moduleName);', { 'powerbi-visuals/non-literal-require': 'error' });
});

test('non-literal-require accepts a literal specifier', () => {
    assertAccepts('require("./module");', { 'powerbi-visuals/non-literal-require': 'error' });
});

// --- core no-eval ---

test('no-eval rejects eval', () => {
    assertRejects('eval("1+1");', { 'no-eval': 'error' });
});

// --- no-string-based-set-interval / no-string-based-set-timeout parity ---

test('timer policy rejects setTimeout with a string body', () => {
    assertRejects('setTimeout("doSomething()", 100);', timerRule);
});

test('timer policy rejects setInterval with a string body', () => {
    assertRejects('setInterval("doSomething()", 100);', timerRule);
});

test('timer policy accepts setTimeout with a function body', () => {
    assertAccepts('setTimeout(() => doSomething(), 100);', timerRule);
});

// --- security-parity/no-exec-script ---

test('no-exec-script rejects a bare execScript() call', () => {
    assertRejects('execScript("doSomething()");', { 'security-parity/no-exec-script': 'error' });
});

test('no-exec-script rejects window.execScript() call', () => {
    assertRejects('window.execScript("doSomething()");', { 'security-parity/no-exec-script': 'error' });
});

test('no-exec-script does not trigger on a comment (AST-based)', () => {
    assertAccepts('// do not call execScript here\nconst x = 1;', { 'security-parity/no-exec-script': 'error' });
});

test('no-exec-script accepts unrelated calls', () => {
    assertAccepts('doSomething();', { 'security-parity/no-exec-script': 'error' });
});

// --- core no-octal (no-octal-literal parity) ---

test('no-octal rejects a legacy octal literal', () => {
    assertRejects('var x = 010;', { 'no-octal': 'error' }, { sourceType: 'script', useTsParser: false });
});

test('no-octal accepts a decimal literal', () => {
    assertAccepts('const x = 10;', { 'no-octal': 'error' }, { useTsParser: false });
});

// --- core no-unsafe-finally ---

test('no-unsafe-finally rejects a return inside finally', () => {
    assertRejects(
        'function f() { try { return 1; } finally { return 2; } }',
        { 'no-unsafe-finally': 'error' }
    );
});

test('no-unsafe-finally accepts a finally without control-flow statements', () => {
    assertAccepts(
        'function f() { try { return 1; } finally { console.log("cleanup"); } }',
        { 'no-unsafe-finally': 'error' }
    );
});

// --- security-parity/no-function-constructor-with-string-args ---

test('no-function-constructor-with-string-args rejects new Function(string)', () => {
    assertRejects('new Function("return 1");', {
        'security-parity/no-function-constructor-with-string-args': 'error',
    });
});

test('no-function-constructor-with-string-args rejects new Function(variable) (any argument counts, per original rule)', () => {
    assertRejects('new Function(userInput);', {
        'security-parity/no-function-constructor-with-string-args': 'error',
    });
});

// The original tslint-microsoft-contrib rule only implements visitNewExpression;
// a bare `Function(...)` call without `new` is NOT flagged, even though it is
// equally dangerous. This is a known, deliberate parity limitation inherited
// from the original rule, not an oversight in this reimplementation.
test('no-function-constructor-with-string-args accepts Function(string) without new (matches original rule limitation)', () => {
    assertAccepts('Function("a", "return a");', {
        'security-parity/no-function-constructor-with-string-args': 'error',
    });
});

test('no-function-constructor-with-string-args accepts new Function() with no args', () => {
    assertAccepts('new Function();', {
        'security-parity/no-function-constructor-with-string-args': 'error',
    });
});

test('no-function-constructor-with-string-args accepts unrelated functions named Function-like', () => {
    assertAccepts('somethingElse("a");', {
        'security-parity/no-function-constructor-with-string-args': 'error',
    });
});

// --- security-parity/no-disable-auto-sanitization ---

test('no-disable-auto-sanitization rejects a bare execUnsafeLocalFunction() call (original rule semantics)', () => {
    assertRejects('execUnsafeLocalFunction(userInput);', {
        'security-parity/no-disable-auto-sanitization': 'error',
    });
});

test('no-disable-auto-sanitization rejects obj.setInnerHTMLUnsafe() (original rule semantics)', () => {
    assertRejects('el.setInnerHTMLUnsafe(userInput);', {
        'security-parity/no-disable-auto-sanitization': 'error',
    });
});

test('no-disable-auto-sanitization rejects bypassSecurityTrustHtml (extra, non-original Angular coverage)', () => {
    assertRejects('sanitizer.bypassSecurityTrustHtml(userInput);', {
        'security-parity/no-disable-auto-sanitization': 'error',
    });
});

test('no-disable-auto-sanitization accepts sanitize()', () => {
    assertAccepts('sanitizer.sanitize(userInput);', {
        'security-parity/no-disable-auto-sanitization': 'error',
    });
});

test('no-disable-auto-sanitization does not trigger on a comment (AST-based)', () => {
    assertAccepts('// do not call execUnsafeLocalFunction here\nconst x = 1;', {
        'security-parity/no-disable-auto-sanitization': 'error',
    });
});

// --- security-parity/possible-timing-attack ---
// Matches the exact original regex /^(password|secret|api|apiKey|token|auth|pass|hash)$/im,
// which tests an operand's ENTIRE source text, not a substring/property name.

test('possible-timing-attack rejects === comparison against a bare `password` identifier', () => {
    assertRejects('if (password === input) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

test('possible-timing-attack rejects == comparison against a bare `token` identifier', () => {
    assertRejects('if (token == expected) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

test('possible-timing-attack accepts comparisons of non-sensitive values', () => {
    assertAccepts('if (count === total) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

test('possible-timing-attack excludes null comparisons (matches original rule exclusion)', () => {
    assertAccepts('if (password === null) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

test('possible-timing-attack excludes undefined comparisons (matches original rule exclusion)', () => {
    assertAccepts('if (token === undefined) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

// Known original-rule limitation (not a reimplementation gap): the original
// regex matches an operand's ENTIRE text, so property access like
// `obj.password` is NOT flagged, only a bare `password` identifier is.
test('possible-timing-attack accepts a property-access comparison (matches original rule limitation)', () => {
    assertAccepts('if (request.password === input) { ok(); }', {
        'security-parity/possible-timing-attack': 'error',
    });
});

// --- security-parity/react-anchor-blank-noopener ---

test('react-anchor-blank-noopener rejects target=_blank without rel=noopener noreferrer', () => {
    assertRejects('const el = <a target="_blank" href="x">link</a>;', {
        'security-parity/react-anchor-blank-noopener': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

test('react-anchor-blank-noopener accepts target=_blank with rel=noopener noreferrer', () => {
    assertAccepts('const el = <a target="_blank" rel="noopener noreferrer" href="x">link</a>;', {
        'security-parity/react-anchor-blank-noopener': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

test('react-anchor-blank-noopener accepts anchors without target=_blank', () => {
    assertAccepts('const el = <a href="x">link</a>;', {
        'security-parity/react-anchor-blank-noopener': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

// --- security-parity/react-iframe-missing-sandbox ---

test('react-iframe-missing-sandbox rejects an iframe without sandbox', () => {
    assertRejects('const el = <iframe src="x"></iframe>;', {
        'security-parity/react-iframe-missing-sandbox': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

test('react-iframe-missing-sandbox accepts an iframe with sandbox', () => {
    assertAccepts('const el = <iframe src="x" sandbox=""></iframe>;', {
        'security-parity/react-iframe-missing-sandbox': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

// --- security-parity/react-no-dangerous-html ---

test('react-no-dangerous-html rejects dangerouslySetInnerHTML', () => {
    assertRejects('const el = <div dangerouslySetInnerHTML={{ __html: userInput }} />;', {
        'security-parity/react-no-dangerous-html': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

test('react-no-dangerous-html accepts plain children', () => {
    assertAccepts('const el = <div>{userInput}</div>;', {
        'security-parity/react-no-dangerous-html': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

// Reviewed parity regressions. Assert the actual rule IDs/counts, so an
// unrelated error cannot masquerade as successful security enforcement.
function assertRuleMessages(messages, ruleId, count) {
    assert.equal(messages.length, count, JSON.stringify(messages));
    assert.ok(messages.every((message) => !message.fatal && message.ruleId === ruleId), JSON.stringify(messages));
}

test('timer policy rejects dynamically produced string-typed handlers for every timer API', () => {
    const messages = lint(`
        const code: string = location.hash.slice(1);
        setTimeout(code, 1);
        setInterval(code, 1);
        setImmediate(code);
        window.setTimeout(code, 1);
        window['setInterval'](code, 1);
        globalThis.setImmediate(code);
        window[\`setTimeout\`](code, 1);
        const timer = { setTimeout(handler: unknown, delay: number) {} };
        timer.setTimeout(code, 1);
    `, timerRule);
    assertRuleMessages(messages, timerRuleId, 8);
});

test('timer policy rejects static and interpolated templates, concatenations and string casts', () => {
    const cases = [
        'setTimeout(`doSomething()`, 1);',
        'setInterval(`doSomething(${value})`, 1);',
        'setImmediate(`doSomething()`);',
        'setImmediate(`doSomething(${value})`);',
        'setImmediate("do" + value);',
        'setTimeout(location.hash as string, 1);',
        'setInterval(<string>location.hash, 1);',
    ];
    assertRuleMessages(lint(cases.join('\n'), timerRule), timerRuleId, cases.length);
});

test('timer policy requires a callable type, including factories and properties', () => {
    const calls = [
        'setTimeout(1, 1);',
        'setInterval(null, 1);',
        'setImmediate(unknownValue);',
        'setTimeout(anyValue, 1);',
        'setInterval(receiver.code, 1);',
        'setImmediate(makeString());',
        'setTimeout(maybeCallback, 1);',
        'setInterval(fake.bind(), 1);',
    ];
    const declarations = `
        declare const unknownValue: unknown;
        declare const anyValue: any;
        declare const receiver: { code: string };
        declare function makeString(): string;
        declare const maybeCallback: string | (() => void);
        const fake = { bind: () => 'not a callback' };
    `;
    assertRuleMessages(lint(declarations + calls.join('\n'), timerRule), timerRuleId, calls.length);
});

test('timer policy accepts callable types, imports, bound callbacks, factories and generics', () => {
    assertAccepts(`
        import { clearTimeout as importedCallback } from 'node:timers';
        const callback: () => void = () => {};
        function declaredCallback() {}
        declare function makeCallback(): () => void;
        declare const receiver: { callback(): void };
        setTimeout(callback, 1);
        setInterval(declaredCallback, 1);
        setImmediate(importedCallback);
        setTimeout(makeCallback(), 1);
        setInterval(receiver.callback, 1);
        setImmediate(declaredCallback.bind(null));
        setTimeout(function () {}, 1);
        function schedule<T extends () => void>(handler: T) { setTimeout(handler, 1); }
        // Strings in non-handler arguments are data, not code.
        setTimeout(callback, 1, 'data');
        otherFunction(location.hash);
        setTimeout();
        // setTimeout('comment only', 1);
        const documentation = 'setImmediate(location.hash)';
    `, timerRule);
});

test('timer policy respects callback variable scope instead of accepting a shadowed string', () => {
    const messages = lint(`
        const callback = () => {};
        setTimeout(callback, 1);
        function nested(callback: string) { setInterval(callback, 1); }
    `, timerRule);
    assertRuleMessages(messages, timerRuleId, 1);
});

for (const source of [
    'const u = `http://insecure.site/path`;',
    'const u = `http://${host}/path`;',
    'const u = `http://insecure.site/${path}`;',
    'const u = `ftp://${host}/path`;',
    'const u = ` HTTP://insecure.site/path`;',
    'const u = `\\x68ttp://insecure.site/path`;',
    'const u = tag`http://${host}/path`;',
]) {
    test(`HTTP template policy rejects ${source}`, () => {
        assertRuleMessages(lint(source, httpRule), 'security-parity/no-http-template', 1);
    });
}

for (const source of [
    'const u = `https://secure.site/path`;',
    'const u = `https://${host}/path`;',
    'const u = `http://www.example.com/?foo=bar`;',
    'const u = `http://www.examples.com/?foo=bar`;',
    'const u = `http://www.example.com/${path}`;',
    'const u = `http://www.examples.com/${path}`;',
    // Preserve original prefix-only matching, not a scan of every quasi.
    'const u = `${prefix}http://insecure.site/path`;',
    '// const u = `http://insecure.site/path`;\nconst x = 1;',
    'const documentation = "Do not use `http://insecure.site/path`";',
]) {
    test(`HTTP template policy accepts ${source}`, () => assertAccepts(source, httpRule));
}

const jsxOptions = { jsx: true, filename: 'test.tsx' };
const anchorRuleId = 'security-parity/react-anchor-blank-noopener';
const sandboxRuleId = 'security-parity/react-iframe-missing-sandbox';

for (const rel of [
    '', 'noopener', 'noreferrer', 'not-noopener noreferrer',
    'noopener not-noreferrer', 'noopener,noreferrer', 'noopener-noreferrer',
    'noopener\u00a0noreferrer', 'noopener\u2003noreferrer',
]) {
    test(`anchor policy rejects incomplete or partial rel tokens: ${JSON.stringify(rel)}`, () => {
        assertRuleMessages(lint(
            `const el = <a target="_blank" rel=${JSON.stringify(rel)} />;`,
            { [anchorRuleId]: 'error' }, jsxOptions
        ), anchorRuleId, 1);
    });
}

for (const relExpression of [
    '"noopener noreferrer"',
    '" noreferrer\\tnoopener\\nexternal "',
    '`noopener noreferrer`',
]) {
    test(`anchor policy accepts complete whitespace-separated rel tokens: ${relExpression}`, () => {
        assertAccepts(`const el = <a target={"_blank"} rel={${relExpression}} />;`,
            { [anchorRuleId]: 'error' }, jsxOptions);
    });
}

test('anchor policy checks static template expressions rather than accepting partial tokens', () => {
    assertRuleMessages(lint('const el = <a target={`_blank`} rel={`not-noopener noreferrer`} />;',
        { [anchorRuleId]: 'error' }, jsxOptions), anchorRuleId, 1);
});

for (const sandbox of [
    '"allow-scripts allow-same-origin"',
    '"allow-same-origin allow-forms allow-scripts"',
    '{"allow-scripts\\tallow-same-origin"}',
    '{`allow-scripts allow-same-origin`}',
    '"allow-everything"',
    '"allow-scripts-suffix"',
    '"allow-scripts,allow-same-origin"',
    '"allow-scripts\u00a0allow-same-origin"',
    // A newer token must not silently widen the historical allowlist.
    '"allow-downloads"',
]) {
    test(`sandbox policy rejects unsafe combinations or invalid tokens: ${sandbox}`, () => {
        assertRuleMessages(lint(`const el = <iframe sandbox=${sandbox} />;`,
            { [sandboxRuleId]: 'error' }, jsxOptions), sandboxRuleId, 1);
    });
}

for (const sandbox of [
    '""',
    '"allow-scripts"',
    '"allow-same-origin"',
    '"allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-top-navigation"',
    '{" allow-forms\\tallow-scripts "}',
    '{`allow-same-origin allow-forms`}',
    // Dynamic values were not validated by the original sandbox rule.
    '{permissions}',
]) {
    test(`sandbox policy accepts allowed tokens: ${sandbox}`, () => {
        assertAccepts(`const el = <iframe sandbox=${sandbox} />;`, { [sandboxRuleId]: 'error' }, jsxOptions);
    });
}

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({ cwd: projectRoot });

test('real flat config enforces timer and template rules in unsaved lintText buffers', async () => {
    const [result] = await eslint.lintText(`
        const code: string = location.hash.slice(1);
        setTimeout(code, 1);
        setInterval(code, 1);
        setImmediate(code);
        setImmediate(\`run(\${code})\`);
        const url = \`http://\${location.host}/path\`;
    `, { filePath: 'src/__security_policy_regression__.ts' });
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
    assert.deepEqual(result.messages.map((message) => message.ruleId), [
        timerRuleId, timerRuleId, timerRuleId, timerRuleId, 'security-parity/no-http-template',
    ]);
});

test('real flat config enforces JSX token rules in unsaved lintText buffers', async () => {
    const [result] = await eslint.lintText(`
        const anchor = <a target="_blank" rel="not-noopener noreferrer" />;
        const frame = <iframe sandbox="allow-scripts allow-same-origin" />;
    `, { filePath: 'src/__security_policy_regression__.tsx' });
    assert.deepEqual(result.messages.map((message) => message.ruleId), [anchorRuleId, sandboxRuleId]);
});

test('real flat config accepts safe callbacks, URLs and JSX in unsaved lintText buffers', async () => {
    const [result] = await eslint.lintText(`
        import { clearTimeout as callback } from 'node:timers';
        setTimeout(callback, 1);
        setInterval(() => {}, 1);
        setImmediate(function () {});
        const url = \`https://\${location.host}/path\`;
        const example = \`http://www.example.com/\${location.hash}\`;
        const examples = \`http://www.examples.com/\${location.hash}\`;
        const anchor = <a target="_blank" rel="noopener noreferrer" />;
        const frame = <iframe sandbox="allow-scripts allow-forms" />;
    `, { filePath: 'src/__security_policy_regression__.tsx' });
    assert.deepEqual(result.messages, []);
});

test('timer policy also works with an existing parser-supplied TypeScript project', async () => {
    const typedEslint = new ESLint({
        cwd: projectRoot,
        overrideConfig: [{ languageOptions: { parserOptions: {
            project: './tsconfig.json', tsconfigRootDir: projectRoot,
        } } }],
    });
    // Use an included filename, but never modify its contents on disk.
    const [result] = await typedEslint.lintText(`
        const code: string = location.hash.slice(1);
        setTimeout(code, 1);
        const callback: () => void = () => {};
        setInterval(callback, 1);
    `, { filePath: 'src/FacetsVisual.ts' });
    assertRuleMessages(result.messages, timerRuleId, 1);
});
