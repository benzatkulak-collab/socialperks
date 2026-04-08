// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Endpoint Registry
// Composes the full OpenAPI spec from core and platform endpoint definitions.
// ══════════════════════════════════════════════════════════════════════════════

import { OpenAPIGenerator } from "./openapi-generator";
import { registerCoreEndpoints } from "./endpoints-core";
import { registerPlatformEndpoints } from "./endpoints-platform";

export function createSocialPerksOpenAPISpec(): OpenAPIGenerator {
  const gen = new OpenAPIGenerator();

  registerCoreEndpoints(gen);
  registerPlatformEndpoints(gen);

  return gen;
}
