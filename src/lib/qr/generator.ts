/**
 * QR Code SVG generator.
 * Generates QR codes as inline SVG strings (no external deps).
 * Uses a simplified encoding for URLs up to ~200 chars.
 */

// Simple QR-like matrix generator for demo purposes
// In production, use a proper QR encoder
export function generateQRSvg(url: string, size = 200): string {
  const modules = generateMatrix(url);
  const n = modules.length;
  const cellSize = size / n;

  let rects = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules[y][x]) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#22D3EE"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#0C0F1A" rx="8"/>
    ${rects}
  </svg>`;
}

// Generate a deterministic matrix from a string (simplified — not a real QR spec)
function generateMatrix(data: string): boolean[][] {
  const size = 21; // QR version 1
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Fill data area with hash-based pattern
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xFFFFFFFF;
  }

  for (let y = 8; y < size; y++) {
    for (let x = 8; x < size; x++) {
      if (!matrix[y][x]) {
        hash = (hash * 1103515245 + 12345) & 0x7FFFFFFF;
        matrix[y][x] = (hash % 3) === 0;
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startX: number, startY: number) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
      const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
      matrix[startY + y][startX + x] = isOuter || isInner;
    }
  }
}

export function generateCampaignQRUrl(campaignId: string, baseUrl = 'https://socialperks.io'): string {
  return `${baseUrl}/c/${campaignId}`;
}
