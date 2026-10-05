/**
 * Facet Key local preview harness.
 *
 * Loads the actual built visual (/visual.js, /visual.css) and instantiates it against a
 * hand-written, public-API-only mock of the Power BI host, so the modernized widget can be
 * exercised for layout/styling/interaction in a plain browser - NOT a substitute for running
 * inside a real Power BI host (see the limitations note in index.html).
 *
 * Numeric VisualUpdateType / VisualDataChangeOperationKind values below are the real
 * `const enum` values from powerbi-visuals-api (erased to literals in the compiled visual.js):
 *   VisualUpdateType.Data = 2, Resize = 4, ResizeEnd = 32
 *   VisualDataChangeOperationKind.Create = 0, Append = 1
 *   FilterAction.merge = 0, FilterAction.remove = 1
 */
(function () {
  'use strict';

  var VisualUpdateType = { Data: 2, Resize: 4, ResizeEnd: 32 };
  var OperationKind = { Create: 0, Append: 1 };
  var FilterAction = { merge: 0, remove: 1 };
  var TABLE_NAME = 'Table1';

  // ---------------------------------------------------------------------
  // DOM handles
  // ---------------------------------------------------------------------
  var el = {
    status: document.getElementById('status'),
    scenario: document.getElementById('scenario'),
    initialCount: document.getElementById('initial-count'),
    increment: document.getElementById('increment'),
    selectionCount: document.getElementById('selection-count'),
    canvasWidth: document.getElementById('canvas-width'),
    canvasHeight: document.getElementById('canvas-height'),
    applySize: document.getElementById('apply-size'),
    highlight: document.getElementById('highlight'),
    clear: document.getElementById('clear'),
    saveBookmark: document.getElementById('save-bookmark'),
    restoreBookmark: document.getElementById('restore-bookmark'),
    bookmarkStatus: document.getElementById('bookmark-status'),
    resetAll: document.getElementById('reset-all'),
    canvas: document.getElementById('canvas'),
    visualHost: document.getElementById('visual-host'),
    matchedCount: document.getElementById('matched-count'),
    eventLog: document.getElementById('event-log'),
  };

  // ---------------------------------------------------------------------
  // Logging / status (textContent only, never innerHTML with untrusted data)
  // ---------------------------------------------------------------------
  function setStatus(text, kind) {
    el.status.textContent = text;
    el.status.className = 'pv-status' + (kind ? ' pv-status-' + kind : '');
  }

  function logEvent(tag, message) {
    var li = document.createElement('li');
    if (tag === 'error') { li.className = 'pv-log-error'; }
    var tagSpan = document.createElement('span');
    tagSpan.className = 'pv-log-tag';
    tagSpan.textContent = tag;
    var msgSpan = document.createElement('span');
    msgSpan.textContent = ' ' + message;
    li.appendChild(tagSpan);
    li.appendChild(msgSpan);
    el.eventLog.insertBefore(li, el.eventLog.firstChild);
    // keep log bounded
    while (el.eventLog.children.length > 300) {
      el.eventLog.removeChild(el.eventLog.lastChild);
    }
  }

  function reportError(context, err) {
    var message = (err && (err.stack || err.message)) || String(err);
    console.error('[facetKeyPreview] ' + context, err);
    logEvent('error', context + ': ' + message);
    setStatus('Error: ' + context, 'error');
    if (previewApi) { previewApi.ready = false; }
  }

  window.addEventListener('error', function (e) {
    reportError('window.onerror', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', function (e) {
    reportError('unhandledrejection', e.reason);
  });

  // ---------------------------------------------------------------------
  // Deep clone that preserves Date instances (JSON.stringify would turn
  // Dates into strings, breaking rangeValue columns of type dateTime).
  // ---------------------------------------------------------------------
  function cloneDeep(value) {
    if (value instanceof Date) { return new Date(value.getTime()); }
    if (Array.isArray(value)) { return value.map(cloneDeep); }
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = cloneDeep(value[k]); });
      return out;
    }
    return value;
  }

  // ---------------------------------------------------------------------
  // Deterministic sample data generation
  // ---------------------------------------------------------------------
  var FACETS = {
    project: ['Atlas Mapping', 'Beacon Analytics', 'Cascade Ledger', 'Delta Forecast', 'Ember Insights', 'Flux Dashboard', 'Granite Vault', 'Horizon Sync', 'Ion Tracker', 'Juniper Compliance'],
    organization: ['Wand Industries', 'Nimbus Corp', 'Solstice Labs', 'Ferrous Group', 'Quillwork LLC', 'Harbor Dynamics', 'Pinecrest Co', 'Vantage Point', 'Meridian Partners'],
    location: ['California', 'Ontario', 'Bavaria', 'Queensland', 'Gauteng', 'Kerala', 'Tokyo', 'Lima'],
    topic: ['Supply Chain', 'Market Risk', 'Data Governance', 'Customer Churn', 'Energy Usage', 'Fraud Detection', 'Talent Retention'],
  };
  var GROUP_OFFSETS = { project: 0, organization: 2, location: 5, topic: 8 };
  var BASE_COUNTS = [46, 39, 33, 28, 24, 20, 17, 14, 11, 9, 7, 5];

  function buildBaseRows() {
    var rows = [];
    Object.keys(FACETS).forEach(function (group) {
      FACETS[group].forEach(function (instance, i) {
        rows.push({
          facetGroup: group,
          instance: instance,
          count: BASE_COUNTS[i] + GROUP_OFFSETS[group],
        });
      });
    });
    return rows;
  }

  var SEGMENT_BUCKETS = [
    { label: 'Open', weight: 0.5 },
    { label: 'In Progress', weight: 0.3 },
    { label: 'Closed', weight: 0.2 },
  ];
  var SPARKLINE_BUCKETS = [
    { label: 'Month 1', weight: 0.10 },
    { label: 'Month 2', weight: 0.25 },
    { label: 'Month 3', weight: 0.30 },
    { label: 'Month 4', weight: 0.20 },
    { label: 'Month 5', weight: 0.10 },
    { label: 'Month 6', weight: 0.05 },
  ];

  function splitByWeights(total, buckets) {
    var parts = [];
    var used = 0;
    for (var i = 0; i < buckets.length; i++) {
      if (i === buckets.length - 1) {
        parts.push(Math.max(total - used, 0));
      } else {
        var portion = Math.round(total * buckets[i].weight);
        parts.push(portion);
        used += portion;
      }
    }
    return parts;
  }

  // Scenario definitions: columns (in row order) + a row builder that expands the
  // deterministic base rows into the scenario-specific shape.
  var SCENARIOS = {
    basic: {
      label: 'Basic facets',
      columns: [
        { displayName: 'facet', roles: { facet: true }, type: { text: true }, queryName: TABLE_NAME + '.Facet' },
        { displayName: 'facet_instance', roles: { facetInstance: true }, type: { text: true }, queryName: TABLE_NAME + '.FacetInstance' },
        { displayName: 'count', roles: { count: true }, type: { numeric: true, integer: true }, queryName: TABLE_NAME + '.Count' },
      ],
      buildRows: function () {
        return buildBaseRows().map(function (r) {
          return { values: [r.facetGroup, r.instance, r.count], count: r.count };
        });
      },
    },
    ranges: {
      label: 'Numeric + date ranges',
      columns: [
        { displayName: 'facet', roles: { facet: true }, type: { text: true }, queryName: TABLE_NAME + '.Facet' },
        { displayName: 'facet_instance', roles: { facetInstance: true }, type: { text: true }, queryName: TABLE_NAME + '.FacetInstance' },
        { displayName: 'count', roles: { count: true }, type: { numeric: true, integer: true }, queryName: TABLE_NAME + '.Count' },
        { displayName: 'amount', roles: { rangeValue: true }, type: { numeric: true }, format: '#,0', queryName: TABLE_NAME + '.Amount' },
        { displayName: 'event date', roles: { rangeValue: true }, type: { dateTime: true }, format: 'MMM d, yyyy', queryName: TABLE_NAME + '.EventDate' },
      ],
      buildRows: function () {
        return buildBaseRows().map(function (r, i) {
          var amount = r.count * 1000 + i * 37;
          var eventDate = new Date(2023, 0, 1 + i * 13);
          return { values: [r.facetGroup, r.instance, r.count, amount, eventDate], count: r.count };
        });
      },
    },
    segments: {
      label: 'Segments',
      columns: [
        { displayName: 'facet', roles: { facet: true }, type: { text: true }, queryName: TABLE_NAME + '.Facet' },
        { displayName: 'facet_instance', roles: { facetInstance: true }, type: { text: true }, queryName: TABLE_NAME + '.FacetInstance' },
        { displayName: 'count', roles: { count: true }, type: { numeric: true, integer: true }, queryName: TABLE_NAME + '.Count' },
        { displayName: 'status', roles: { bucket: true }, type: { text: true }, queryName: TABLE_NAME + '.Status' },
      ],
      buildRows: function () {
        var out = [];
        buildBaseRows().forEach(function (r) {
          var parts = splitByWeights(r.count, SEGMENT_BUCKETS);
          SEGMENT_BUCKETS.forEach(function (bucket, idx) {
            if (parts[idx] <= 0) { return; }
            out.push({ values: [r.facetGroup, r.instance, parts[idx], bucket.label], count: parts[idx] });
          });
        });
        return out;
      },
    },
    sparklines: {
      label: 'Sparklines',
      columns: [
        { displayName: 'facet', roles: { facet: true }, type: { text: true }, queryName: TABLE_NAME + '.Facet' },
        { displayName: 'facet_instance', roles: { facetInstance: true }, type: { text: true }, queryName: TABLE_NAME + '.FacetInstance' },
        { displayName: 'count', roles: { count: true }, type: { numeric: true, integer: true }, queryName: TABLE_NAME + '.Count' },
        { displayName: 'month', roles: { sparklineData: true }, type: { text: true }, queryName: TABLE_NAME + '.Month' },
      ],
      buildRows: function () {
        var out = [];
        buildBaseRows().forEach(function (r) {
          var parts = splitByWeights(r.count, SPARKLINE_BUCKETS);
          SPARKLINE_BUCKETS.forEach(function (bucket, idx) {
            if (parts[idx] <= 0) { return; }
            out.push({ values: [r.facetGroup, r.instance, parts[idx], bucket.label], count: parts[idx] });
          });
        });
        return out;
      },
    },
  };

  function buildDataView(scenarioId) {
    var scenario = SCENARIOS[scenarioId];
    var rows = scenario.buildRows();
    var columns = scenario.columns;
    var identity = rows.map(function (_, i) { return { key: scenarioId + ':' + i }; });
    var tableRows = rows.map(function (r) { return r.values; });
    var counts = rows.map(function (r) { return r.count; });

    var dataView = {
      metadata: {
        columns: cloneDeep(columns),
        objects: undefined, // set per-update from host state
      },
      categorical: {
        categories: [{}],
        values: [{ values: counts, highlights: undefined }],
      },
      table: {
        rows: tableRows,
        identity: identity,
        columns: cloneDeep(columns),
      },
    };
    return dataView;
  }

  // ---------------------------------------------------------------------
  // Mock Power BI host (public-surface only, mirrors src/FacetsVisual.spec.ts's pattern)
  // ---------------------------------------------------------------------
  var REAL_COLORS = ['#01b8aa', '#374649', '#fd625e', '#f2c80f', '#5f6b6d', '#8ad4eb', '#fe9666', '#a66999', '#3599b8', '#dfbfbf', '#4a4a4a', '#d64550'];

  function createMockHost() {
    var state = {
      selectionIds: [],       // currently "selected" ISelectionId-likes
      jsonFilters: [],        // last applied/merged AdvancedFilter-like objects
      objects: {              // persisted settings objects (metadata.objects)
        facetCount: { initial: 4, increment: 50 },
        display: { selectionCount: false },
        facetState: { rangeFacet: '{}', normalFacet: '{}' },
      },
      onSelectCallback: null,
      colorCache: {},
      colorIndex: 0,
    };

    function makeSelectionId(key) {
      return {
        getKey: function () { return key; },
        equals: function (other) { return !!(other && other.getKey && other.getKey() === key); },
        getSelector: function () { return {}; },
        getSelectorsByColumn: function () { return {}; },
        hasIdentity: function () { return true; },
      };
    }

    var host = {
      colorPalette: {
        getColor: function (key) {
          if (!state.colorCache[key]) {
            state.colorCache[key] = { value: REAL_COLORS[state.colorIndex % REAL_COLORS.length] };
            state.colorIndex++;
          }
          return state.colorCache[key];
        },
      },
      createSelectionManager: function () {
        return {
          select: function (ids, multiSelect) {
            var arr = Array.isArray(ids) ? ids : [ids];
            state.selectionIds = arr.slice();
            logEvent('selection', 'select(' + arr.length + ' id(s), multiSelect=' + !!multiSelect + ')');
            renderMatchedCount();
            return Promise.resolve(state.selectionIds.slice());
          },
          clear: function () {
            state.selectionIds = [];
            logEvent('selection', 'clear()');
            renderMatchedCount();
            return Promise.resolve([]);
          },
          hasSelection: function () { return state.selectionIds.length > 0; },
          getSelectionIds: function () { return state.selectionIds.slice(); },
          registerOnSelectCallback: function (cb) { state.onSelectCallback = cb; },
        };
      },
      createSelectionIdBuilder: function () {
        var tableRef = null;
        var rowIndex = null;
        var builder = {
          withTable: function (table, index) { tableRef = table; rowIndex = index; return builder; },
          createSelectionId: function () {
            var identity = tableRef && tableRef.identity && tableRef.identity[rowIndex];
            var key = (identity && identity.key) ? String(identity.key) : ('row:' + rowIndex);
            return makeSelectionId(key);
          },
        };
        return builder;
      },
      persistProperties: function (objectsToPersist) {
        mergePersistedObjects(objectsToPersist);
        logEvent('persist', 'persistProperties(' + describeInstances(objectsToPersist) + ')');
        scheduleConsumeSuppressedUpdate();
      },
      applyJsonFilter: function (filters, objectName, propertyName, action) {
        var before = JSON.stringify(state.jsonFilters);
        state.jsonFilters = (action === FilterAction.remove || !filters) ? [] : JSON.parse(JSON.stringify(Array.isArray(filters) ? filters : [filters]));
        var after = JSON.stringify(state.jsonFilters);
        logEvent('filter', 'applyJsonFilter(' + objectName + '.' + propertyName + ', ' + (action === FilterAction.remove ? 'remove' : 'merge') + ') -> ' + state.jsonFilters.length + ' filter(s)');
        renderMatchedCount();
        if (before !== after) { scheduleFilterChangeUpdate(); }
      },
      fetchMoreData: function () { return false; },
      locale: 'en-US',
      hostCapabilities: { allowInteractions: true, allowModifyFilter: true },
    };

    function mergePersistedObjects(objectsToPersist) {
      if (!objectsToPersist) { return; }
      (objectsToPersist.merge || []).forEach(function (instance) {
        var name = instance.objectName;
        state.objects[name] = Object.assign({}, state.objects[name], cloneDeep(instance.properties));
      });
      (objectsToPersist.remove || []).forEach(function (instance) {
        var name = instance.objectName;
        if (!state.objects[name]) { return; }
        Object.keys(instance.properties || {}).forEach(function (prop) {
          delete state.objects[name][prop];
        });
      });
    }

    function describeInstances(objectsToPersist) {
      var names = (objectsToPersist && objectsToPersist.merge || []).map(function (i) { return i.objectName; });
      return names.length ? names.join(', ') : 'no-op';
    }

    return { host: host, state: state, makeSelectionId: makeSelectionId };
  }

  // ---------------------------------------------------------------------
  // Preview controller: wires scenario data + mock host to the real visual instance
  // ---------------------------------------------------------------------
  var mock = createMockHost();
  var plugin = null;
  var visual = null;
  var currentScenarioId = 'basic';
  var currentDataView = null;
  var lastUpdateOptions = null;
  var resizeDebounce = null;
  var resizeEndTimer = null;
  var metadata = null;
  var externalHighlight = false;

  function currentSettingsObjects() {
    return cloneDeep(mock.state.objects);
  }

  function buildUpdateOptions(overrides) {
    var base = {
      dataViews: currentDataView ? [currentDataView] : [],
      type: VisualUpdateType.Data,
      operationKind: OperationKind.Append,
      viewport: { width: el.canvas.clientWidth, height: el.canvas.clientHeight },
      jsonFilters: cloneDeep(mock.state.jsonFilters),
    };
    return Object.assign(base, overrides || {});
  }

  function performUpdate(options) {
    if (!visual) { return; }
    lastUpdateOptions = options;
    try {
      visual.update(options);
    } catch (err) {
      reportError('visual.update', err);
      return false;
    }
    renderMatchedCount();
    return true;
  }

  function scheduleConsumeSuppressedUpdate() {
    // One update() call is enough for the visual to consume its internal
    // suppressNextUpdate flag set right before persistProperties() was called.
    setTimeout(function () {
      performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Append }));
    }, 0);
  }

  function scheduleFilterChangeUpdate() {
    setTimeout(function () {
      performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }));
    }, 0);
  }

  function rebuildDataViewForCurrentScenario() {
    currentDataView = buildDataView(currentScenarioId);
    currentDataView.metadata.objects = currentSettingsObjects();
    if (externalHighlight) {
      currentDataView.categorical.values[0].highlights = currentDataView.categorical.values[0].values.map(function (count, index) {
        return index % 3 === 0 ? Math.max(1, Math.round(count * 0.6)) : 0;
      });
    }
  }

  function destroyVisual() {
    if (visual) {
      try { visual.destroy(); } catch (err) { reportError('visual.destroy', err); }
    }
    visual = null;
    el.visualHost.textContent = '';
  }

  function createVisualInstance() {
    var container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    el.visualHost.appendChild(container);
    visual = plugin.create({ element: container, host: mock.host });
  }

  function setScenario(scenarioId, isReset) {
    previewApi.ready = false;
    externalHighlight = false;
    currentScenarioId = scenarioId;
    el.scenario.value = scenarioId;
    mock.state.selectionIds = [];
    mock.state.jsonFilters = [];
    if (isReset) {
      mock.state.objects = {
        facetCount: { initial: Number(el.initialCount.value) || 4, increment: Number(el.increment.value) || 50 },
        display: { selectionCount: !!el.selectionCount.checked },
        facetState: { rangeFacet: '{}', normalFacet: '{}' },
      };
    }
    destroyVisual();
    createVisualInstance();
    rebuildDataViewForCurrentScenario();
    if (!performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }))) {
      throw new Error('Scenario failed to render.');
    }
    previewApi.ready = true;
    setStatus('ready: ' + SCENARIOS[scenarioId].label, 'ok');
    logEvent('scenario', 'loaded "' + SCENARIOS[scenarioId].label + '" (' + currentDataView.table.rows.length + ' rows)');
  }

  function applySettingsChange() {
    mock.state.objects.facetCount = {
      initial: Number(el.initialCount.value) || 0,
      increment: Number(el.increment.value) || 0,
    };
    mock.state.objects.display = { selectionCount: !!el.selectionCount.checked };
    rebuildDataViewForCurrentScenario();
    performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }));
    logEvent('settings', 'facetCount.initial=' + mock.state.objects.facetCount.initial +
      ', increment=' + mock.state.objects.facetCount.increment +
      ', selectionCount=' + mock.state.objects.display.selectionCount);
  }

  function simulateExternalHighlight() {
    if (!currentDataView) { return; }
    externalHighlight = !externalHighlight;
    rebuildDataViewForCurrentScenario();
    performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }));
    logEvent('highlight', externalHighlight ? 'categorical measure highlights enabled' : 'categorical measure highlights cleared');
  }

  function clearSelectionAndFilters() {
    mock.state.selectionIds = [];
    mock.state.jsonFilters = [];
    externalHighlight = false;
    rebuildDataViewForCurrentScenario();
    logEvent('selection', 'clear selection + filters (external)');
    if (typeof mock.state.onSelectCallback === 'function') {
      try {
        mock.state.onSelectCallback([]);
      } catch (err) {
        reportError('registerOnSelectCallback (clear)', err);
      }
    }
    performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }));
    renderMatchedCount();
  }

  var bookmark = null;

  function saveBookmark() {
    bookmark = {
      scenario: currentScenarioId,
      selectionKeys: mock.state.selectionIds.map(function (id) { return id.getKey(); }),
      jsonFilters: cloneDeep(mock.state.jsonFilters),
      properties: cloneDeep(mock.state.objects),
    };
    el.bookmarkStatus.textContent = 'Bookmark saved (' + bookmark.selectionKeys.length + ' selected row id(s), scenario "' + bookmark.scenario + '").';
    logEvent('persist', 'bookmark saved for scenario "' + bookmark.scenario + '"');
  }

  function restoreBookmark() {
    if (!bookmark) {
      logEvent('persist', 'restore bookmark: nothing saved yet');
      return;
    }
    if (bookmark.scenario !== currentScenarioId) {
      setScenario(bookmark.scenario, false);
    }
    mock.state.selectionIds = bookmark.selectionKeys.map(function (key) { return mock.makeSelectionId(key); });
    mock.state.jsonFilters = cloneDeep(bookmark.jsonFilters);
    mock.state.objects = cloneDeep(bookmark.properties);
    el.initialCount.value = mock.state.objects.facetCount.initial;
    el.increment.value = mock.state.objects.facetCount.increment;
    el.selectionCount.checked = mock.state.objects.display.selectionCount;
    rebuildDataViewForCurrentScenario();
    // A fresh (Create) update re-runs the data pipeline and, inside updateFacets(),
    // replays selection via selectionManager.getSelectionIds() and range filters via
    // the jsonFilters carried on this same update call.
    performUpdate(buildUpdateOptions({ type: VisualUpdateType.Data, operationKind: OperationKind.Create }));
    logEvent('persist', 'bookmark restored (' + bookmark.selectionKeys.length + ' selected row id(s))');
  }

  function resetPreview() {
    bookmark = null;
    el.bookmarkStatus.textContent = 'No bookmark saved.';
    el.initialCount.value = 4;
    el.increment.value = 50;
    el.selectionCount.checked = false;
    el.canvasWidth.value = 750;
    el.canvasHeight.value = 650;
    el.canvas.style.width = '750px';
    el.canvas.style.height = '650px';
    el.eventLog.textContent = '';
    setScenario('basic', true);
    logEvent('reset', 'preview reset to defaults');
  }

  // ---------------------------------------------------------------------
  // Mock cross-filter panel: computed from the current selection + jsonFilters
  // against the full row set. Per spec, the visual's OWN dataset is never
  // filtered for ranges - this is a separate simulated readout only.
  // ---------------------------------------------------------------------
  function rowPassesFilters(row, columns, selectedKeySet, identityKey) {
    if (selectedKeySet && selectedKeySet.size > 0 && !selectedKeySet.has(identityKey)) {
      return false;
    }
    for (var f = 0; f < mock.state.jsonFilters.length; f++) {
      var filter = mock.state.jsonFilters[f];
      if (!filter || !filter.target) { continue; }
      var queryName = filter.target.table + '.' + filter.target.column;
      var colIndex = -1;
      for (var c = 0; c < columns.length; c++) {
        if (columns[c].queryName === queryName) { colIndex = c; break; }
      }
      if (colIndex === -1) { continue; }
      var rawValue = row[colIndex];
      var isDate = rawValue instanceof Date;
      var comparable = isDate ? rawValue.getTime() : rawValue;
      var conditions = filter.conditions || [];
      for (var cnd = 0; cnd < conditions.length; cnd++) {
        var cond = conditions[cnd];
        var condValue = isDate ? new Date(cond.value).getTime() : cond.value;
        if (cond.operator === 'GreaterThanOrEqual' && !(comparable >= condValue)) { return false; }
        if (cond.operator === 'LessThanOrEqual' && !(comparable <= condValue)) { return false; }
      }
    }
    return true;
  }

  function computeMatchedRowCount() {
    if (!currentDataView) { return 0; }
    var rows = currentDataView.table.rows;
    var identity = currentDataView.table.identity;
    var columns = currentDataView.metadata.columns;
    var selectedKeySet = null;
    if (mock.state.selectionIds.length > 0) {
      selectedKeySet = new Set(mock.state.selectionIds.map(function (id) { return id.getKey(); }));
    }
    var matched = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rowPassesFilters(rows[i], columns, selectedKeySet, identity[i].key)) { matched++; }
    }
    return matched;
  }

  function renderMatchedCount() {
    el.matchedCount.textContent = String(computeMatchedRowCount());
  }

  // ---------------------------------------------------------------------
  // Resize handling: CSS `resize: both` drag + the width/height inputs both
  // route through a ResizeObserver, matching how Power BI issues resize-only
  // update() calls (no data re-conversion) while dragging, followed by a
  // trailing ResizeEnd once the size has settled.
  // ---------------------------------------------------------------------
  var ro = new ResizeObserver(function () {
    if (!visual) { return; }
    if (resizeDebounce) { clearTimeout(resizeDebounce); }
    resizeDebounce = setTimeout(function () {
      performUpdate(buildUpdateOptions({ type: VisualUpdateType.Resize }));
    }, 60);
    if (resizeEndTimer) { clearTimeout(resizeEndTimer); }
    resizeEndTimer = setTimeout(function () {
      performUpdate(buildUpdateOptions({ type: VisualUpdateType.ResizeEnd }));
      logEvent('resize', 'settled at ' + el.canvas.clientWidth + 'x' + el.canvas.clientHeight);
    }, 400);
  });
  ro.observe(el.canvas);

  // ---------------------------------------------------------------------
  // Control wiring (no inline handlers)
  // ---------------------------------------------------------------------
  el.scenario.addEventListener('change', function () { setScenario(el.scenario.value, false); });
  el.initialCount.addEventListener('change', applySettingsChange);
  el.increment.addEventListener('change', applySettingsChange);
  el.selectionCount.addEventListener('change', applySettingsChange);
  el.applySize.addEventListener('click', function () {
    var w = Math.max(200, Number(el.canvasWidth.value) || 750);
    var h = Math.max(200, Number(el.canvasHeight.value) || 650);
    el.canvas.style.width = w + 'px';
    el.canvas.style.height = h + 'px';
    logEvent('resize', 'applied size ' + w + 'x' + h + ' from inputs');
  });
  el.highlight.addEventListener('click', simulateExternalHighlight);
  el.clear.addEventListener('click', clearSelectionAndFilters);
  el.saveBookmark.addEventListener('click', saveBookmark);
  el.restoreBookmark.addEventListener('click', restoreBookmark);
  el.resetAll.addEventListener('click', resetPreview);

  // ---------------------------------------------------------------------
  // Boot: fetch metadata, load /visual.css + /visual.js, then instantiate.
  // ---------------------------------------------------------------------
  function loadStylesheet(href) {
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = function () { resolve(); };
      link.onerror = function () { reject(new Error('failed to load ' + href)); };
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.body.appendChild(script);
    });
  }

  var previewApi = {
    ready: false,
    get scenario() { return currentScenarioId; },
    get visual() { return visual; },
    get host() { return mock.host; },
    snapshot: function () {
      return {
        scenario: currentScenarioId,
        highlightActive: externalHighlight,
        selectionCount: mock.state.selectionIds.length,
        selectionKeys: mock.state.selectionIds.map(function (id) { return id.getKey(); }),
        jsonFilters: cloneDeep(mock.state.jsonFilters),
        objects: cloneDeep(mock.state.objects),
        matchedRowCount: computeMatchedRowCount(),
        rowCount: currentDataView ? currentDataView.table.rows.length : 0,
        canvasSize: { width: el.canvas.clientWidth, height: el.canvas.clientHeight },
      };
    },
    update: function (overrides) { performUpdate(buildUpdateOptions(overrides)); },
    reset: function () { resetPreview(); },
  };
  Object.defineProperty(window, 'facetKeyPreview', { value: previewApi, writable: false, configurable: false });

  setStatus('loading metadata…');

  fetch('/metadata.json')
    .then(function (res) {
      if (!res.ok) { throw new Error('GET /metadata.json -> ' + res.status); }
      return res.json();
    })
    .then(function (json) {
      metadata = json;
      if (!metadata || !metadata.visual || !metadata.visual.guid) {
        throw new Error('metadata.json missing visual.guid');
      }
      // The native pbiviz-generated plugin only self-registers into
      // `powerbi.visuals.plugins[guid]` when `typeof powerbi !== 'undefined'`
      // at the moment /visual.js runs (see powerbi-visuals-webpack-plugin's
      // plugin-template.js). The namespace must exist BEFORE the script loads.
      window.powerbi = { visuals: { plugins: {} } };
      setStatus('loading visual assets…');
      return Promise.all([loadStylesheet('/visual.css'), loadScript('/visual.js')]);
    })
    .then(function () {
      var guid = metadata.visual.guid;
      var plugins = window.powerbi && window.powerbi.visuals && window.powerbi.visuals.plugins;
      if (!plugins || !plugins[guid]) {
        throw new Error('globalThis.powerbi.visuals.plugins["' + guid + '"] was not registered by /visual.js');
      }
      plugin = plugins[guid];
      setScenario('basic', true);
      previewApi.ready = true;
      setStatus('ready: ' + (metadata.visual.displayName || metadata.visual.name || guid), 'ok');
      logEvent('boot', 'visual instantiated (guid ' + guid + ')');
    })
    .catch(function (err) {
      reportError('boot', err);
    });
})();
