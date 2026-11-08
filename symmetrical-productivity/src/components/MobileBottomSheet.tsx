import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  id?: string;
  ariaLabel?: string;
  /**
   * 'modal' renders centered on desktop (>= 768px) and as a spring bottom sheet on mobile (< 768px).
   * 'drawer' renders as a right-hand slide-over on desktop (>= 768px) and as a spring bottom sheet on mobile (< 768px).
   */
  desktopVariant?: 'modal' | 'drawer';
  maxWidthClass?: string;
  isEvening?: boolean;
  zIndexClass?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  id,
  ariaLabel,
  desktopVariant = 'modal',
  maxWidthClass = 'w-full max-w-none',
  isEvening = false,
  zIndexClass = 'z-50',
}) => {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={`fixed inset-0 ${zIndexClass} flex ${
            isMobileViewport
              ? 'items-end justify-center p-0'
              : desktopVariant === 'drawer'
              ? 'justify-end'
              : 'items-center justify-center p-4 sm:p-6'
          } bg-black/80 backdrop-blur-md`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            drag={isMobileViewport ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (isMobileViewport && (info.offset.y > 95 || info.velocity.y > 420)) {
                onClose();
              }
            }}
            initial={
              isMobileViewport
                ? { y: '100%', opacity: 0.85 }
                : desktopVariant === 'drawer'
                ? { x: '100%', opacity: 0.9 }
                : { scale: 0.96, y: 14, opacity: 0 }
            }
            animate={
              isMobileViewport
                ? { y: 0, opacity: 1 }
                : desktopVariant === 'drawer'
                ? { x: 0, opacity: 1 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            exit={
              isMobileViewport
                ? { y: '100%', opacity: 0 }
                : desktopVariant === 'drawer'
                ? { x: '100%', opacity: 0 }
                : { scale: 0.96, y: 14, opacity: 0 }
            }
            transition={{
              type: 'spring',
              damping: 29,
              stiffness: 330,
              mass: 0.85,
            }}
            style={{
              paddingBottom: isMobileViewport
                ? 'max(1rem, env(safe-area-inset-bottom))'
                : undefined,
            }}
            className={
              isMobileViewport
                ? `w-full max-h-[92vh] rounded-t-3xl border-t border-x flex flex-col overflow-hidden shadow-2xl ${
                    isEvening
                      ? 'bg-[#120e0c] border-amber-500/30 text-amber-50'
                      : 'bg-[#0b101b] border-slate-700/80 text-slate-100'
                  }`
                : desktopVariant === 'drawer'
                ? `w-full ${maxWidthClass} h-full border-l flex flex-col overflow-hidden shadow-2xl ${
                    isEvening
                      ? 'bg-[#120e0c] border-amber-900/40 text-amber-50'
                      : 'bg-[#0b101b] border-slate-800 text-slate-100'
                  }`
                : `w-full ${maxWidthClass} max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
                    isEvening
                      ? 'bg-[#120e0c] border-amber-500/30 text-amber-50'
                      : 'bg-[#0b101b] border-slate-700/80 text-slate-100'
                  }`
            }
          >
            {isMobileViewport && (
              <div
                className="w-full pt-2.5 pb-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0 select-none"
                title="Swipe down to dismiss"
              >
                <div
                  className={`w-11 h-1.5 rounded-full ${
                    isEvening ? 'bg-amber-500/40' : 'bg-slate-600/80'
                  }`}
                />
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-1">
                  Swipe down to close
                </span>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
