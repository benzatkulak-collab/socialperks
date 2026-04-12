'use client';
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

export function MobileOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? <>{children}</> : null;
}

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? null : <>{children}</>;
}

/** Responsive container that switches between stack and row layouts */
export function ResponsiveGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>{children}</div>;
}
