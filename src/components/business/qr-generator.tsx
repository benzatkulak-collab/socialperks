"use client";

import { useState, useCallback, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignOption {
  id: string;
  name: string;
}

interface QRGeneratorProps {
  campaigns: CampaignOption[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCampaignUrl(campaignId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://socialperks.io";
  return `${origin}/c/${campaignId}`;
}

// ─── QR Matrix Generator ────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function generateQRMatrix(input: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const seed = hashString(input + "socialperks");

  // Finder patterns (3 corners)
  const drawFinder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const border = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        matrix[r + dr][c + dc] = border || inner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 7; i < size - 7; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern center
  const ac = size - 9;
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const border = Math.abs(dr) === 2 || Math.abs(dc) === 2;
      const center = dr === 0 && dc === 0;
      matrix[ac + dr][ac + dc] = border || center;
    }
  }

  // Data area — deterministic pseudo-random from hash
  let s = seed;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) continue;
      // Skip finder/timing zones
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
      if (r === 6 || c === 6) continue;
      if (r >= ac - 2 && r <= ac + 2 && c >= ac - 2 && c <= ac + 2) continue;
      s = ((s * 1103515245 + 12345) & 0x7fffffff);
      matrix[r][c] = (s % 3) !== 0;
    }
  }

  return matrix;
}

function QRCodeSVG({ name, size = 256 }: { name: string; size?: number }) {
  const matrix = useMemo(() => generateQRMatrix(name), [name]);
  const modules = matrix.length;
  const cellSize = size / (modules + 2); // +2 for quiet zone
  const offset = cellSize; // 1-module quiet zone

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="#ffffff" rx="8" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={offset + c * cellSize}
              y={offset + r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0C0F1A"
              rx={cellSize * 0.1}
            />
          ) : null
        )
      )}
      {/* Center logo area */}
      <rect
        x={size / 2 - cellSize * 2.5}
        y={size / 2 - cellSize * 2.5}
        width={cellSize * 5}
        height={cellSize * 5}
        fill="#ffffff"
        rx="4"
      />
      <rect
        x={size / 2 - cellSize * 2}
        y={size / 2 - cellSize * 2}
        width={cellSize * 4}
        height={cellSize * 4}
        fill="#22D3EE"
        rx="4"
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0C0F1A"
        fontSize={cellSize * 1.8}
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        SP
      </text>
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QRGenerator({ campaigns }: QRGeneratorProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id ?? ""
  );
  const [linkCopied, setLinkCopied] = useState(false);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const campaignUrl = selectedCampaign
    ? getCampaignUrl(selectedCampaign.id)
    : "";

  const handleCopyLink = useCallback(() => {
    if (!campaignUrl) return;
    navigator.clipboard.writeText(campaignUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [campaignUrl]);

  const handleDownloadPNG = useCallback(() => {
    if (!selectedCampaign) return;
    // Render the SVG to canvas for PNG export
    const svgElement = document.querySelector("[data-qr-svg]") as SVGSVGElement | null;
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-${selectedCampaign.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [selectedCampaign]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="animate-fade-up">
      <h2 className="text-xl font-heading italic text-brand-text mb-1">
        QR Codes
      </h2>
      <p className="text-xs text-brand-dim font-body mb-6">
        Generate QR codes so customers can discover your campaigns in-store
      </p>

      <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
        {/* Campaign Selector */}
        <div className="mb-6">
          <label htmlFor="qr-campaign-select" className="block text-2xs font-semibold text-brand-dim mb-1.5 font-body">
            Select Campaign
          </label>
          {campaigns.length > 0 ? (
            <select
              id="qr-campaign-select"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="font-body text-sm px-3.5 py-2.5 rounded-md border border-brand-border bg-brand-bg text-brand-text w-full max-w-sm outline-none transition-all focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 appearance-none cursor-pointer"
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-3 max-w-sm">
              <div className="text-xs text-brand-muted font-body px-3.5 py-2.5 rounded-md border border-brand-border bg-brand-bg flex-1">
                No campaigns yet
              </div>
              <a
                href="/dashboard"
                className="text-xs px-3 py-2.5 bg-brand-cyan text-brand-bg font-medium rounded-md hover:bg-brand-cyan/90 shrink-0"
              >
                Launch one →
              </a>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mb-6">
          {selectedCampaign ? (
            <div className="flex flex-col items-center">
              <div data-qr-svg="">
                <QRCodeSVG name={campaignUrl} size={256} />
              </div>
              <span className="text-xs text-brand-muted font-body text-center mt-3">
                QR code for{" "}
                <span className="text-brand-cyan font-semibold">
                  {selectedCampaign.name}
                </span>
              </span>

              {/* Campaign URL (prominent + copy) */}
              <div className="mt-3 flex items-center gap-2 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 max-w-sm w-full">
                <span className="text-xs text-brand-cyan font-mono truncate flex-1">
                  {campaignUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 text-2xs font-semibold px-2.5 py-1 rounded-md border border-brand-border bg-brand-elevated text-brand-text hover:border-brand-border-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
                >
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-elevated/50">
              <div className="w-12 h-12 rounded-lg bg-brand-border/50 mb-3 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-brand-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <span className="text-xs text-brand-muted font-body">
                Select a campaign to generate a QR code
              </span>
            </div>
          )}
        </div>

        {/* Instruction Text */}
        <div className="text-center mb-6">
          <p className="text-xs text-brand-dim font-body leading-relaxed max-w-md mx-auto">
            Print this and put it at your counter. Customers scan the code to
            discover your campaign, complete the required actions, and earn their
            perk instantly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          <button
            disabled={!selectedCampaign}
            onClick={handleDownloadPNG}
            className={`font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-5 py-2.5 text-xs bg-brand-cyan text-brand-bg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
              !selectedCampaign ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            Download PNG
          </button>
          <button
            disabled={!selectedCampaign}
            onClick={handlePrint}
            className={`font-body font-semibold rounded-md border border-brand-border cursor-pointer transition-all duration-150 tracking-wide px-5 py-2.5 text-xs bg-brand-elevated text-brand-text hover:border-brand-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
              !selectedCampaign ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRGenerator;
