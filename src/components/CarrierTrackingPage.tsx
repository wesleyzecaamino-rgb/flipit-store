import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Package, Truck } from 'lucide-react';
import {
  CarrierTrackingParams,
  buildCarrierTrackingModel,
  formatOrderDate,
} from '../orderProgress';
import { OrderStatusProgress } from './OrderStatusProgress';

interface CarrierTrackingPageProps {
  params: CarrierTrackingParams;
}

export const CarrierTrackingPage: React.FC<CarrierTrackingPageProps> = ({ params }) => {
  const model = buildCarrierTrackingModel(params);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    const prevTitle = document.title;
    document.title = `Tracking ${model.trackingNumber} — ${model.carrierName}`;
    if (mainEl) {
      mainEl.setAttribute('hidden', 'true');
    }
    return () => {
      document.title = prevTitle;
      if (mainEl) {
        mainEl.removeAttribute('hidden');
      }
    };
  }, [model.trackingNumber, model.carrierName]);

  return (
    <div
      className="min-h-screen bg-[#F4EEF6] px-4 py-8 text-[#26132A] sm:px-6 lg:px-8"
      data-testid="carrier-tracking-page"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Carrier Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#C9B6CF]/70 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2D1833] text-white">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold uppercase tracking-tight text-[#26132A]">
                  {model.carrierName}
                </h1>
                <span className="rounded-full bg-[#EFE6F1] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#2D1833]">
                  Simulated Carrier Tracking
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-[#6E5873]">
                Tracking #{model.trackingNumber}
              </p>
            </div>
          </div>

          <a
            href="./"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#C9B6CF] bg-[#F8F1F9] px-4 text-xs font-semibold text-[#26132A] hover:bg-[#EFE6F1]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to FLIP iT Store
          </a>
        </header>

        {/* Shipment Summary Card */}
        <section
          aria-label="Shipment Summary"
          className="rounded-[28px] border border-[#C9B6CF]/70 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#2D1833] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                {model.stageLabel}
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#26132A]">
                {model.headline}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#6E5873]">{model.etaLabel}</p>
            </div>
            <div className="rounded-2xl border border-[#C9B6CF]/60 bg-[#F8F1F9] px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6E5873]">
                Order Reference
              </p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-[#26132A]">
                {model.orderId}
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E5873]">
                Placed {formatOrderDate(params.createdAtMs)}
              </p>
            </div>
          </div>

          <OrderStatusProgress orderId={model.orderId} status={model.stage} />

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E4D0EA]/70 pt-5 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#F8F1F9] p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E5873]">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Destination
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-[#26132A]">
                {model.shippingAddress}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F8F1F9] p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E5873]">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                Service Tier
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-[#26132A]">
                {model.serviceName}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F8F1F9] p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E5873]">
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                Parcel Contents
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-[#26132A]">
                {model.itemsCount} {model.itemsCount === 1 ? 'studio piece' : 'studio pieces'}
              </p>
            </div>
          </div>
        </section>

        {/* Scan & Transit History */}
        <section
          aria-label="Carrier Scan History"
          className="rounded-[28px] border border-[#C9B6CF]/70 bg-white p-6 shadow-sm"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E5873]">
            Carrier Scan History
          </h3>

          <ol className="mt-4 space-y-4">
            {model.checkpoints.map((cp) => {
              const isCompleted = cp.state === 'completed';
              const isCurrent = cp.state === 'current';
              return (
                <li
                  key={cp.id}
                  className="flex items-start gap-3.5 rounded-2xl border border-[#C9B6CF]/45 bg-[#F8F1F9] p-4"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      isCompleted || isCurrent
                        ? 'border-[#2D1833] bg-[#2D1833] text-white'
                        : 'border-[#C9B6CF] bg-white text-[#8E6A99]'
                    } ${isCurrent ? 'ring-2 ring-[#C9B6CF]' : ''}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted || isCurrent ? 'text-[#26132A]' : 'text-[#6E5873]'
                        }`}
                      >
                        {cp.title}
                      </p>
                      <span className="text-xs font-medium text-[#6E5873]">
                        {cp.timestampLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[#6E5873]">{cp.location}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#26132A]/85">{cp.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-5 text-center text-[11px] text-[#6E5873]">
            This is a simulated shipping carrier tracking portal reflecting your FLIP iT order status.
          </p>
        </section>
      </div>
    </div>
  );
};
