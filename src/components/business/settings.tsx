"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/lib/hooks/use-store";
import { useToast } from "@/lib/context/app-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BusinessSettingsData {
  businessName: string;
  email: string;
  description: string;
  website: string;
  industry: string;
}

interface NotificationPreferences {
  submissionReceived: boolean;
  campaignMilestone: boolean;
  weeklyDigest: boolean;
}

export interface BusinessSettingsProps {
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessType: string;
  businessIndustry: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Food & Beverage",
  "Fitness",
  "Beauty",
  "Wellness",
  "Retail",
  "Healthcare",
  "Professional Services",
  "Automotive",
  "Entertainment",
  "Art & Body",
  "Pet Care",
  "Education",
  "Technology",
  "Real Estate",
  "Other",
] as const;

// ─── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm font-medium text-brand-text">{label}</div>
        <div className="text-xs text-brand-muted mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg
          ${checked ? "bg-brand-cyan" : "bg-brand-elevated"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
            transform transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BusinessSettings({
  businessId,
  businessName,
  businessEmail,
  businessType,
  businessIndustry,
}: BusinessSettingsProps) {
  const showToast = useToast();

  // ── Account settings ────────────────────────────────────────────────────
  const { value: savedSettings, setValue: setSavedSettings } = useLocalStorage<BusinessSettingsData>(
    `sp-biz-settings-${businessId}`,
    {
      businessName,
      email: businessEmail,
      description: businessType,
      website: "",
      industry: businessIndustry || "Other",
    }
  );

  const [settings, setSettings] = useState<BusinessSettingsData>(savedSettings);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});

  const updateSetting = useCallback(<K extends keyof BusinessSettingsData>(key: K, value: BusinessSettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    setAccountErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateAccount = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!settings.businessName.trim()) {
      errors.businessName = "Business name is required.";
    }
    if (!settings.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (settings.website && !/^https?:\/\/.+\..+/.test(settings.website)) {
      errors.website = "Please enter a valid URL (https://...).";
    }
    setAccountErrors(errors);
    return Object.keys(errors).length === 0;
  }, [settings]);

  const handleSaveAccount = useCallback(() => {
    if (!validateAccount()) return;
    setSavedSettings(settings);
    showToast("Account settings saved.", "success", 3000);
  }, [validateAccount, settings, setSavedSettings, showToast]);

  // ── Notification preferences ────────────────────────────────────────────
  const { value: notifPrefs, setValue: setNotifPrefs } = useLocalStorage<NotificationPreferences>(
    `sp-biz-notifs-${businessId}`,
    {
      submissionReceived: true,
      campaignMilestone: true,
      weeklyDigest: false,
    }
  );

  const [notifications, setNotifications] = useState<NotificationPreferences>(notifPrefs);

  const updateNotification = useCallback(<K extends keyof NotificationPreferences>(key: K, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveNotifications = useCallback(() => {
    setNotifPrefs(notifications);
    showToast("Notification preferences saved.", "success", 3000);
  }, [notifications, setNotifPrefs, showToast]);

  // ── Danger zone ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = useCallback(() => {
    setShowDeleteConfirm(false);
    showToast("Account deletion requested. Our team will be in touch within 48 hours.", "info", 5000);
  }, [showToast]);

  // ── Check for unsaved changes ───────────────────────────────────────────
  const hasAccountChanges = useMemo(() => {
    return (
      settings.businessName !== savedSettings.businessName ||
      settings.email !== savedSettings.email ||
      settings.description !== savedSettings.description ||
      settings.website !== savedSettings.website ||
      settings.industry !== savedSettings.industry
    );
  }, [settings, savedSettings]);

  const hasNotifChanges = useMemo(() => {
    return (
      notifications.submissionReceived !== notifPrefs.submissionReceived ||
      notifications.campaignMilestone !== notifPrefs.campaignMilestone ||
      notifications.weeklyDigest !== notifPrefs.weeklyDigest
    );
  }, [notifications, notifPrefs]);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-heading text-2xl italic text-brand-white mb-1 sm:text-3xl">Settings</h1>
        <p className="text-sm text-brand-dim">Manage your account and preferences</p>
      </div>

      {/* ── Account Settings ──────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brand-white">Account Settings</h2>
          {hasAccountChanges && (
            <span className="text-2xs text-brand-amber font-mono">Unsaved changes</span>
          )}
        </div>

        <div className="space-y-0">
          <Field
            label="Business Name"
            value={settings.businessName}
            onChange={(v) => updateSetting("businessName", v)}
            placeholder="Your business name"
            required
            error={accountErrors.businessName}
          />

          <Field
            label="Email"
            value={settings.email}
            onChange={(v) => updateSetting("email", v)}
            type="email"
            placeholder="you@business.com"
            required
            error={accountErrors.email}
          />

          <Field
            label="Description"
            value={settings.description}
            onChange={(v) => updateSetting("description", v)}
            placeholder="Brief description of your business"
            multiline
          />

          <Field
            label="Website"
            value={settings.website}
            onChange={(v) => updateSetting("website", v)}
            type="url"
            placeholder="https://yourbusiness.com"
            error={accountErrors.website}
          />

          <div className="flex flex-col gap-1.5 mb-3">
            <label className="text-xs font-medium text-brand-dim font-body">Industry</label>
            <select
              value={settings.industry}
              onChange={(e) => updateSetting("industry", e.target.value)}
              className="
                w-full bg-brand-elevated border border-brand-border rounded-lg px-3.5 py-2.5 text-sm font-body text-brand-text
                transition-all duration-fast ease-smooth
                focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/50
                hover:border-brand-border-hover
                cursor-pointer appearance-none
              "
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSaveAccount} disabled={!hasAccountChanges}>
            Save Account Settings
          </Button>
        </div>
      </Card>

      {/* ── Notification Preferences ──────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-brand-white">Notification Preferences</h2>
          {hasNotifChanges && (
            <span className="text-2xs text-brand-amber font-mono">Unsaved changes</span>
          )}
        </div>

        <div className="divide-y divide-brand-border">
          <Toggle
            checked={notifications.submissionReceived}
            onChange={(v) => updateNotification("submissionReceived", v)}
            label="Submission Received"
            description="Get notified when someone completes a campaign action"
          />
          <Toggle
            checked={notifications.campaignMilestone}
            onChange={(v) => updateNotification("campaignMilestone", v)}
            label="Campaign Milestone"
            description="Alerts when campaigns hit key milestones (10, 50, 100 completions)"
          />
          <Toggle
            checked={notifications.weeklyDigest}
            onChange={(v) => updateNotification("weeklyDigest", v)}
            label="Weekly Digest"
            description="Weekly summary of campaign performance delivered to your email"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button size="sm" onClick={handleSaveNotifications} disabled={!hasNotifChanges}>
            Save Notification Preferences
          </Button>
        </div>
      </Card>

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <Card borderColor="red">
        <h2 className="text-sm font-semibold text-brand-red mb-2">Danger Zone</h2>
        <p className="text-xs text-brand-dim mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          Delete My Account
        </Button>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete your account?"
        message="This will permanently delete your account, campaigns, and all associated data. This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Keep Account"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
