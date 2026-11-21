export type OrderStage = 'processing' | 'shipped' | 'delivered';
export type RawOrderStatus =
  | OrderStage
  | 'confirmed'
  | 'preparing';

export type OrderStepState = 'completed' | 'current' | 'upcoming';

export interface OrderStageStep {
  key: OrderStage;
  label: string;
  state: OrderStepState;
}

export interface OrderProgressModel {
  stage: OrderStage;
  stageLabel: string;
  stepNumber: number;
  totalSteps: number;
  percent: number;
  connectorPercent: number;
  steps: OrderStageStep[];
}

export const ORDER_STAGE_DEFINITIONS: readonly { key: OrderStage; label: string }[] = [
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

/**
 * Normalizes any Firestore order status string (including legacy 'confirmed'/'preparing'
 * or mixed-case values entered via console) into one of the three canonical fulfillment stages.
 */
export function normalizeOrderStage(status: unknown): OrderStage {
  if (typeof status !== 'string') return 'processing';
  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'delivered' || normalized === 'completed') {
    return 'delivered';
  }
  if (normalized === 'shipped' || normalized === 'in_transit' || normalized === 'dispatched') {
    return 'shipped';
  }
  return 'processing';
}

/**
 * Computes progress bar metrics and per-step states for an individual Firestore order.
 */
export function getOrderProgress(status: unknown): OrderProgressModel {
  const stage = normalizeOrderStage(status);
  const activeIndex = ORDER_STAGE_DEFINITIONS.findIndex((s) => s.key === stage);
  const totalSteps = ORDER_STAGE_DEFINITIONS.length;
  const stepNumber = activeIndex + 1;

  // Bar fill: 33% (Processing), 67% (Shipped), 100% (Delivered)
  const percent = Math.round((stepNumber / totalSteps) * 100);
  // Node-to-node connector track: 0% (step 1), 50% (step 2), 100% (step 3)
  const connectorPercent = Math.round((activeIndex / (totalSteps - 1)) * 100);

  const steps: OrderStageStep[] = ORDER_STAGE_DEFINITIONS.map((def, idx) => {
    let state: OrderStepState = 'upcoming';
    if (idx < activeIndex) {
      state = 'completed';
    } else if (idx === activeIndex) {
      state = stage === 'delivered' ? 'completed' : 'current';
    }
    return {
      key: def.key,
      label: def.label,
      state,
    };
  });

  return {
    stage,
    stageLabel: ORDER_STAGE_DEFINITIONS[activeIndex].label,
    stepNumber,
    totalSteps,
    percent,
    connectorPercent,
    steps,
  };
}

export function formatOrderDate(createdAtMs: number): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return 'Recent order';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(createdAtMs));
  } catch {
    return 'Recent order';
  }
}

export type OrderDateRangeFilter = 'all' | '7d' | '30d' | '90d';

export const ORDER_DATE_FILTER_OPTIONS: readonly {
  value: OrderDateRangeFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All dates' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const RANGE_DAYS_MAP: Record<Exclude<OrderDateRangeFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export interface FilterableOrder {
  orderId: string;
  createdAtMs: number;
}

export function filterOrders<T extends FilterableOrder>(
  orders: readonly T[],
  options: {
    query: string;
    dateRange: OrderDateRangeFilter;
    nowMs?: number;
  }
): T[] {
  const now = options.nowMs ?? Date.now();
  const q = options.query.trim().toLowerCase();
  const maxAgeMs =
    options.dateRange === 'all' ? null : RANGE_DAYS_MAP[options.dateRange] * 24 * 60 * 60 * 1000;

  return orders.filter((ord) => {
    if (maxAgeMs !== null) {
      if (!Number.isFinite(ord.createdAtMs) || ord.createdAtMs <= 0) return false;
      const age = now - ord.createdAtMs;
      if (age > maxAgeMs) return false;
    }
    if (!q) return true;

    const idMatch = ord.orderId.toLowerCase().includes(q);
    if (idMatch) return true;

    const displayDate = formatOrderDate(ord.createdAtMs).toLowerCase();
    if (displayDate.includes(q)) return true;

    if (Number.isFinite(ord.createdAtMs) && ord.createdAtMs > 0) {
      const isoDate = new Date(ord.createdAtMs).toISOString().slice(0, 10);
      if (isoDate.includes(q)) return true;
    }

    return false;
  });
}

export interface OrderStatusSnapshotItem {
  orderId: string;
  status: unknown;
  items?: readonly { title: string; quantity: number }[];
}

export interface OrderStatusAlert {
  id: string;
  orderId: string;
  fromStage: OrderStage;
  toStage: OrderStage;
  fromLabel: string;
  toLabel: string;
  subject: string;
  message: string;
  itemsSummary: string;
  detectedAtMs: number;
}

const STAGE_LABEL_MAP: Record<OrderStage, string> = {
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

function buildOrderAlertCopy(
  orderId: string,
  fromStage: OrderStage,
  toStage: OrderStage
): { subject: string; message: string } {
  const fromLabel = STAGE_LABEL_MAP[fromStage];
  const toLabel = STAGE_LABEL_MAP[toStage];

  if (toStage === 'shipped') {
    return {
      subject: `Your FLIP iT order has shipped!`,
      message: `Order ${orderId} moved from ${fromLabel} to ${toLabel} and is on its way to you.`,
    };
  }
  if (toStage === 'delivered') {
    return {
      subject: `Your FLIP iT order was delivered!`,
      message: `Order ${orderId} moved from ${fromLabel} to ${toLabel}. Enjoy your winter knitwear.`,
    };
  }
  return {
    subject: `Order status update: ${toLabel}`,
    message: `Order ${orderId} changed from ${fromLabel} to ${toLabel}.`,
  };
}

/**
 * Compares incoming Firestore order snapshots against the previously observed map.
 * Returns empty alerts on initial hydration (prevStatuses === null) and emits alerts
 * only when an existing order's canonical stage transitions.
 */
export function detectOrderStatusChanges(
  prevStatuses: ReadonlyMap<string, OrderStage> | null,
  nextOrders: readonly OrderStatusSnapshotItem[],
  nowMs = Date.now()
): { nextStatuses: Map<string, OrderStage>; alerts: OrderStatusAlert[] } {
  const nextStatuses = new Map<string, OrderStage>();
  const alerts: OrderStatusAlert[] = [];

  for (const ord of nextOrders) {
    const toStage = normalizeOrderStage(ord.status);
    nextStatuses.set(ord.orderId, toStage);

    if (prevStatuses !== null) {
      const prevStage = prevStatuses.get(ord.orderId);
      if (prevStage && prevStage !== toStage) {
        const fromLabel = STAGE_LABEL_MAP[prevStage];
        const toLabel = STAGE_LABEL_MAP[toStage];
        const copy = buildOrderAlertCopy(ord.orderId, prevStage, toStage);
        const firstItem = ord.items?.[0];
        const extraCount = (ord.items?.length ?? 0) - 1;
        const itemsSummary = firstItem
          ? extraCount > 0
            ? `${firstItem.quantity}× ${firstItem.title} + ${extraCount} more`
            : `${firstItem.quantity}× ${firstItem.title}`
          : 'FLIP iT studio order';

        alerts.push({
          id: `${ord.orderId}_${prevStage}_${toStage}_${nowMs}`,
          orderId: ord.orderId,
          fromStage: prevStage,
          toStage,
          fromLabel,
          toLabel,
          subject: copy.subject,
          message: copy.message,
          itemsSummary,
          detectedAtMs: nowMs,
        });
      }
    }
  }

  return { nextStatuses, alerts };
}

export interface CarrierTrackingParams {
  orderId: string;
  stage: OrderStage;
  createdAtMs: number;
  shippingAddress: string;
  itemsCount: number;
}

export interface CarrierCheckpoint {
  id: string;
  title: string;
  location: string;
  detail: string;
  timestampLabel: string;
  state: OrderStepState;
}

export interface CarrierTrackingModel {
  carrierName: string;
  trackingNumber: string;
  serviceName: string;
  orderId: string;
  stage: OrderStage;
  stageLabel: string;
  headline: string;
  etaLabel: string;
  shippingAddress: string;
  itemsCount: number;
  checkpoints: CarrierCheckpoint[];
}

export function buildCarrierTrackingHref(order: {
  orderId: string;
  status: unknown;
  createdAtMs: number;
  shippingAddress: string;
  itemsCount: number;
}): string {
  const params = new URLSearchParams({
    tracking: '1',
    orderId: order.orderId.slice(0, 128),
    status: normalizeOrderStage(order.status),
    placed: String(
      Number.isFinite(order.createdAtMs) && order.createdAtMs > 0
        ? Math.round(order.createdAtMs)
        : Date.now()
    ),
    address: order.shippingAddress.slice(0, 240),
    itemsCount: String(Math.max(1, Math.min(50, Math.round(order.itemsCount || 1)))),
  });
  return `?${params.toString()}`;
}

export function parseCarrierTrackingParams(search: string): CarrierTrackingParams | null {
  const params = new URLSearchParams(search);
  if (params.get('tracking') !== '1') return null;

  const rawOrderId = (params.get('orderId') || 'ord_studio_sample').trim();
  const safeOrderId = rawOrderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'ord_studio';
  const stage = normalizeOrderStage(params.get('status'));
  const rawPlaced = Number(params.get('placed'));
  const createdAtMs =
    Number.isFinite(rawPlaced) && rawPlaced > 0 ? rawPlaced : Date.now();
  const rawAddress = (params.get('address') || 'Studio Express Destination').trim();
  const shippingAddress = rawAddress.slice(0, 240) || 'Studio Express Destination';
  const rawCount = Number(params.get('itemsCount'));
  const itemsCount =
    Number.isFinite(rawCount) && rawCount >= 1 ? Math.min(50, Math.round(rawCount)) : 1;

  return {
    orderId: safeOrderId,
    stage,
    createdAtMs,
    shippingAddress,
    itemsCount,
  };
}

function deterministicCodeSuffix(orderId: string): string {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  const digits = String(1000 + (hash % 9000));
  const tail = orderId
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-5)
    .toUpperCase()
    .padEnd(5, 'X');
  return `OPE-${tail}-${digits}`;
}

export function buildCarrierTrackingModel(input: CarrierTrackingParams): CarrierTrackingModel {
  const stage = normalizeOrderStage(input.stage);
  const progress = getOrderProgress(stage);
  const trackingNumber = deterministicCodeSuffix(input.orderId);
  const placedMs = input.createdAtMs;
  const dayMs = 24 * 60 * 60 * 1000;
  const etaMs = placedMs + 3 * dayMs;

  let headline = 'Preparing at Studio Fulfillment Hub';
  let etaLabel = `Est. delivery ${formatOrderDate(etaMs)}`;
  if (stage === 'shipped') {
    headline = 'In Transit — En Route to Destination';
    etaLabel = `Est. arrival ${formatOrderDate(etaMs)}`;
  } else if (stage === 'delivered') {
    headline = 'Delivered to Recipient';
    etaLabel = `Delivered ${formatOrderDate(etaMs)}`;
  }

  const placedDateLabel = formatOrderDate(placedMs);
  const dispatchDateLabel = formatOrderDate(placedMs + dayMs);
  const transitDateLabel = formatOrderDate(placedMs + 2 * dayMs);
  const deliveredDateLabel = formatOrderDate(etaMs);

  const checkpoints: CarrierCheckpoint[] = [
    {
      id: 'delivered',
      title: 'Delivered to Recipient',
      location: input.shippingAddress,
      detail:
        stage === 'delivered'
          ? 'Parcel handed directly to recipient / safe drop.'
          : 'Awaiting local courier final handoff.',
      timestampLabel: stage === 'delivered' ? deliveredDateLabel : 'Pending',
      state: stage === 'delivered' ? 'completed' : 'upcoming',
    },
    {
      id: 'out-for-delivery',
      title: 'Departed Regional Linehaul Hub',
      location: 'Orchid Post Regional Sort Facility',
      detail:
        stage === 'processing'
          ? 'Scheduled for regional courier intake after packing.'
          : 'Cleared regional sort and loaded onto local delivery route.',
      timestampLabel: stage === 'processing' ? 'Pending' : transitDateLabel,
      state: stage === 'delivered' ? 'completed' : stage === 'shipped' ? 'current' : 'upcoming',
    },
    {
      id: 'studio-pack',
      title: 'Studio Knitwear Inspection & Dispatch',
      location: 'FLIP iT Fulfillment Atelier',
      detail:
        stage === 'processing'
          ? 'Garments steamed, folded, and queued for carrier pickup.'
          : 'Parcel sealed and handed to Orchid Post Express.',
      timestampLabel: stage === 'processing' ? placedDateLabel : dispatchDateLabel,
      state: stage === 'processing' ? 'current' : 'completed',
    },
    {
      id: 'label-created',
      title: 'Order Confirmed & Shipping Label Created',
      location: 'FLIP iT Order System',
      detail: `Electronic shipping manifest registered (${input.itemsCount} ${
        input.itemsCount === 1 ? 'item' : 'items'
      }).`,
      timestampLabel: placedDateLabel,
      state: 'completed',
    },
  ];

  return {
    carrierName: 'Orchid Post Express',
    trackingNumber,
    serviceName: 'Cold-Weather Studio Express (2–3 Business Days)',
    orderId: input.orderId,
    stage,
    stageLabel: progress.stageLabel,
    headline,
    etaLabel,
    shippingAddress: input.shippingAddress,
    itemsCount: input.itemsCount,
    checkpoints,
  };
}

export interface CsvExportOrder {
  orderId: string;
  createdAtMs: number;
  status: unknown;
  itemsCount: number;
  shippingAddress: string;
  totalCents: number;
  items: readonly {
    title: string;
    size: string;
    quantity: number;
  }[];
}

export function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildOrderHistoryFilename(nowMs = Date.now()): string {
  const isoDay = new Date(Number.isFinite(nowMs) ? nowMs : Date.now()).toISOString().slice(0, 10);
  return `flipt-order-history-${isoDay}.csv`;
}

export function buildOrderHistoryCsv(orders: readonly CsvExportOrder[]): string {
  const headers = [
    'Order ID',
    'Placed Date',
    'Status',
    'Items Count',
    'Items',
    'Shipping Address',
    'Total',
  ];
  const rows = [headers.map(escapeCsvCell).join(',')];

  for (const ord of orders) {
    const placedIso =
      Number.isFinite(ord.createdAtMs) && ord.createdAtMs > 0
        ? new Date(ord.createdAtMs).toISOString().slice(0, 10)
        : 'Recent';
    const statusLabel = getOrderProgress(ord.status).stageLabel;
    const itemsSummary = ord.items
      .map((line) => `${line.quantity}x ${line.title} (${line.size})`)
      .join('; ');
    const formattedTotal = `$${(Math.max(0, ord.totalCents) / 100).toFixed(2)}`;

    const cells = [
      ord.orderId,
      placedIso,
      statusLabel,
      ord.itemsCount,
      itemsSummary,
      ord.shippingAddress,
      formattedTotal,
    ];
    rows.push(cells.map(escapeCsvCell).join(','));
  }

  return rows.join('\r\n');
}
