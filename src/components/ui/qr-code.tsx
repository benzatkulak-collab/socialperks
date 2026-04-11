'use client';
import { useMemo } from 'react';
import { generateQRSvg } from '@/lib/qr/generator';

interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRCode({ url, size = 200, className = '' }: QRCodeProps) {
  const svg = useMemo(() => generateQRSvg(url, size), [url, size]);
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" />
  );
}
