import React, { useEffect, useRef, useState } from 'react';
import { STORE_SHEETS, SheetCrop } from '../catalog';

interface CroppedArtProps {
  crop: SheetCrop;
  alt: string;
  className?: string;
}

export const CroppedArt: React.FC<CroppedArtProps> = ({ crop, alt, className = '' }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (crop.type !== 'sheet' || !crop.sheet) return;
    const el = boxRef.current;
    if (!el) return;

    const sheet = STORE_SHEETS[crop.sheet];
    const cx = crop.cx ?? 0;
    const cy = crop.cy ?? 0;
    const cw = crop.cw ?? sheet.w;
    const ch = crop.ch ?? sheet.h;
    const fx = crop.fx ?? 0.5;
    const fy = crop.fy ?? 0.5;

    const update = () => {
      const ew = el.clientWidth;
      const eh = el.clientHeight;
      if (!ew || !eh) return;
      const s = Math.max(ew / cw, eh / ch);
      const posX = -(cx * s) - (cw * s - ew) * fx;
      const posY = -(cy * s) - (ch * s - eh) * fy;
      setBgStyle({
        backgroundImage: `url("${sheet.url}")`,
        backgroundSize: `${sheet.w * s}px ${sheet.h * s}px`,
        backgroundPosition: `${posX}px ${posY}px`,
        backgroundRepeat: 'no-repeat',
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [crop]);

  if (crop.type === 'hero') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#E4D0EA] via-[#EBDDEF] to-[#F8F1F9] ${className}`}
      >
        <img
          src={crop.url}
          alt={alt}
          className="h-full w-full object-cover object-top"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={alt}
      className={`bg-[#CDB4D6] ${className}`}
      style={bgStyle}
    />
  );
};
