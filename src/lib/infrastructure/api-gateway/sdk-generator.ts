// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — SDK Generator
// Generates TypeScript, Python, and cURL client code from OpenAPI specs.
// ══════════════════════════════════════════════════════════════════════════════

import type { EndpointSpec, SchemaSpec } from "./types";
import type { OpenAPIGenerator } from "./openapi-generator";

export class SDKGenerator {
  generateTypeScript(spec: ReturnType<OpenAPIGenerator["generate"]>): string {
    const lines: string[] = [];

    lines.push("// Auto-generated Social Perks TypeScript SDK");
    lines.push(`// Generated from OpenAPI ${spec.openapi} spec`);
    lines.push(`// API Version: ${spec.info.version}`);
    lines.push("");
    lines.push("export interface SocialPerksConfig {");
    lines.push("  baseUrl: string;");
    lines.push("  apiKey: string;");
    lines.push("  timeout?: number;");
    lines.push("}");
    lines.push("");
    lines.push("export interface ApiResponse<T> {");
    lines.push("  data: T;");
    lines.push("  status: number;");
    lines.push("  headers: Record<string, string>;");
    lines.push("}");
    lines.push("");
    lines.push("export class SocialPerksClient {");
    lines.push("  private config: SocialPerksConfig;");
    lines.push("");
    lines.push("  constructor(config: SocialPerksConfig) {");
    lines.push("    this.config = config;");
    lines.push("  }");
    lines.push("");
    lines.push("  private async request<T>(");
    lines.push("    method: string,");
    lines.push("    path: string,");
    lines.push("    options?: { params?: Record<string, string>; body?: unknown },");
    lines.push("  ): Promise<ApiResponse<T>> {");
    lines.push("    const url = new URL(path, this.config.baseUrl);");
    lines.push("    if (options?.params) {");
    lines.push("      for (const [k, v] of Object.entries(options.params)) {");
    lines.push("        url.searchParams.set(k, v);");
    lines.push("      }");
    lines.push("    }");
    lines.push("    const resp = await fetch(url.toString(), {");
    lines.push("      method,");
    lines.push("      headers: {");
    lines.push('        "Content-Type": "application/json",');
    lines.push('        "X-API-Key": this.config.apiKey,');
    lines.push("      },");
    lines.push("      body: options?.body ? JSON.stringify(options.body) : undefined,");
    lines.push("      signal: this.config.timeout");
    lines.push("        ? AbortSignal.timeout(this.config.timeout)");
    lines.push("        : undefined,");
    lines.push("    });");
    lines.push("    const data = await resp.json() as T;");
    lines.push("    const headers: Record<string, string> = {};");
    lines.push("    resp.headers.forEach((v, k) => { headers[k] = v; });");
    lines.push("    return { data, status: resp.status, headers };");
    lines.push("  }");

    // Generate methods from each endpoint
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operationRaw] of Object.entries(
        methods as Record<string, Record<string, unknown>>,
      )) {
        const operation = operationRaw as Record<string, unknown>;
        const operationId = (operation.operationId as string) ?? "";
        const methodName = this.toCamelCase(operationId);
        const summary = (operation.summary as string) ?? "";
        const params = (operation.parameters as Array<Record<string, unknown>>) ?? [];

        lines.push("");
        lines.push(`  /** ${summary} */`);

        const hasBody = !!operation.requestBody;
        const queryParams = params.filter((p) => p.in === "query");
        const pathParams = params.filter((p) => p.in === "path");

        const args: string[] = [];
        for (const p of pathParams) {
          args.push(`${p.name}: string`);
        }
        if (queryParams.length > 0) {
          const paramFields = queryParams
            .map((p) => `${p.name}${p.required ? "" : "?"}: string`)
            .join("; ");
          args.push(`params: { ${paramFields} }`);
        }
        if (hasBody) {
          args.push("body: Record<string, unknown>");
        }

        lines.push(`  async ${methodName}(${args.join(", ")}): Promise<ApiResponse<unknown>> {`);

        // Build path with substitutions
        let resolvedPath = path;
        for (const p of pathParams) {
          resolvedPath = resolvedPath.replace(
            `{${p.name}}`,
            `\${${p.name}}`,
          );
        }

        const fetchOptions: string[] = [];
        if (queryParams.length > 0) {
          fetchOptions.push("params: params as unknown as Record<string, string>");
        }
        if (hasBody) {
          fetchOptions.push("body");
        }

        const optionsStr =
          fetchOptions.length > 0 ? `, { ${fetchOptions.join(", ")} }` : "";

        lines.push(
          `    return this.request("${method.toUpperCase()}", \`${resolvedPath}\`${optionsStr});`,
        );
        lines.push("  }");
      }
    }

    lines.push("}");
    lines.push("");

    return lines.join("\n");
  }

  generatePython(spec: ReturnType<OpenAPIGenerator["generate"]>): string {
    const lines: string[] = [];

    lines.push("# Auto-generated Social Perks Python SDK");
    lines.push(`# Generated from OpenAPI ${spec.openapi} spec`);
    lines.push(`# API Version: ${spec.info.version}`);
    lines.push("");
    lines.push("import requests");
    lines.push("from typing import Any, Dict, Optional");
    lines.push("from dataclasses import dataclass");
    lines.push("");
    lines.push("");
    lines.push("@dataclass");
    lines.push("class ApiResponse:");
    lines.push('    """API response wrapper."""');
    lines.push("    data: Any");
    lines.push("    status: int");
    lines.push("    headers: Dict[str, str]");
    lines.push("");
    lines.push("");
    lines.push("class SocialPerksClient:");
    lines.push('    """Social Perks API client."""');
    lines.push("");
    lines.push("    def __init__(self, base_url: str, api_key: str, timeout: int = 30):");
    lines.push("        self.base_url = base_url.rstrip('/')");
    lines.push("        self.api_key = api_key");
    lines.push("        self.timeout = timeout");
    lines.push("        self.session = requests.Session()");
    lines.push("        self.session.headers.update({");
    lines.push("            'Content-Type': 'application/json',");
    lines.push("            'X-API-Key': self.api_key,");
    lines.push("        })");
    lines.push("");
    lines.push("    def _request(");
    lines.push("        self,");
    lines.push("        method: str,");
    lines.push("        path: str,");
    lines.push("        params: Optional[Dict[str, str]] = None,");
    lines.push("        json_body: Optional[Dict[str, Any]] = None,");
    lines.push("    ) -> ApiResponse:");
    lines.push("        url = f'{self.base_url}{path}'");
    lines.push("        resp = self.session.request(");
    lines.push("            method=method,");
    lines.push("            url=url,");
    lines.push("            params=params,");
    lines.push("            json=json_body,");
    lines.push("            timeout=self.timeout,");
    lines.push("        )");
    lines.push("        return ApiResponse(");
    lines.push("            data=resp.json(),");
    lines.push("            status=resp.status_code,");
    lines.push("            headers=dict(resp.headers),");
    lines.push("        )");

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operationRaw] of Object.entries(
        methods as Record<string, Record<string, unknown>>,
      )) {
        const operation = operationRaw as Record<string, unknown>;
        const operationId = (operation.operationId as string) ?? "";
        const fnName = this.toSnakeCase(operationId);
        const summary = (operation.summary as string) ?? "";
        const params = (operation.parameters as Array<Record<string, unknown>>) ?? [];

        const hasBody = !!operation.requestBody;
        const queryParams = params.filter((p) => p.in === "query");
        const pathParams = params.filter((p) => p.in === "path");

        lines.push("");
        lines.push(`    def ${fnName}(`);
        lines.push("        self,");
        for (const p of pathParams) {
          lines.push(`        ${p.name}: str,`);
        }
        for (const p of queryParams) {
          if (p.required) {
            lines.push(`        ${p.name}: str,`);
          } else {
            lines.push(`        ${p.name}: Optional[str] = None,`);
          }
        }
        if (hasBody) {
          lines.push("        body: Optional[Dict[str, Any]] = None,");
        }
        lines.push("    ) -> ApiResponse:");
        lines.push(`        """${summary}"""`);

        // Build path
        let pyPath = path;
        for (const p of pathParams) {
          pyPath = pyPath.replace(`{${p.name}}`, `{${p.name}}`);
        }
        if (pathParams.length > 0) {
          lines.push(`        path = f'${pyPath}'`);
        } else {
          lines.push(`        path = '${pyPath}'`);
        }

        if (queryParams.length > 0) {
          lines.push("        query_params = {}");
          for (const p of queryParams) {
            lines.push(`        if ${p.name} is not None:`);
            lines.push(`            query_params['${p.name}'] = ${p.name}`);
          }
        }

        const callArgs: string[] = [`'${method.toUpperCase()}'`, "path"];
        if (queryParams.length > 0) {
          callArgs.push("params=query_params");
        }
        if (hasBody) {
          callArgs.push("json_body=body");
        }

        lines.push(`        return self._request(${callArgs.join(", ")})`);
      }
    }

    lines.push("");

    return lines.join("\n");
  }

  generateCurl(endpoint: EndpointSpec): string {
    const lines: string[] = [];
    const baseUrl = "https://api.socialperks.app/v1";

    let url = `${baseUrl}${endpoint.path}`;

    // Replace path params with example values
    url = url.replace(/\{(\w+)\}/g, ":$1");

    // Add query params for GET
    const queryParams = endpoint.parameters.filter((p) => p.in === "query");
    if (queryParams.length > 0) {
      const paramParts = queryParams.map(
        (p) => `${p.name}=${p.schema.example ?? `<${p.name}>`}`,
      );
      url += `?${paramParts.join("&")}`;
    }

    lines.push(`curl -X ${endpoint.method} \\`);
    lines.push(`  '${url}' \\`);
    lines.push(`  -H 'Content-Type: application/json' \\`);

    if (endpoint.auth) {
      lines.push(`  -H 'X-API-Key: YOUR_API_KEY' \\`);
    }

    if (endpoint.requestBody) {
      const example = this.generateExampleBody(endpoint.requestBody);
      lines.push(`  -d '${JSON.stringify(example, null, 2)}'`);
    } else {
      // Remove trailing backslash from last line
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx].replace(/ \\$/, "");
    }

    return lines.join("\n");
  }

  private toCamelCase(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/[_]+/g, "_");
  }

  private generateExampleBody(schema: SchemaSpec): unknown {
    switch (schema.type) {
      case "string":
        return schema.example ?? schema.enum?.[0] ?? "string";
      case "number":
      case "integer":
        return schema.example ?? 0;
      case "boolean":
        return schema.example ?? true;
      case "array":
        return schema.items ? [this.generateExampleBody(schema.items)] : [];
      case "object": {
        const obj: Record<string, unknown> = {};
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = this.generateExampleBody(propSchema);
          }
        }
        return schema.example ?? obj;
      }
      default:
        return null;
    }
  }
}
