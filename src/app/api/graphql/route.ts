import type { NextRequest } from 'next/server';
import { resolvers } from '@/lib/graphql/resolvers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResolverFn = (parent: unknown, args: Record<string, any>) => unknown;

// Simple GraphQL executor (no external dependencies)
// For production, replace with graphql-yoga or apollo-server
async function executeGraphQL(query: string, variables?: Record<string, unknown>) {
  // Parse the query to extract the operation
  const operationMatch = query.match(/\{\s*(\w+)/);
  if (!operationMatch) return { errors: [{ message: 'Invalid query' }] };

  const operation = operationMatch[1];
  const resolver = (resolvers.Query as unknown as Record<string, ResolverFn>)[operation];

  if (!resolver) return { errors: [{ message: `Unknown field: ${operation}` }] };

  try {
    const data = await resolver(null, (variables || {}) as Record<string, unknown>);
    return { data: { [operation]: data } };
  } catch (error) {
    return { errors: [{ message: error instanceof Error ? error.message : 'Internal error' }] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, variables } = body;

    if (!query) {
      return Response.json({ errors: [{ message: 'Query is required' }] }, { status: 400 });
    }

    const result = await executeGraphQL(query, variables);
    return Response.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': crypto.randomUUID(),
      },
    });
  } catch {
    return Response.json({ errors: [{ message: 'Invalid request' }] }, { status: 400 });
  }
}

export async function GET() {
  // Return GraphQL Playground HTML
  const html = `<!DOCTYPE html>
<html><head><title>Social Perks GraphQL</title>
<style>body{margin:0;height:100vh}</style>
<link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css" />
</head><body>
<div id="graphiql" style="height:100vh"></div>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/graphiql@3/graphiql.min.js"></script>
<script>
  const fetcher = GraphiQL.createFetcher({ url: '/api/graphql' });
  ReactDOM.createRoot(document.getElementById('graphiql')).render(
    React.createElement(GraphiQL, { fetcher })
  );
</script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
