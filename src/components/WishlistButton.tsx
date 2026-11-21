import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { shouldTriggerHeartBeat } from '../wishlistAnimation';

interface WishlistButtonProps {
  productId: string;
  saved: boolean;
  onToggle: () => void;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  saved,
  onToggle,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const prevProductIdRef = useRef<string | null>(productId);
  const prevSavedRef = useRef<boolean>(saved);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const trigger = shouldTriggerHeartBeat({
      prevProductId: prevProductIdRef.current,
      nextProductId: productId,
      prevSaved: prevSavedRef.current,
      nextSaved: saved,
    });
    prevProductIdRef.current = productId;
    prevSavedRef.current = saved;
    if (trigger) {
      setPulseKey((k) => k + 1);
    }
  }, [productId, saved]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      data-heart-pulse={pulseKey}
      onClick={onToggle}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
        saved
          ? 'border-[#2D1833] bg-[#2D1833] text-white'
          : 'border-[#C9B6CF] bg-white text-[#26132A] hover:bg-[#EFE6F1]'
      }`}
    >
      {pulseKey > 0 && !prefersReducedMotion && (
        <motion.span
          key={`ring-${pulseKey}`}
          aria-hidden="true"
          initial={{ scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1.48, opacity: 0 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-full border border-[#8E6A99]"
        />
      )}
      <motion.span
        key={`icon-${pulseKey}`}
        initial={false}
        animate={
          pulseKey > 0 && !prefersReducedMotion
            ? { scale: [1, 1.3, 0.94, 1.16, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: 0.56,
          times: [0, 0.24, 0.48, 0.72, 1],
          ease: 'easeInOut',
        }}
        className="inline-flex items-center justify-center"
      >
        <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
      </motion.span>
    </button>
  );
};
