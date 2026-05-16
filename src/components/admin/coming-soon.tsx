"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageContainer, AdminPageHeader } from "./admin-page-header";

export function ComingSoon({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <AdminPageContainer>
      <AdminPageHeader title={title} description={description} />
      <Card padding="lg" borderColor="muted">
        <div className="flex items-center gap-2 mb-4">
          <Badge color="amber" size="sm" dot>
            In development
          </Badge>
          <span className="text-xs text-brand-muted font-mono">
            Backing engines exist; UI being built
          </span>
        </div>
        <p className="text-sm text-brand-text mb-4">Planned capabilities:</p>
        <ul className="space-y-2">
          {features.map((f) => (
            <li
              key={f}
              className="text-sm text-brand-dim flex items-start gap-2 before:content-['\\2014'] before:text-brand-muted before:shrink-0"
            >
              {f}
            </li>
          ))}
        </ul>
      </Card>
    </AdminPageContainer>
  );
}
