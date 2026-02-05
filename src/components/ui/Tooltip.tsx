import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  delay?: number;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  maxWidth = 300,
  delay = 300,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [finalPosition, setFinalPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8; // Space between trigger and tooltip
    const arrowSize = 6;

    let x = 0;
    let y = 0;
    let adjustedPosition = position;

    // Calculate initial position
    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.top - tooltipRect.height - padding - arrowSize;
        // Flip to bottom if not enough space above
        if (y < 0) {
          adjustedPosition = 'bottom';
          y = triggerRect.bottom + padding + arrowSize;
        }
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.bottom + padding + arrowSize;
        // Flip to top if not enough space below
        if (y + tooltipRect.height > window.innerHeight) {
          adjustedPosition = 'top';
          y = triggerRect.top - tooltipRect.height - padding - arrowSize;
        }
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - padding - arrowSize;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        // Flip to right if not enough space on left
        if (x < 0) {
          adjustedPosition = 'right';
          x = triggerRect.right + padding + arrowSize;
        }
        break;
      case 'right':
        x = triggerRect.right + padding + arrowSize;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        // Flip to left if not enough space on right
        if (x + tooltipRect.width > window.innerWidth) {
          adjustedPosition = 'left';
          x = triggerRect.left - tooltipRect.width - padding - arrowSize;
        }
        break;
    }

    // Adjust horizontal position to stay within viewport
    if (x < padding) {
      x = padding;
    } else if (x + tooltipRect.width > window.innerWidth - padding) {
      x = window.innerWidth - tooltipRect.width - padding;
    }

    // Adjust vertical position to stay within viewport
    if (y < padding) {
      y = padding;
    } else if (y + tooltipRect.height > window.innerHeight - padding) {
      y = window.innerHeight - tooltipRect.height - padding;
    }

    setCoords({ x, y });
    setFinalPosition(adjustedPosition);
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      // Recalculate on scroll or resize
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getArrowClasses = () => {
    const base = 'absolute w-0 h-0 border-solid';
    switch (finalPosition) {
      case 'top':
        return `${base} bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[6px] border-t-pn-border border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent`;
      case 'bottom':
        return `${base} top-[-6px] left-1/2 -translate-x-1/2 border-b-[6px] border-b-pn-border border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent`;
      case 'left':
        return `${base} right-[-6px] top-1/2 -translate-y-1/2 border-l-[6px] border-l-pn-border border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent`;
      case 'right':
        return `${base} left-[-6px] top-1/2 -translate-y-1/2 border-r-[6px] border-r-pn-border border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent`;
    }
  };

  const getArrowFillClasses = () => {
    const base = 'absolute w-0 h-0 border-solid';
    switch (finalPosition) {
      case 'top':
        return `${base} bottom-[-5px] left-1/2 -translate-x-1/2 border-t-[6px] border-t-pn-surface border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent`;
      case 'bottom':
        return `${base} top-[-5px] left-1/2 -translate-x-1/2 border-b-[6px] border-b-pn-surface border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent`;
      case 'left':
        return `${base} right-[-5px] top-1/2 -translate-y-1/2 border-l-[6px] border-l-pn-surface border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent`;
      case 'right':
        return `${base} left-[-5px] top-1/2 -translate-y-1/2 border-r-[6px] border-r-pn-surface border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent`;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              maxWidth: `${maxWidth}px`,
            }}
            role="tooltip"
            aria-hidden="false"
          >
            <div className="relative bg-pn-surface border border-pn-border rounded-lg shadow-lg p-3 text-sm text-white">
              {content}
              {/* Arrow border */}
              <div className={getArrowClasses()} />
              {/* Arrow fill */}
              <div className={getArrowFillClasses()} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
