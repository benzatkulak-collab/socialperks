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

// ═══════════════ Influencer Dashboard Skeleton ═══════════════

export function InfluencerDashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading influencer dashboard">
      <span className="sr-only">Loading influencer dashboard...</span>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      {/* Earnings chart placeholder */}
      <SkeletonCard className="h-64" />
      {/* Recent activity */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="h-16" rounded="lg" />)}
      </div>
    </div>
  );
}

// ═══════════════ Profile Skeleton ═══════════════

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <span className="sr-only">Loading profile...</span>
      <div className="flex items-center gap-4">
        <Skeleton width="w-20" height="h-20" rounded="full" />
        <div className="space-y-2 flex-1">
          <Skeleton height="h-6" width="w-48" />
          <Skeleton height="h-4" width="w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      <SkeletonCard className="h-40" />
    </div>
  );
}

// ═══════════════ Enterprise Dashboard Skeleton ═══════════════

export function EnterpriseDashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading enterprise dashboard">
      <span className="sr-only">Loading enterprise dashboard...</span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard className="h-80" />
        <SkeletonCard className="h-80" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}

// ═══════════════ Reports Skeleton ═══════════════

export function ReportsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading reports">
      <span className="sr-only">Loading reports...</span>
      <div className="flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="h-10" width="w-28" rounded="lg" />)}
      </div>
      <SkeletonCard className="h-96" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="h-14" rounded="lg" />)}
      </div>
    </div>
  );
}

// ═══════════════ API Console Skeleton ═══════════════

export function ApiConsoleSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading API console">
      <span className="sr-only">Loading API console...</span>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-64" />
    </div>
  );
}

// ═══════════════ Submission List Skeleton ═══════════════

export function SubmissionListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading submissions">
      <span className="sr-only">Loading submissions...</span>
      <div className="flex justify-between">
        <Skeleton height="h-10" width="w-48" rounded="lg" />
        <Skeleton height="h-10" width="w-32" rounded="lg" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height="h-20" rounded="lg" />)}
    </div>
  );
}

// ═══════════════ Perk Wallet Skeleton ═══════════════

export function PerkWalletSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading perk wallet">
      <span className="sr-only">Loading perk wallet...</span>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="h-16" rounded="lg" />)}
      </div>
    </div>
  );
}
