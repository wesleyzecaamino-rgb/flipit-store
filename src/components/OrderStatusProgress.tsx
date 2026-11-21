import React from 'react';
import { Check, Package, Truck } from 'lucide-react';
import { OrderStage, getOrderProgress } from '../orderProgress';

interface OrderStatusProgressProps {
  orderId: string;
  status: unknown;
}

function StageIcon({ stage, active }: { stage: OrderStage; active: boolean }) {
  const cls = active ? 'h-3 w-3 text-white' : 'h-3 w-3 text-[#8E6A99]';
  if (stage === 'delivered') {
    return <Check className={cls} strokeWidth={2.5} />;
  }
  if (stage === 'shipped') {
    return <Truck className={cls} strokeWidth={2.2} />;
  }
  return <Package className={cls} strokeWidth={2.2} />;
}

export const OrderStatusProgress: React.FC<OrderStatusProgressProps> = ({ orderId, status }) => {
  const progress = getOrderProgress(status);

  return (
    <div
      className="mt-3 rounded-xl border border-[#C9B6CF]/50 bg-white/80 p-3"
      data-testid={`order-progress-${orderId}`}
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-[#6E5873]">
          Fulfillment Status
        </span>
        <span className="font-bold uppercase tracking-wide text-[#2D1833]">
          {progress.stageLabel} ({progress.stepNumber}/{progress.totalSteps})
        </span>
      </div>

      {/* Linear progress bar */}
      <div
        role="progressbar"
        aria-label={`Order ${orderId} fulfillment status`}
        aria-valuemin={1}
        aria-valuemax={progress.totalSteps}
        aria-valuenow={progress.stepNumber}
        aria-valuetext={`${progress.stageLabel} — step ${progress.stepNumber} of ${progress.totalSteps}`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E4D0EA]"
      >
        <div
          className="h-full rounded-full bg-[#2D1833] transition-all duration-300 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Milestone labels */}
      <ol className="mt-2.5 grid grid-cols-3 gap-1.5" aria-label="Order milestones">
        {progress.steps.map((step) => {
          const isReached = step.state === 'completed' || step.state === 'current';
          const isCurrent = step.state === 'current';
          return (
            <li key={step.key} className="flex items-center gap-1.5 min-w-0">
              <span
                aria-hidden="true"
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isReached
                    ? 'border-[#2D1833] bg-[#2D1833]'
                    : 'border-[#C9B6CF] bg-[#F8F1F9]'
                } ${isCurrent ? 'ring-2 ring-[#C9B6CF]/70' : ''}`}
              >
                <StageIcon stage={step.key} active={isReached} />
              </span>
              <span
                className={`truncate text-[11px] leading-tight ${
                  isCurrent
                    ? 'font-bold text-[#26132A]'
                    : isReached
                      ? 'font-semibold text-[#2D1833]'
                      : 'font-medium text-[#6E5873]'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
