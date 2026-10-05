// Behavioral tests for restored tslint-microsoft-contrib security rule
// policy (see eslint.config.mjs). These run the real
// ESLint Linter against small accepted/rejected snippets so comment-only
// mentions of banned terms are proven NOT to trigger (AST-based, not text
// matching), and the original no-http-string example-URL exceptions are
// proven to still be honored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import powerbiVisualsPlugin from 'eslint-plugin-powerbi-visuals';
import globals from 'globals';
import securityParityPlugin from './eslint-plugin-security-parity.mjs';

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

const httpRule = {
    'powerbi-visuals/no-http-string': [
        'error',
        ['http://www.example.com/?.*', 'http://www.examples.com/?.*'],
    ],
};

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

// --- powerbi-visuals/no-string-based-set-immediate ---

test('no-string-based-set-immediate rejects a string body', () => {
    assertRejects('setImmediate("doSomething()");', {
        'powerbi-visuals/no-string-based-set-immediate': 'error',
    });
});

test('no-string-based-set-immediate accepts a function body', () => {
    assertAccepts('setImmediate(() => doSomething());', {
        'powerbi-visuals/no-string-based-set-immediate': 'error',
    });
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

// --- core no-implied-eval (no-exec-script / no-string-based-set-interval / no-string-based-set-timeout parity) ---

test('no-implied-eval rejects setTimeout with a string body', () => {
    assertRejects('setTimeout("doSomething()", 100);', { 'no-implied-eval': 'error' });
});

test('no-implied-eval rejects setInterval with a string body', () => {
    assertRejects('setInterval("doSomething()", 100);', { 'no-implied-eval': 'error' });
});

test('no-implied-eval accepts setTimeout with a function body', () => {
    assertAccepts('setTimeout(() => doSomething(), 100);', { 'no-implied-eval': 'error' });
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

test('react-anchor-blank-noopener rejects target=_blank without rel=noopener', () => {
    assertRejects('const el = <a target="_blank" href="x">link</a>;', {
        'security-parity/react-anchor-blank-noopener': 'error',
    }, { jsx: true, filename: 'test.tsx' });
});

test('react-anchor-blank-noopener accepts target=_blank with rel=noopener', () => {
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
