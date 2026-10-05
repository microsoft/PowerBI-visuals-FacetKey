import parser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import powerbiVisualsPlugin from 'eslint-plugin-powerbi-visuals';
import globals from 'globals';
import securityParityPlugin from './lint/eslint-plugin-security-parity.mjs';

// Original no-http-string policy exceptions, shared by literal/template checks.
const insecureUrlExceptions = ['http://www.example.com/?.*', 'http://www.examples.com/?.*'];

// Current security policy: maintained Power BI and core ESLint rules plus
// local AST rules. The local plugin is active security enforcement, not a
// compatibility layer. See lint/*.test.mjs for behavioral regression coverage.
export default [
    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
            parser,
            // The local timer rule obtains type information lazily, including
            // for unsaved lintText buffers not included in tsconfig.json.
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
            // Keep core's static-value checks as defense in depth; supplement
            // them with dynamic handler types for all three timer APIs.
            // execScript is prohibited unconditionally by the local rule below.
            'no-implied-eval': 'error',
            'security-parity/no-string-based-timers': 'error',
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
            'powerbi-visuals/no-http-string': ['error', insecureUrlExceptions],
            // Power BI's rule only visits Literal nodes; restore the original
            // template-literal/template-head checks with the same exceptions.
            'security-parity/no-http-template': ['error', insecureUrlExceptions],
            // Reject unsafe innerHTML/outerHTML writes.
            'powerbi-visuals/no-inner-outer-html': 'error',
            // Additional insecure-HTML-write parity (insertAdjacentHTML/jQuery .html()).
            'powerbi-visuals/no-implied-inner-html': 'error',
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
