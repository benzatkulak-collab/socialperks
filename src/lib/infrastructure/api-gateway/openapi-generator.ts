// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — OpenAPI Spec Generator
// Builds an OpenAPI 3.1.0 specification from registered endpoint definitions.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  EndpointSpec,
  SchemaSpec,
  ResponseSpec,
  OpenAPISpec,
} from "./types";

export class OpenAPIGenerator {
  private endpoints: EndpointSpec[] = [];
  private tagSet: Map<string, string> = new Map();

  addEndpoint(spec: EndpointSpec): void {
    this.endpoints.push(spec);
    for (const tag of spec.tags) {
      if (!this.tagSet.has(tag)) {
        this.tagSet.set(tag, `${tag} operations`);
      }
    }
  }

  validate(spec: EndpointSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!spec.path || !spec.path.startsWith("/")) {
      errors.push("Path must start with /");
    }
    if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(spec.method)) {
      errors.push(`Invalid HTTP method: ${spec.method}`);
    }
    if (!spec.summary || spec.summary.length === 0) {
      errors.push("Summary is required");
    }
    if (!spec.description || spec.description.length === 0) {
      errors.push("Description is required");
    }
    if (!spec.tags || spec.tags.length === 0) {
      errors.push("At least one tag is required");
    }
    if (!spec.responses || Object.keys(spec.responses).length === 0) {
      errors.push("At least one response is required");
    }
    if (!spec.rateLimit || !spec.rateLimit.requests || !spec.rateLimit.window) {
      errors.push("Rate limit configuration is required");
    }
    for (const param of spec.parameters) {
      if (!param.name) errors.push("Parameter name is required");
      if (!["query", "path", "header", "cookie"].includes(param.in)) {
        errors.push(`Invalid parameter location: ${param.in}`);
      }
    }
    if (spec.method === "GET" && spec.requestBody) {
      errors.push("GET requests should not have a request body");
    }

    return { valid: errors.length === 0, errors };
  }

  generate(): OpenAPISpec {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const method = endpoint.method.toLowerCase();
      const operation: Record<string, unknown> = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        operationId: this.generateOperationId(endpoint),
        parameters: endpoint.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: this.schemaToOpenAPI(p.schema),
        })),
        responses: this.buildResponses(endpoint.responses),
        "x-rate-limit": endpoint.rateLimit,
      };

      if (endpoint.auth) {
        operation.security = [{ BearerAuth: [] }, { ApiKeyAuth: [] }];
      }

      if (endpoint.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: this.schemaToOpenAPI(endpoint.requestBody),
            },
          },
        };
      }

      paths[endpoint.path][method] = operation;
    }

    return {
      openapi: "3.1.0",
      info: {
        title: "Social Perks API",
        description:
          "Turn customers into your marketing team. The Social Perks API enables businesses to create campaigns, manage influencer relationships, track submissions, and distribute perks.",
        version: "1.0.0",
        contact: {
          name: "Social Perks Developer Support",
          url: "https://developers.socialperks.io",
          email: "api@socialperks.io",
        },
        license: {
          name: "Proprietary",
          url: "https://socialperks.io/terms",
        },
      },
      servers: [
        {
          url: "https://api.socialperks.io/v1",
          description: "Production",
        },
        {
          url: "https://sandbox.socialperks.io/v1",
          description: "Sandbox",
        },
        {
          url: "http://localhost:3000/api/v1",
          description: "Local Development",
        },
      ],
      paths,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        schemas: {},
      },
      tags: Array.from(this.tagSet.entries()).map(([name, description]) => ({
        name,
        description,
      })),
      security: [{ BearerAuth: [] }],
    };
  }

  private generateOperationId(endpoint: EndpointSpec): string {
    const method = endpoint.method.toLowerCase();
    const parts = endpoint.path
      .split("/")
      .filter((p) => p && !p.startsWith("{"))
      .map((p) => p.replace(/[^a-zA-Z0-9]/g, ""));
    return `${method}_${parts.join("_")}`;
  }

  private schemaToOpenAPI(schema: SchemaSpec): Record<string, unknown> {
    const result: Record<string, unknown> = { type: schema.type };
    if (schema.format) result.format = schema.format;
    if (schema.description) result.description = schema.description;
    if (schema.enum) result.enum = schema.enum;
    if (schema.example !== undefined) result.example = schema.example;
    if (schema.items) result.items = this.schemaToOpenAPI(schema.items);
    if (schema.properties) {
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([k, v]) => [
          k,
          this.schemaToOpenAPI(v),
        ]),
      );
    }
    if (schema.required) result.required = schema.required;
    return result;
  }

  private buildResponses(
    responses: Record<string, ResponseSpec>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [code, resp] of Object.entries(responses)) {
      const entry: Record<string, unknown> = { description: resp.description };
      if (resp.schema) {
        entry.content = {
          "application/json": {
            schema: this.schemaToOpenAPI(resp.schema),
          },
        };
      }
      result[code] = entry;
    }
    return result;
  }
}
