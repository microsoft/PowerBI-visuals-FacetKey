// Local ESLint plugin restoring tslint-microsoft-contrib security rules
// from the original security policy that have no maintained ESLint equivalent and
// are not covered by eslint-plugin-powerbi-visuals or core ESLint rules.
//
// All rules here are AST-based (they inspect node types/shapes produced by
// the parser), not text/regex scans of source, so comments and strings that
// merely *mention* a banned pattern do not trigger a report.
//
// Parity notes / known limitations (reported, not hidden):
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
    if (
        attr.value.type === "JSXExpressionContainer" &&
        attr.value.expression.type === "Literal" &&
        typeof attr.value.expression.value === "string"
    ) {
        return attr.value.expression.value;
    }
    return undefined;
}

const reactAnchorBlankNoopener = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow <a target=\"_blank\"> without rel=\"noopener\" (reverse tabnabbing)",
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
                if (!/\bnoopener\b/.test(relValue)) {
                    context.report({
                        node,
                        message: '<a target="_blank"> must include rel="noopener" to prevent reverse tabnabbing.',
                    });
                }
            },
        };
    },
};

const reactIframeMissingSandbox = {
    meta: {
        type: "problem",
        docs: {
            description: 'Disallow <iframe> elements without a "sandbox" attribute',
        },
        schema: [],
    },
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (!node.name || node.name.type !== "JSXIdentifier" || node.name.name !== "iframe") {
                    return;
                }
                if (!getJsxAttribute(node, "sandbox")) {
                    context.report({
                        node,
                        message: "<iframe> elements must specify a \"sandbox\" attribute.",
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
