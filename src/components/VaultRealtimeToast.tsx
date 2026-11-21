import React from 'react';
import { ArrowRight, Bell, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { OrderStatusAlert } from '../orderProgress';

interface VaultRealtimeToastProps {
  alert: OrderStatusAlert | null;
  onDismiss: () => void;
  onViewOrder: (orderId: string) => void;
}

export const VaultRealtimeToast: React.FC<VaultRealtimeToastProps> = ({
  alert,
  onDismiss,
  onViewOrder,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-x-4 top-3 z-20 flex justify-center"
      data-testid="vault-realtime-toast-container"
    >
      <AnimatePresence>
        {alert && (
          <motion.div
            key={alert.id}
            role="status"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto w-full rounded-2xl border border-[#8E6A99]/60 bg-[#2D1833] p-3.5 text-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[#F3E6F6]">
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#E4D0EA]">
                      Live Order Update
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <span>{alert.fromLabel}</span>
                      <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                      <span>{alert.toLabel}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white">{alert.subject}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-[#E4D0EA]/90">
                    {alert.orderId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Dismiss toast alert"
                onClick={onDismiss}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/75 hover:bg-white/15 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-white/15 pt-2">
              <span className="truncate pr-2 text-[11px] text-[#F3E6F6]/90">
                {alert.itemsSummary}
              </span>
              <button
                type="button"
                onClick={() => onViewOrder(alert.orderId)}
                className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#2D1833] hover:bg-[#EFE6F1]"
              >
                View Order
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
