import path from 'path';

// Normalizes paths for consistent matching across platforms.
function normalizeForMatch(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

function hasPathSegment(normalizedPath: string, segment: string): boolean {
  return normalizeForMatch(normalizedPath).split('/').includes(segment.toLowerCase());
}

function includesAny(normalizedPath: string, needles: string[]): boolean {
  return needles.some(n => normalizedPath.includes(n));
}

/**
 * Returns true when a path should be excluded from auditing.
 *
 * Currently excludes:
 * - Mock contracts (common in test suites)
 * - OpenZeppelin vendored contracts (node_modules/@openzeppelin or vendored openzeppelin directories)
 */
export function isAuditExcludedSolidityPath(p: string): boolean {
  const normalized = normalizeForMatch(p);

  // Skip OpenZeppelin dependencies (common locations)
  if (
    includesAny(normalized, [
      '/@openzeppelin/',
      '/openzeppelin-contracts/',
      '/openzeppelin-contracts-upgradeable/',
      '/openzeppelin/',
      '/openzepplin/'
    ])
  ) {
    return true;
  }

  // Skip common mock directories
  if (hasPathSegment(normalized, 'mock') || hasPathSegment(normalized, 'mocks')) {
    return true;
  }

  // Skip typical mock filenames
  const baseName = path.basename(p).toLowerCase();
  if (baseName.endsWith('.sol') && baseName.includes('mock')) {
    return true;
  }

  return false;
}
