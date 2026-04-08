// ══════════════════════════════════════════════════════════════════════════════
// Semver Utilities — Lightweight version comparison
// ══════════════════════════════════════════════════════════════════════════════

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Check if `version` satisfies the requirement `required`.
 * Supports exact match and caret (^) ranges.
 */
export function satisfiesVersion(version: string, required: string): boolean {
  const isCaret = required.startsWith("^");
  const reqStr = isCaret ? required.slice(1) : required;

  const ver = parseSemver(version);
  const req = parseSemver(reqStr);
  if (!ver || !req) return false;

  if (isCaret) {
    // ^1.2.3 means >=1.2.3 and <2.0.0
    if (req.major > 0) {
      return ver.major === req.major &&
        (ver.minor > req.minor || (ver.minor === req.minor && ver.patch >= req.patch));
    }
    // ^0.x means minor must match
    if (req.minor > 0) {
      return ver.major === 0 &&
        ver.minor === req.minor &&
        ver.patch >= req.patch;
    }
    // ^0.0.x means exact match
    return ver.major === 0 && ver.minor === 0 && ver.patch === req.patch;
  }

  // Exact match
  return ver.major === req.major && ver.minor === req.minor && ver.patch === req.patch;
}
