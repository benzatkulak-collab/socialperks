'use client';
import { useState } from 'react';

interface ExportButtonProps {
  entity: 'campaigns' | 'submissions' | 'analytics' | 'earnings';
  label?: string;
  className?: string;
}

export function ExportButton({ entity, label = 'Export', className = '' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    setShowMenu(false);
    try {
      const res = await fetch('/api/v1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ format, entity }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const ext = format === 'csv' ? 'csv' : 'html';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 rounded-lg text-white/60 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        {loading ? (
          <span className="animate-spin">{'\u21BB'}</span>
        ) : (
          <span>{'\u2913'}</span>
        )}
        {label}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={() => handleExport('csv')}
            className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
