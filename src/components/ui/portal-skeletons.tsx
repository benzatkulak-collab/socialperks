"use client";

import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading dashboard">
      {/* Stats row */}
      <Skeleton height="h-7" width="w-48" className="mb-2" />
      <Skeleton height="h-4" width="w-64" className="mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <Skeleton height="h-8" width="w-20" className="mb-2" />
            <Skeleton height="h-3" width="w-16" />
          </div>
        ))}
      </div>
      {/* Campaign cards */}
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function CampaignListSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading campaigns">
      <Skeleton height="h-7" width="w-52" className="mb-2" />
      <Skeleton height="h-4" width="w-40" className="mb-6" />
      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <Skeleton height="h-9" width="w-32" rounded="lg" />
        <Skeleton height="h-9" width="w-32" rounded="lg" />
        <Skeleton height="h-9" width="w-48" rounded="lg" />
      </div>
      {/* Campaign grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function EarningsSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading earnings">
      <Skeleton height="h-7" width="w-56" className="mb-2" />
      <Skeleton height="h-4" width="w-48" className="mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <Skeleton height="h-8" width="w-16" className="mb-2" />
            <Skeleton height="h-3" width="w-14" />
          </div>
        ))}
      </div>
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height="h-12" rounded="lg" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading form">
      <Skeleton height="h-7" width="w-48" className="mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <Skeleton height="h-4" width="w-24" className="mb-2" />
            <Skeleton height="h-10" rounded="lg" />
          </div>
        ))}
      </div>
      <Skeleton height="h-10" width="w-32" rounded="lg" className="mt-6" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading data">
      <Skeleton height="h-7" width="w-40" className="mb-6" />
      {/* Header */}
      <Skeleton height="h-10" rounded="lg" className="mb-2" />
      {/* Rows */}
      <div className="space-y-1.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height="h-12" rounded="lg" />
        ))}
      </div>
    </div>
  );
}
