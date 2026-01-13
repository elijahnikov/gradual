interface Env {
  GRADUAL_API_KEY: KVNamespace;
  GRADUAL_SNAPSHOT: KVNamespace;
  CLOUDFLARE_WORKERS_ADMIN_KEY: string;
}

async function handleSnapshot(
  snapshotId: string | null,
  env: Env,
  request: Request
): Promise<Response> {
  if (!verifyAdminAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!snapshotId) {
    return new Response("Missing snapshot id", { status: 400 });
  }

  try {
    const snapshot = await env.GRADUAL_SNAPSHOT.get(snapshotId);
    if (snapshot === null) {
      return new Response("Snapshot not found", { status: 404 });
    }
    return new Response(snapshot, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("KV error:", err);
    return new Response(err instanceof Error ? err.message : "KV error", {
      status: 500,
    });
  }
}

async function handleSubmitApiKey(
  request: Request,
  env: Env
): Promise<Response> {
  if (!verifyAdminAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await request.json()) as {
      apiKey: string;
      projectId: string;
      orgId: string;
    };

    if (!(body.apiKey && body.projectId && body.orgId)) {
      return new Response("Missing required fields: apiKey, projectId, orgId", {
        status: 400,
      });
    }

    const key = `apiKey:${body.apiKey}`;
    const value = JSON.stringify({
      projectId: body.projectId,
      orgId: body.orgId,
    });

    await env.GRADUAL_API_KEY.put(key, value);

    return new Response(
      JSON.stringify({ success: true, message: "API key stored" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error storing API key:", err);
    return new Response(
      err instanceof Error ? err.message : "Error storing API key",
      { status: 500 }
    );
  }
}

function verifyAdminAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get("Authorization");
  const bearerPrefix = "Bearer ";

  if (!authHeader) {
    return false;
  }

  if (!authHeader.startsWith(bearerPrefix)) {
    return false;
  }

  const token = authHeader.slice(bearerPrefix.length);
  return token === env.CLOUDFLARE_WORKERS_ADMIN_KEY;
}

function extractApiKey(request: Request, requestUrl: URL): string | null {
  const authHeader = request.headers.get("Authorization");
  const bearerPrefix = "Bearer ";
  if (authHeader?.startsWith(bearerPrefix)) {
    return authHeader.slice(bearerPrefix.length);
  }

  if (request.method === "GET") {
    return requestUrl.searchParams.get("apiKey");
  }

  return null;
}

async function handleVerifyApiKey(
  request: Request,
  requestUrl: URL,
  env: Env
): Promise<Response> {
  if (!verifyAdminAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    let apiKey = extractApiKey(request, requestUrl);

    if (apiKey === null && request.method === "POST") {
      const body = (await request.json()) as { apiKey?: string };
      apiKey = body.apiKey ?? null;
    }

    if (apiKey === null) {
      return new Response("Missing API key", { status: 401 });
    }

    const key = `apiKey:${apiKey}`;
    const value = await env.GRADUAL_API_KEY.get(key);

    if (value === null) {
      return new Response(
        JSON.stringify({ valid: false, error: "API key not found" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const metadata = JSON.parse(value) as {
      projectId: string;
      orgId: string;
    };

    return new Response(
      JSON.stringify({
        valid: true,
        projectId: metadata.projectId,
        orgId: metadata.orgId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error verifying API key:", err);
    return new Response(
      err instanceof Error ? err.message : "Error verifying API key",
      { status: 500 }
    );
  }
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const requestUrl = new URL(request.url);
    const { pathname } = requestUrl;

    if (pathname === "/api/v1/snapshot") {
      const snapshotId = requestUrl.searchParams.get("id");
      return await handleSnapshot(snapshotId, env, request);
    }

    if (pathname === "/api/v1/submit-api-key") {
      return await handleSubmitApiKey(request, env);
    }

    if (pathname === "/api/v1/verify") {
      return await handleVerifyApiKey(request, requestUrl, env);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
