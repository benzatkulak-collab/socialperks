// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — API Version Manager
// Multi-strategy API versioning with URL path, Accept header, and
// X-API-Version header resolution. Tracks changelogs between versions.
// ══════════════════════════════════════════════════════════════════════════════

import type { APIVersion, VersionChangeEntry } from "./types";

export class APIVersionManager {
  private versions: Map<string, APIVersion> = new Map();

  registerVersion(version: string, config: Omit<APIVersion, "version">): void {
    this.versions.set(version, { version, ...config });
  }

  resolveVersion(request: {
    url: string;
    headers?: Record<string, string>;
  }): string {
    // Strategy 1: URL path version (e.g. /v1/campaigns, /v2/campaigns)
    const urlMatch = request.url.match(/\/v(\d+(?:\.\d+)*)\//);
    if (urlMatch) {
      const urlVersion = this.normalizeVersion(urlMatch[1]);
      if (this.versions.has(urlVersion)) {
        return urlVersion;
      }
    }

    // Strategy 2: Accept header (e.g. application/vnd.socialperks.v2+json)
    const accept = request.headers?.["accept"] ?? request.headers?.["Accept"];
    if (accept) {
      const headerMatch = accept.match(
        /application\/vnd\.socialperks\.v(\d+(?:\.\d+)*)\+json/,
      );
      if (headerMatch) {
        const headerVersion = this.normalizeVersion(headerMatch[1]);
        if (this.versions.has(headerVersion)) {
          return headerVersion;
        }
      }
    }

    // Strategy 3: X-API-Version header
    const explicitVersion = request.headers?.["x-api-version"];
    if (explicitVersion && this.versions.has(explicitVersion)) {
      return explicitVersion;
    }

    // Default to latest non-deprecated version
    return this.getLatestVersion();
  }

  getDeprecatedVersions(): APIVersion[] {
    const now = new Date().toISOString();
    return Array.from(this.versions.values()).filter(
      (v) => v.deprecationDate && v.deprecationDate <= now,
    );
  }

  getChangelog(
    fromVersion: string,
    toVersion: string,
  ): VersionChangeEntry[] {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);
    if (!from || !to) {
      throw new Error(
        `Version ${!from ? fromVersion : toVersion} not found`,
      );
    }

    const changes: VersionChangeEntry[] = [];

    const fromRoutes = new Map(
      from.routes.map((r) => [`${r.method}:${r.path}`, r]),
    );
    const toRoutes = new Map(
      to.routes.map((r) => [`${r.method}:${r.path}`, r]),
    );

    // Added routes
    for (const [key, route] of Array.from(toRoutes.entries())) {
      if (!fromRoutes.has(key)) {
        changes.push({
          type: "added",
          path: route.path,
          method: route.method,
          description: route.changelog ?? `New endpoint: ${route.method} ${route.path}`,
        });
      }
    }

    // Removed routes
    for (const [key, route] of Array.from(fromRoutes.entries())) {
      if (!toRoutes.has(key)) {
        changes.push({
          type: "removed",
          path: route.path,
          method: route.method,
          description: route.changelog ?? `Removed endpoint: ${route.method} ${route.path}`,
        });
      }
    }

    // Modified / deprecated routes
    for (const [key, toRoute] of Array.from(toRoutes.entries())) {
      const fromRoute = fromRoutes.get(key);
      if (!fromRoute) continue;

      if (toRoute.deprecatedIn && !fromRoute.deprecatedIn) {
        changes.push({
          type: "deprecated",
          path: toRoute.path,
          method: toRoute.method,
          description: toRoute.changelog ?? `Deprecated: ${toRoute.method} ${toRoute.path}`,
        });
      } else if (toRoute.handler !== fromRoute.handler || toRoute.changelog) {
        changes.push({
          type: "modified",
          path: toRoute.path,
          method: toRoute.method,
          description: toRoute.changelog ?? `Modified endpoint: ${toRoute.method} ${toRoute.path}`,
        });
      }
    }

    return changes;
  }

  getVersion(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  getAllVersions(): APIVersion[] {
    return Array.from(this.versions.values()).sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true }),
    );
  }

  private normalizeVersion(v: string): string {
    // Turn "1" into "1.0.0", "2.1" into "2.1.0", etc.
    const parts = v.split(".");
    while (parts.length < 3) parts.push("0");
    return parts.join(".");
  }

  private getLatestVersion(): string {
    const sorted = Array.from(this.versions.keys()).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
    return sorted[0] ?? "1.0.0";
  }
}
