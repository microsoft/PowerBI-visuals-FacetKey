// Local ESLint plugin restoring tslint-microsoft-contrib security rules
// from the original security policy that have no maintained ESLint equivalent and
// are not covered by eslint-plugin-powerbi-visuals or core ESLint rules.
//
import path from "node:path";
import ts from "typescript";

// All rules here are AST-based (they inspect node types/shapes produced by
// the parser), not text/regex scans of source, so comments and strings that
// merely *mention* a banned pattern do not trigger a report.
//
// Parity notes / known limitations (reported, not hidden):
//  - no-string-based-timers: restores the typed timer-argument checks from
//    NoStringParameterToFunctionCallWalker. A callable type is required, not
//    merely the absence of a string literal. Like the original, matching is
//    by function/property name, not just unshadowed browser globals.
//  - no-http-template: supplements Power BI's Literal-only rule with the
//    original no-substitution-template / template-head checks and exceptions.
//    The maintained rule's extra FTP/case/leading-whitespace coverage is kept.
//  - no-disable-auto-sanitization: verified against the real
//    tslint-microsoft-contrib@5.0.1 noDisableAutoSanitizationRule.js source
//    (npm-packed to .tmp/lint-reference/package/ for reference). The ORIGINAL
//    rule only flags calls to a function literally named
//    execUnsafeLocalFunction or setInnerHTMLUnsafe (bare or as a method,
//    e.g. foo.execUnsafeLocalFunction()); it does NOT reference Angular at
//    all. That exact check is restored below. Angular's
//    DomSanitizer.bypassSecurityTrust* APIs are ALSO flagged here as an
//    explicit, clearly-labeled EXTRA (non-original) addition, since this
//    project uses neither API family, so neither branch has a reachable
//    call site in src/** to exercise today.
//  - possible-timing-attack: verified against possibleTimingAttackRule.js.
//    The original only matches when an operand's entire source text equals
//    (case-insensitively) one of password|secret|api|apiKey|token|auth|
//    pass|hash, and excludes comparisons where either side's text is
//    literally null/undefined. It does NOT do substring/property-name
//    matching (e.g. `obj.password === x` is NOT flagged by the original,
//    only a bare `password === x` is). That exact behavior is restored
//    below.
//  - react-anchor-blank-noopener / react-iframe-missing-sandbox /
//    react-no-dangerous-html: this project contains no JSX/TSX source today
//    (no React dependency, no .tsx files). The rules are restored and unit
//    tested directly against synthetic JSX via the ESLint Linter so they are
//    ready if/when JSX is introduced, but there is no existing src file that
//    exercises them.

const BYPASS_SANITIZATION_PROPERTIES = new Set([
    "bypassSecurityTrustHtml",
    "bypassSecurityTrustScript",
    "bypassSecurityTrustStyle",
    "bypassSecurityTrustUrl",
    "bypassSecurityTrustResourceUrl",
]);

// Exact function names banned by the original noDisableAutoSanitizationRule.js.
const DISABLE_SANITIZATION_FUNCTION_NAMES = new Set(["execUnsafeLocalFunction", "setInnerHTMLUnsafe"]);

// Exact regex from the original possibleTimingAttackRule.js (whole-text match).
const SENSITIVE_VAR_NAME = /^(password|secret|api|apiKey|token|auth|pass|hash)$/im;
const TIMING_UNSAFE_OPERATORS = new Set(["==", "===", "!=", "!=="]);

// Resolves the callee's function name the way AstUtils.getFunctionName did
// in the original tslint-microsoft-contrib rules: the bare identifier name,
// or (for a non-computed member access) the rightmost property name.
function getFunctionName(calleeNode) {
    if (!calleeNode) {
        return undefined;
    }
    if (calleeNode.type === "Identifier") {
        return calleeNode.name;
    }
    if (calleeNode.type === "MemberExpression" && !calleeNode.computed && calleeNode.property.type === "Identifier") {
        return calleeNode.property.name;
    }
    return undefined;
}

function getSimpleName(node) {
    if (!node) {
        return undefined;
    }
    if (node.type === "Identifier") {
        return node.name;
    }
    if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
        return node.property.name;
    }
    return undefined;
}

const TIMER_FUNCTION_NAMES = new Set(["setTimeout", "setInterval", "setImmediate"]);

// Use supplied parser type information when available. Otherwise lazily build
// a program with the parser's SourceFile overlaid on the compiler host. This
// preserves imports and tsconfig options for real project files, while also
// checking unsaved lintText buffers and synthetic filenames without writing
// fixtures to disk or requiring their inclusion in tsconfig.json.
function getTypeChecker(context) {
    const services = context.sourceCode.parserServices;
    if (services.program) {
        return services.program.getTypeChecker();
    }
    const sourceFile = services.esTreeNodeToTSNodeMap?.get(context.sourceCode.ast);
    if (!sourceFile) {
        throw new Error("security-parity/no-string-based-timers requires @typescript-eslint/parser.");
    }
    const filename = path.resolve(sourceFile.fileName);
    const configPath = ts.findConfigFile(path.dirname(filename), ts.sys.fileExists);
    let options = { target: ts.ScriptTarget.ESNext, strict: true };
    let rootNames = [filename];
    if (configPath) {
        const config = ts.readConfigFile(configPath, ts.sys.readFile);
        if (config.error) {
            throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
        }
        const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
        options = parsed.options;
        // Include project roots as well as imports so ambient declarations in
        // other project files remain visible to the checker.
        rootNames = [...new Set([filename, ...parsed.fileNames])];
    }
    const host = ts.createCompilerHost(options, true);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (name, ...args) =>
        path.resolve(name) === filename ? sourceFile : getSourceFile(name, ...args);
    return ts.createProgram(rootNames, options, host).getTypeChecker();
}

const noStringBasedTimers = {
    meta: {
        type: "problem",
        docs: { description: "Require function-valued setTimeout, setInterval and setImmediate handlers" },
        schema: [],
    },
    create(context) {
        let checker;
        return {
            CallExpression(node) {
                const callee = node.callee;
                let name = getFunctionName(callee);
                if (callee.type === "MemberExpression" && callee.computed) {
                    if (callee.property.type === "Literal") {
                        name = callee.property.value;
                    } else if (callee.property.type === "TemplateLiteral" && callee.property.expressions.length === 0) {
                        name = callee.property.quasis[0].value.cooked;
                    }
                }
                if (!TIMER_FUNCTION_NAMES.has(name) || node.arguments.length === 0) {
                    return;
                }
                const handler = node.arguments[0];
                if (handler.type === "ArrowFunctionExpression" || handler.type === "FunctionExpression") {
                    return;
                }
                // Literal/template bodies cannot be callbacks, even without a
                // type checker. All other expressions must have a callable type.
                let callable = false;
                if (handler.type !== "Literal" && handler.type !== "TemplateLiteral") {
                    checker ??= getTypeChecker(context);
                    const tsNode = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(handler);
                    const type = checker.getTypeAtLocation(tsNode);
                    const isCallable = (candidate) => checker.getSignaturesOfType(
                        checker.getBaseConstraintOfType(candidate) ?? candidate, ts.SignatureKind.Call
                    ).length > 0;
                    callable = isCallable(type);
                    // With strictBindCallApply disabled, Function.bind returns
                    // any. Preserve safe bound callbacks, but do not accept an
                    // arbitrary object's method merely because it is named bind.
                    if (!callable && (type.flags & ts.TypeFlags.Any) &&
                        handler.type === "CallExpression" &&
                        handler.callee.type === "MemberExpression" &&
                        getFunctionName(handler.callee) === "bind") {
                        const receiver = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(handler.callee.object);
                        callable = isCallable(checker.getTypeAtLocation(receiver));
                    }
                }
                if (!callable) {
                    context.report({
                        node: handler,
                        message: `${name} requires a function handler; non-function bodies are an implied-eval risk.`,
                    });
                }
            },
        };
    },
};

const noHttpTemplate = {
    meta: {
        type: "problem",
        docs: { description: "Disallow insecure URL template literals and template heads" },
        schema: [{ type: "array", items: { type: "string" }, uniqueItems: true }],
    },
    create(context) {
        const exceptions = (context.options[0] ?? []).map((pattern) => new RegExp(pattern));
        return {
            TemplateLiteral(node) {
                // Only the first quasi is a URL prefix. Later interpolation
                // chunks are not whole URL literals (same as the old walker).
                const text = node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
                if (/^\s*(http|ftp):/i.test(text) && !exceptions.some((pattern) => pattern.test(text))) {
                    context.report({ node, message: "Forbidden protocol in URL. Please use HTTPS to refer a page." });
                }
            },
        };
    },
};

const noFunctionConstructorWithStringArgs = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow the version of the Function constructor that accepts a string argument to define the function body",
        },
        schema: [],
    },
    create(context) {
        return {
            // Matches the original rule exactly: only `new Function(...)` is
            // checked (a bare `Function(...)` call without `new` is NOT
            // flagged by tslint-microsoft-contrib either), and ANY argument
            // (including a variable, not just a string/template literal)
            // is sufficient to report, since all Function constructor
            // arguments are ultimately interpreted as source text.
            NewExpression(node) {
                if (getFunctionName(node.callee) === "Function" && node.arguments.length > 0) {
                    context.report({
                        node,
                        message: "Forbidden: Function constructor with string arguments is equivalent to eval().",
                    });
                }
            },
        };
    },
};

// no-exec-script policy: no-implied-eval (core) only flags
// execScript() when it can prove it resolves to an undeclared global, which
// requires languageOptions.globals to be configured for the browser/IE
// environment. Implemented directly here so the check is unconditional and
// does not depend on global-scope configuration: flags any call to an
// identifier named execScript, or to a property named execScript on any
// object (e.g. window.execScript(...)), matching tslint-microsoft-contrib's
// original NoExecScriptRule behavior.
const noExecScript = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow calls to execScript(), an IE-specific implied-eval API",
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                const callee = node.callee;
                const isBareExecScript = callee.type === "Identifier" && callee.name === "execScript";
                const isMemberExecScript =
                    callee.type === "MemberExpression" &&
                    ((!callee.computed && callee.property.type === "Identifier" && callee.property.name === "execScript") ||
                        (callee.computed && callee.property.type === "Literal" && callee.property.value === "execScript"));
                if (isBareExecScript || isMemberExecScript) {
                    context.report({
                        node,
                        message: "Forbidden call to execScript(): an implied-eval API. Do not execute dynamic code.",
                    });
                }
            },
        };
    },
};

const noDisableAutoSanitization = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow disabling built-in HTML auto-sanitization",
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                const functionName = getFunctionName(node.callee);
                // Original tslint-microsoft-contrib behavior.
                if (functionName && DISABLE_SANITIZATION_FUNCTION_NAMES.has(functionName)) {
                    context.report({
                        node,
                        message: `Forbidden call to ${functionName}`,
                    });
                    return;
                }
                // EXTRA, non-original coverage: Angular's DomSanitizer bypass
                // APIs also disable automatic sanitization, but are not part of
                // the original rule (this project has no Angular dependency).
                if (functionName && BYPASS_SANITIZATION_PROPERTIES.has(functionName)) {
                    context.report({
                        node,
                        message: `Forbidden call to ${functionName}: disables automatic output sanitization (Angular DomSanitizer bypass; non-original extra check).`,
                    });
                }
            },
        };
    },
};

const possibleTimingAttack = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow non-constant-time equality comparisons against security-sensitive values (passwords, secrets, tokens, hashes)",
        },
        schema: [],
    },
    create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        return {
            BinaryExpression(node) {
                if (!TIMING_UNSAFE_OPERATORS.has(node.operator)) {
                    return;
                }
                const leftText = sourceCode.getText(node.left).trim();
                const rightText = sourceCode.getText(node.right).trim();
                if (leftText === "null" || rightText === "null" || leftText === "undefined" || rightText === "undefined") {
                    return;
                }
                if (SENSITIVE_VAR_NAME.test(leftText) || SENSITIVE_VAR_NAME.test(rightText)) {
                    const snippet = sourceCode.getText(node);
                    context.report({
                        node,
                        message: `Possible timing attack detected. Direct comparison found: ${snippet.slice(0, 20)}`,
                    });
                }
            },
        };
    },
};

function getJsxAttribute(openingElement, name) {
    return openingElement.attributes.find(
        (attr) => attr.type === "JSXAttribute" && attr.name && attr.name.name === name
    );
}

function getJsxAttributeStringValue(attr) {
    if (!attr || !attr.value) {
        return undefined;
    }
    if (attr.value.type === "Literal" && typeof attr.value.value === "string") {
        return attr.value.value;
    }
    if (attr.value.type === "JSXExpressionContainer") {
        const expression = attr.value.expression;
        if (expression.type === "Literal" && typeof expression.value === "string") {
            return expression.value;
        }
        if (expression.type === "TemplateLiteral" && expression.expressions.length === 0) {
            return expression.quasis[0].value.cooked;
        }
    }
    return undefined;
}

const reactAnchorBlankNoopener = {
    meta: {
        type: "problem",
        docs: {
            description: 'Require rel="noopener noreferrer" on <a target="_blank"> (reverse tabnabbing)',
        },
        schema: [],
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (!node.name || node.name.type !== "JSXIdentifier" || node.name.name !== "a") {
                    return;
                }
                const targetAttr = getJsxAttribute(node, "target");
                if (getJsxAttributeStringValue(targetAttr) !== "_blank") {
                    return;
                }
                const relAttr = getJsxAttribute(node, "rel");
                const relValue = getJsxAttributeStringValue(relAttr) || "";
                // HTML token lists use ASCII whitespace, not JavaScript's broader
                // \s class (e.g. NBSP must not turn a single token into noopener).
                const tokens = new Set(relValue.split(/[\t\n\f\r ]+/));
                if (!tokens.has("noopener") || !tokens.has("noreferrer")) {
                    context.report({
                        node,
                        message: '<a target="_blank"> must include rel="noopener noreferrer" to prevent reverse tabnabbing.',
                    });
                }
            },
        };
    },
};

// Exact allowlist from tslint-microsoft-contrib@5.0.1. Newer browser tokens
// require an explicit policy update rather than silently broadening permissions.
const SANDBOX_TOKENS = new Set([
    "", "allow-forms", "allow-modals", "allow-orientation-lock", "allow-pointer-lock",
    "allow-popups", "allow-popups-to-escape-sandbox", "allow-same-origin",
    "allow-scripts", "allow-top-navigation",
]);

const reactIframeMissingSandbox = {
    meta: {
        type: "problem",
        docs: {
            description: 'Require an iframe sandbox with valid tokens and no scripts/same-origin combination',
        },
        schema: [],
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (!node.name || node.name.type !== "JSXIdentifier" || node.name.name !== "iframe") {
                    return;
                }
                const sandbox = getJsxAttribute(node, "sandbox");
                if (!sandbox) {
                    context.report({
                        node,
                        message: "<iframe> elements must specify a \"sandbox\" attribute.",
                    });
                    return;
                }
                // As in the original, dynamic sandbox expressions are not
                // evaluated. Also check statically known JSX string expressions
                // and no-substitution templates, not just quoted attributes.
                const value = getJsxAttributeStringValue(sandbox);
                if (value === undefined) {
                    return;
                }
                const tokens = new Set(value.split(/[\t\n\f\r ]+/));
                for (const token of tokens) {
                    if (!SANDBOX_TOKENS.has(token)) {
                        context.report({ node: sandbox, message: `Invalid iframe sandbox token: ${token}` });
                    }
                }
                if (tokens.has("allow-scripts") && tokens.has("allow-same-origin")) {
                    context.report({
                        node: sandbox,
                        message: "An iframe sandbox must not combine allow-scripts and allow-same-origin.",
                    });
                }
            },
        };
    },
};

const reactNoDangerousHtml = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow dangerouslySetInnerHTML",
        },
        schema: [],
    },
    create(context) {
        return {
            JSXAttribute(node) {
                if (node.name && node.name.name === "dangerouslySetInnerHTML") {
                    context.report({
                        node,
                        message: "dangerouslySetInnerHTML is forbidden; it bypasses React's built-in escaping.",
                    });
                }
            },
        };
    },
};

const plugin = {
    meta: {
        name: "security-parity",
        version: "1.0.0",
    },
    rules: {
        "no-string-based-timers": noStringBasedTimers,
        "no-http-template": noHttpTemplate,
        "no-function-constructor-with-string-args": noFunctionConstructorWithStringArgs,
        "no-exec-script": noExecScript,
        "no-disable-auto-sanitization": noDisableAutoSanitization,
        "possible-timing-attack": possibleTimingAttack,
        "react-anchor-blank-noopener": reactAnchorBlankNoopener,
        "react-iframe-missing-sandbox": reactIframeMissingSandbox,
        "react-no-dangerous-html": reactNoDangerousHtml,
    },
};

export default plugin;
