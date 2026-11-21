import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Share2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { buildProductShareUrl } from '../catalog';

interface ShareProductButtonProps {
  productId: string;
  productTitle: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback for restricted iframe contexts
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) return true;
    } catch {
      return false;
    }
  }

  return false;
}

export const ShareProductButton: React.FC<ShareProductButtonProps> = ({
  productId,
  productTitle,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setStatus('idle');
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [productId]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    const baseHref = typeof window !== 'undefined' ? window.location.href : '/';
    const shareUrl = buildProductShareUrl(productId, baseHref);
    const copied = await copyTextToClipboard(shareUrl);

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    setStatus(copied ? 'copied' : 'error');
    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      resetTimerRef.current = null;
    }, 2400);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        data-share-status={status}
        title={`Copy share link for ${productTitle}`}
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition ${
          status === 'copied'
            ? 'border-[#2D1833] bg-[#EFE6F1] text-[#26132A]'
            : 'border-[#C9B6CF] bg-white text-[#26132A] hover:bg-[#EFE6F1]'
        }`}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Share</span>
      </button>

      <div className="pointer-events-none fixed inset-x-4 bottom-6 z-[60] flex justify-center">
        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              key={status}
              role="status"
              aria-live="polite"
              data-testid="share-copied-toast"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#8E6A99]/70 bg-[#2D1833] px-4 py-2 text-xs font-semibold text-white shadow-xl"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#E4D0EA]" aria-hidden="true" />
              <span>{status === 'copied' ? 'Link copied!' : 'Unable to copy link'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
