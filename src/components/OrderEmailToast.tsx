import React from 'react';
import { ArrowRight, Mail, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { OrderStatusAlert } from '../orderProgress';

interface OrderEmailToastProps {
  alerts: OrderStatusAlert[];
  userEmail: string;
  onDismiss: (alertId: string) => void;
  onJumpToOrder: (orderId: string) => void;
}

export const OrderEmailToast: React.FC<OrderEmailToastProps> = ({
  alerts,
  userEmail,
  onDismiss,
  onJumpToOrder,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (alerts.length === 0) return null;

  return (
    <section
      aria-label="Order status notifications"
      className="space-y-2.5"
      data-testid="order-email-toasts"
    >
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <motion.article
            key={alert.id}
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden rounded-2xl border border-[#8E6A99]/70 bg-white shadow-md"
          >
            {/* Email header bar */}
            <div className="flex items-center justify-between gap-2 border-b border-[#E4D0EA] bg-[#2D1833] px-3.5 py-2 text-[#F3E6F6]">
              <div className="flex min-w-0 items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#E4D0EA]" aria-hidden="true" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-wider">
                  FLIP iT Studio &bull; Order Alert
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                  Just now
                </span>
                <button
                  type="button"
                  aria-label={`Dismiss notification for order ${alert.orderId}`}
                  onClick={() => onDismiss(alert.id)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Email body */}
            <div className="p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#26132A]">{alert.subject}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFE6F1] px-2.5 py-0.5 text-[10px] font-semibold text-[#2D1833]">
                  <span>{alert.fromLabel}</span>
                  <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>{alert.toLabel}</span>
                </span>
              </div>

              <p className="mt-1 text-[11px] text-[#6E5873]">To: {userEmail}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#26132A]">{alert.message}</p>

              <div className="mt-2.5 flex items-center justify-between border-t border-[#E4D0EA]/70 pt-2">
                <span className="truncate pr-2 text-[11px] font-medium text-[#6E5873]">
                  {alert.itemsSummary}
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToOrder(alert.orderId)}
                  className="shrink-0 text-[11px] font-semibold text-[#2D1833] underline-offset-2 hover:underline"
                >
                  View order
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </section>
  );
};
