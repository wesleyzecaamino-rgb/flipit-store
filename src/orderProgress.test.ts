import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCarrierTrackingHref,
  buildCarrierTrackingModel,
  buildOrderHistoryCsv,
  buildOrderHistoryFilename,
  detectOrderStatusChanges,
  escapeCsvCell,
  filterOrders,
  formatOrderDate,
  getOrderProgress,
  normalizeOrderStage,
  parseCarrierTrackingParams,
} from './orderProgress';

test('normalizeOrderStage maps canonical, legacy, and mixed-case Firestore statuses', () => {
  assert.equal(normalizeOrderStage('processing'), 'processing');
  assert.equal(normalizeOrderStage('confirmed'), 'processing');
  assert.equal(normalizeOrderStage('preparing'), 'processing');
  assert.equal(normalizeOrderStage('  Shipped '), 'shipped');
  assert.equal(normalizeOrderStage('in-transit'), 'shipped');
  assert.equal(normalizeOrderStage('DELIVERED'), 'delivered');
  assert.equal(normalizeOrderStage('completed'), 'delivered');
  assert.equal(normalizeOrderStage(undefined), 'processing');
  assert.equal(normalizeOrderStage('unknown_status'), 'processing');
});

test('getOrderProgress computes exact progress percentages and step states for Processing, Shipped, Delivered', () => {
  const processing = getOrderProgress('processing');
  assert.equal(processing.stage, 'processing');
  assert.equal(processing.stageLabel, 'Processing');
  assert.equal(processing.stepNumber, 1);
  assert.equal(processing.totalSteps, 3);
  assert.equal(processing.percent, 33);
  assert.equal(processing.connectorPercent, 0);
  assert.deepEqual(
    processing.steps.map((s) => [s.label, s.state]),
    [
      ['Processing', 'current'],
      ['Shipped', 'upcoming'],
      ['Delivered', 'upcoming'],
    ]
  );

  const shipped = getOrderProgress('shipped');
  assert.equal(shipped.stage, 'shipped');
  assert.equal(shipped.stageLabel, 'Shipped');
  assert.equal(shipped.stepNumber, 2);
  assert.equal(shipped.percent, 67);
  assert.equal(shipped.connectorPercent, 50);
  assert.deepEqual(
    shipped.steps.map((s) => [s.label, s.state]),
    [
      ['Processing', 'completed'],
      ['Shipped', 'current'],
      ['Delivered', 'upcoming'],
    ]
  );

  const delivered = getOrderProgress('delivered');
  assert.equal(delivered.stage, 'delivered');
  assert.equal(delivered.stageLabel, 'Delivered');
  assert.equal(delivered.stepNumber, 3);
  assert.equal(delivered.percent, 100);
  assert.equal(delivered.connectorPercent, 100);
  assert.deepEqual(
    delivered.steps.map((s) => [s.label, s.state]),
    [
      ['Processing', 'completed'],
      ['Shipped', 'completed'],
      ['Delivered', 'completed'],
    ]
  );
});

test('formatOrderDate handles valid timestamps and invalid fallbacks', () => {
  assert.equal(formatOrderDate(0), 'Recent order');
  assert.equal(formatOrderDate(Number.NaN), 'Recent order');
  const formatted = formatOrderDate(Date.UTC(2026, 10, 21, 12, 0, 0));
  assert.match(formatted, /Nov/);
  assert.match(formatted, /2026/);
});

test('filterOrders filters by order ID, formatted/ISO date, and date range', () => {
  const nowMs = Date.UTC(2026, 10, 21, 12, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const sample = [
    { orderId: 'ord_1795256985467_crvuwa', createdAtMs: nowMs - 2 * dayMs },
    { orderId: 'ord_1793000000000_orchid9', createdAtMs: nowMs - 20 * dayMs },
    { orderId: 'ord_1785000000000_winter1', createdAtMs: nowMs - 65 * dayMs },
    { orderId: 'ord_1770000000000_archive', createdAtMs: nowMs - 140 * dayMs },
  ];

  assert.equal(filterOrders(sample, { query: '', dateRange: 'all', nowMs }).length, 4);
  assert.equal(filterOrders(sample, { query: 'CRVUWA', dateRange: 'all', nowMs }).length, 1);
  assert.equal(filterOrders(sample, { query: 'orchid9', dateRange: 'all', nowMs }).length, 1);

  // Date string matches (human-readable month/year & ISO)
  assert.equal(filterOrders(sample, { query: 'Nov', dateRange: 'all', nowMs }).length, 2);
  assert.equal(filterOrders(sample, { query: '2026-11-19', dateRange: 'all', nowMs }).length, 1);

  // Date range dropdown filters
  assert.equal(filterOrders(sample, { query: '', dateRange: '7d', nowMs }).length, 1);
  assert.equal(filterOrders(sample, { query: '', dateRange: '30d', nowMs }).length, 2);
  assert.equal(filterOrders(sample, { query: '', dateRange: '90d', nowMs }).length, 3);

  // Combined search + date range
  assert.equal(filterOrders(sample, { query: 'winter1', dateRange: '30d', nowMs }).length, 0);
  assert.equal(filterOrders(sample, { query: 'winter1', dateRange: '90d', nowMs }).length, 1);
});

test('detectOrderStatusChanges ignores initial load and detects subsequent stage transitions', () => {
  const initial = detectOrderStatusChanges(
    null,
    [
      {
        orderId: 'ord_1',
        status: 'processing',
        items: [{ title: 'Orchid Sculpt Funnel Pullover', quantity: 1 }],
      },
    ],
    1000
  );
  assert.equal(initial.alerts.length, 0);
  assert.equal(initial.nextStatuses.get('ord_1'), 'processing');

  // Unchanged snapshot emits no alerts
  const unchanged = detectOrderStatusChanges(
    initial.nextStatuses,
    [{ orderId: 'ord_1', status: 'confirmed' }],
    2000
  );
  assert.equal(unchanged.alerts.length, 0);

  // Transition processing -> shipped emits shipped email notification
  const shipped = detectOrderStatusChanges(
    unchanged.nextStatuses,
    [
      {
        orderId: 'ord_1',
        status: 'shipped',
        items: [
          { title: 'Orchid Sculpt Funnel Pullover', quantity: 1 },
          { title: 'Plum Gloves', quantity: 1 },
        ],
      },
    ],
    3000
  );
  assert.equal(shipped.alerts.length, 1);
  assert.equal(shipped.alerts[0].fromLabel, 'Processing');
  assert.equal(shipped.alerts[0].toLabel, 'Shipped');
  assert.match(shipped.alerts[0].subject, /shipped/i);
  assert.equal(shipped.alerts[0].itemsSummary, '1× Orchid Sculpt Funnel Pullover + 1 more');

  // Transition shipped -> delivered emits delivered alert
  const delivered = detectOrderStatusChanges(
    shipped.nextStatuses,
    [{ orderId: 'ord_1', status: 'delivered' }],
    4000
  );
  assert.equal(delivered.alerts.length, 1);
  assert.equal(delivered.alerts[0].toLabel, 'Delivered');
  assert.match(delivered.alerts[0].subject, /delivered/i);

  // Multiple orders: only the order whose status changed emits an alert
  const multiPrev = new Map<string, 'processing' | 'shipped' | 'delivered'>([
    ['ord_active', 'processing'],
    ['ord_done', 'delivered'],
  ]);
  const multiNext = detectOrderStatusChanges(
    multiPrev,
    [
      { orderId: 'ord_active', status: 'shipped' },
      { orderId: 'ord_done', status: 'delivered' },
    ],
    5000
  );
  assert.equal(multiNext.alerts.length, 1);
  assert.equal(multiNext.alerts[0].orderId, 'ord_active');
});

test('carrier tracking URL builder, parser, and deterministic timeline model work together', () => {
  assert.equal(parseCarrierTrackingParams(''), null);
  const href = buildCarrierTrackingHref({
    orderId: 'ord_1795256985467_crvuwa',
    status: 'shipped',
    createdAtMs: Date.UTC(2026, 10, 21, 12, 0, 0),
    shippingAddress: '67n lawn street, Johannesburg',
    itemsCount: 2,
  });

  const parsed = parseCarrierTrackingParams(href);
  assert.ok(parsed);
  assert.equal(parsed.orderId, 'ord_1795256985467_crvuwa');
  assert.equal(parsed.stage, 'shipped');
  assert.equal(parsed.shippingAddress, '67n lawn street, Johannesburg');
  assert.equal(parsed.itemsCount, 2);

  const model = buildCarrierTrackingModel(parsed);
  assert.match(model.trackingNumber, /^OPE-[A-Z0-9]{5}-\d{4}$/);
  assert.match(model.headline, /In Transit/i);
  assert.equal(model.checkpoints.length, 4);
  assert.equal(model.checkpoints[0].state, 'upcoming'); // delivered not yet reached
  assert.equal(model.checkpoints[1].state, 'current'); // departed linehaul active

  const deliveredModel = buildCarrierTrackingModel({ ...parsed, stage: 'delivered' });
  assert.match(deliveredModel.headline, /Delivered/i);
  assert.ok(deliveredModel.checkpoints.every((c) => c.state === 'completed'));
});

test('buildOrderHistoryCsv serializes orders safely with RFC 4180 escaping and formula sanitization', () => {
  assert.equal(escapeCsvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(escapeCsvCell('67n lawn street, Johannesburg'), '"67n lawn street, Johannesburg"');
  assert.equal(escapeCsvCell('Say "Hi"'), '"Say ""Hi"""');

  const filename = buildOrderHistoryFilename(Date.UTC(2026, 10, 21, 12, 0, 0));
  assert.equal(filename, 'flipt-order-history-2026-11-21.csv');

  const csv = buildOrderHistoryCsv([
    {
      orderId: 'ord_1795256985467_crvuwa',
      createdAtMs: Date.UTC(2026, 10, 21, 12, 0, 0),
      status: 'shipped',
      itemsCount: 2,
      shippingAddress: '67n lawn street, "Unit 4", Johannesburg',
      totalCents: 21200,
      items: [
        { title: 'Orchid Sculpt Funnel Pullover', size: 'S', quantity: 1 },
        { title: 'Plum Fleece & Fingerless Gloves', size: 'OS', quantity: 1 },
      ],
    },
    {
      orderId: 'ord_1794000000000_second',
      createdAtMs: Date.UTC(2026, 10, 19, 8, 0, 0),
      status: 'delivered',
      itemsCount: 1,
      shippingAddress: '=HYPERLINK("http://evil")',
      totalCents: 16800,
      items: [{ title: 'Orchid Ribbed Funnel Full-Zip', size: 'M', quantity: 1 }],
    },
  ]);

  const lines = csv.split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(
    lines[0],
    'Order ID,Placed Date,Status,Items Count,Items,Shipping Address,Total'
  );
  assert.match(
    lines[1],
    /^ord_1795256985467_crvuwa,2026-11-21,Shipped,2,1x Orchid Sculpt Funnel Pullover \(S\); 1x Plum Fleece & Fingerless Gloves \(OS\),"67n lawn street, ""Unit 4"", Johannesburg",\$212\.00$/
  );
  assert.match(
    lines[2],
    /^ord_1794000000000_second,2026-11-19,Delivered,1,1x Orchid Ribbed Funnel Full-Zip \(M\),"'\=HYPERLINK\(""http:\/\/evil""\)",\$168\.00$/
  );
});
