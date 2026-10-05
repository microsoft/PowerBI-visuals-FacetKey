'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const api = require('powerbi-visuals-api');
const capabilities = require('../capabilities.json');
const pbiviz = require('../pbiviz.json');

// The SDK's supplied schemas use some permissive/legacy schema constructs;
// strict:false accepts the schemas themselves without weakening their validation.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

for (const [name, document] of [['capabilities', capabilities], ['pbiviz', pbiviz]]) {
    test(`${name}.json validates against the installed public Power BI API schema`, () => {
        const validate = ajv.compile(api.schemas[name]);
        assert.equal(validate(document), true, JSON.stringify(validate.errors, null, 2));
    });
}

test('visual retains its identity and declares the new public host API', () => {
    assert.equal(pbiviz.visual.guid, 'FacetKey1642434105454');
    assert.equal(pbiviz.apiVersion, require('powerbi-visuals-api/package.json').version);
    assert.match(pbiviz.visual.version, /^\d+\.\d+\.\d+\.\d+$/);
    assert.ok(Array.isArray(capabilities.privileges));
    assert.ok(capabilities.objects.general.properties.filter.type.filter);
});
