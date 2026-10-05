import parser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import powerbiVisualsPlugin from 'eslint-plugin-powerbi-visuals';
import globals from 'globals';
import securityParityPlugin from './lint/eslint-plugin-security-parity.mjs';

// Current security policy: maintained Power BI and core ESLint rules plus
// local AST rules. The local plugin is active security enforcement, not a
// compatibility layer. See lint/*.test.mjs for behavioral regression coverage.
export default [
    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
            parser,
            // Required for core 'no-implied-eval' to recognize bare
            // setTimeout()/setInterval() calls as references to the real
            // global functions; without declared globals
            // ESLint cannot prove the callee isn't a locally shadowed name
            // and silently never reports.
            globals: {
                ...globals.browser,
                ...globals.es2017,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'powerbi-visuals': powerbiVisualsPlugin,
            'security-parity': securityParityPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            'no-debugger': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'error',
            'valid-typeof': 'error',
            'no-eval': 'error',
            // Reject string-based setTimeout/setInterval bodies.
            // (execScript() parity is handled unconditionally by
            // security-parity/no-exec-script below, since no-implied-eval only
            // flags execScript() when it can prove it is an undeclared global.)
            'no-implied-eval': 'error',
            // Reject octal literals.
            'no-octal': 'error',
            // Protect control flow in finally blocks.
            'no-unsafe-finally': 'error',

            // Security checks provided by eslint-plugin-powerbi-visuals.
            // Covers no-eval / caller / callee / arguments (exact tslint-microsoft-contrib
            // banned-terms list). Also restores no-cookies parity: the original
            // no-cookies rule is TYPE-aware (flags `.cookie` access only when the
            // receiver's TS type is `Document` or `any`); this rule has no type
            // information, so it instead flags the bare `cookie` Identifier
            // anywhere it appears (any receiver, any type) -- a superset of the
            // original's Document/any-typed check, so aliased `Document`-typed
            // receivers (e.g. `const doc: Document = document; doc.cookie`) are
            // still caught, at the cost of also flagging unrelated local
            // variables/properties literally named `cookie`.
            'powerbi-visuals/no-banned-terms': 'error',
            'powerbi-visuals/no-document-domain': 'error',
            'powerbi-visuals/no-document-write': 'error',
            // Preserve the original policy's explicit example-URL exceptions.
            'powerbi-visuals/no-http-string': [
                'error',
                ['http://www.example.com/?.*', 'http://www.examples.com/?.*'],
            ],
            // Reject unsafe innerHTML/outerHTML writes.
            'powerbi-visuals/no-inner-outer-html': 'error',
            // Additional insecure-HTML-write parity (insertAdjacentHTML/jQuery .html()).
            'powerbi-visuals/no-implied-inner-html': 'error',
            'powerbi-visuals/no-string-based-set-immediate': 'error',
            'powerbi-visuals/non-literal-require': 'error',
            'powerbi-visuals/insecure-random': 'error',

            // Additional security rules supplied by the local
            // lint/eslint-plugin-security-parity.mjs
            // plugin. See that file for parity notes/limitations.
            'security-parity/no-function-constructor-with-string-args': 'error',
            'security-parity/no-exec-script': 'error',
            'security-parity/no-disable-auto-sanitization': 'error',
            'security-parity/possible-timing-attack': 'error',
            'security-parity/react-anchor-blank-noopener': 'error',
            'security-parity/react-iframe-missing-sandbox': 'error',
            'security-parity/react-no-dangerous-html': 'error',

            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            // `cond && (x = y)` / `cond && fn()` is the established idiom throughout
            // this legacy codebase (pre-dating this modernization); not rewritten
            // wholesale to avoid an out-of-scope behavioral rewrite.
            '@typescript-eslint/no-unused-expressions': 'off',
            // The vendored component exposes a CommonJS source entry point.
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
