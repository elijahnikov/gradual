interface SnapshotJobMessage {
  orgId: string;
  projectId: string;
  environmentSlug: string;
}

interface ApiKeyMetadata {
  orgId: string;
  projectId: string;
}

interface Env {
  GRADUAL_API_KEY: KVNamespace;
  GRADUAL_SNAPSHOT: KVNamespace;
  SNAPSHOT_QUEUE: Queue<SnapshotJobMessage>;
  CLOUDFLARE_WORKERS_ADMIN_KEY: string;
  API_INTERNAL_URL: string;
}

function verifyAdminAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.slice(7);
  return token === env.CLOUDFLARE_WORKERS_ADMIN_KEY;
}

async function getApiKeyMetadata(
  apiKey: string,
  env: Env
): Promise<ApiKeyMetadata | null> {
  const value = await env.GRADUAL_API_KEY.get(`apiKey:${apiKey}`);
  if (!value) {
    return null;
  }
  return JSON.parse(value) as ApiKeyMetadata;
}

async function sdkInit(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await request.json()) as { apiKey?: string };
    if (!body.apiKey) {
      return Response.json(
        { valid: false, error: "Missing API key" },
        { status: 400 }
      );
    }

    const metadata = await getApiKeyMetadata(body.apiKey, env);
    if (!metadata) {
      return Response.json(
        { valid: false, error: "Invalid API key" },
        { status: 401 }
      );
    }

    return Response.json({ valid: true, ...metadata }, { status: 200 });
  } catch (err) {
    console.error("sdkInit error:", err);
    return Response.json(
      { valid: false, error: "Server error" },
      { status: 500 }
    );
  }
}

async function sdkGetSnapshot(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const metadata = await getApiKeyMetadata(apiKey, env);
  if (!metadata) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const url = new URL(request.url);
  const environment = url.searchParams.get("environment");
  if (!environment) {
    return Response.json(
      { error: "Missing environment parameter" },
      { status: 400 }
    );
  }

  const snapshotKey = `snapshot:${metadata.orgId}:${metadata.projectId}:${environment}`;
  const snapshot = await env.GRADUAL_SNAPSHOT.get(snapshotKey);
  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return new Response(snapshot, {
    headers: { "Content-Type": "application/json" },
  });
}

async function adminGetSnapshot(request: Request, env: Env): Promise<Response> {
  if (!verifyAdminAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response("Missing snapshot key", { status: 400 });
  }

  try {
    const snapshot = await env.GRADUAL_SNAPSHOT.get(key);
    if (!snapshot) {
      return new Response("Snapshot not found", { status: 404 });
    }
    return new Response(snapshot, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("adminGetSnapshot error:", err);
    return new Response(err instanceof Error ? err.message : "KV error", {
      status: 500,
    });
  }
}

async function adminQueueSnapshot(
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
    const body = (await request.json()) as SnapshotJobMessage;
    if (!(body.orgId && body.projectId && body.environmentSlug)) {
      return new Response(
        "Missing required fields: orgId, projectId, environmentSlug",
        { status: 400 }
      );
    }

    await env.SNAPSHOT_QUEUE.send({
      orgId: body.orgId,
      projectId: body.projectId,
      environmentSlug: body.environmentSlug,
    });

    return Response.json({ success: true, message: "Snapshot job queued" });
  } catch (err) {
    console.error("adminQueueSnapshot error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error queuing snapshot job",
      { status: 500 }
    );
  }
}

async function adminPublishSnapshot(
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
    const body = (await request.json()) as { key: string; snapshot: unknown };
    if (!(body.key && body.snapshot)) {
      return new Response("Missing required fields: key, snapshot", {
        status: 400,
      });
    }

    await env.GRADUAL_SNAPSHOT.put(body.key, JSON.stringify(body.snapshot));
    return Response.json({ success: true, key: body.key });
  } catch (err) {
    console.error("adminPublishSnapshot error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error publishing snapshot",
      { status: 500 }
    );
  }
}

async function adminBuildSnapshotSync(
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
    const body = (await request.json()) as SnapshotJobMessage;
    if (!(body.orgId && body.projectId && body.environmentSlug)) {
      return new Response(
        "Missing required fields: orgId, projectId, environmentSlug",
        { status: 400 }
      );
    }

    const { orgId, projectId, environmentSlug } = body;
    const apiUrl = `${env.API_INTERNAL_URL}/api/trpc/snapshots.buildForWorker`;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        json: {
          orgId,
          projectId,
          environmentSlug,
          workerSecret: env.CLOUDFLARE_WORKERS_ADMIN_KEY,
        },
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("adminBuildSnapshotSync API error:", errorText);
      return new Response(errorText, { status: response.status });
    }

    const result = (await response.json()) as {
      result: { data: { json: unknown } };
    };
    const snapshot = result.result.data.json;
    const key = `snapshot:${orgId}:${projectId}:${environmentSlug}`;

    await env.GRADUAL_SNAPSHOT.put(key, JSON.stringify(snapshot));
    return Response.json({ success: true, key });
  } catch (err) {
    console.error("adminBuildSnapshotSync error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error building snapshot",
      { status: 500 }
    );
  }
}

async function adminSubmitApiKey(
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
    return Response.json({ success: true, message: "API key stored" });
  } catch (err) {
    console.error("adminSubmitApiKey error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error storing API key",
      { status: 500 }
    );
  }
}

async function adminVerifyApiKey(
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
    const body = (await request.json()) as { apiKey?: string };
    if (!body.apiKey) {
      return new Response("Missing API key", { status: 400 });
    }

    const metadata = await getApiKeyMetadata(body.apiKey, env);
    if (!metadata) {
      return Response.json(
        { valid: false, error: "API key not found" },
        { status: 401 }
      );
    }

    return Response.json({ valid: true, ...metadata });
  } catch (err) {
    console.error("adminVerifyApiKey error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error verifying API key",
      { status: 500 }
    );
  }
}

async function adminRevokeApiKey(
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
    const body = (await request.json()) as { apiKey?: string };
    if (!body.apiKey) {
      return new Response("Missing API key", { status: 400 });
    }

    await env.GRADUAL_API_KEY.delete(`apiKey:${body.apiKey}`);
    return Response.json({ success: true, message: "API key revoked" });
  } catch (err) {
    console.error("adminRevokeApiKey error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error revoking API key",
      { status: 500 }
    );
  }
}

async function processSnapshotQueue(
  batch: MessageBatch<unknown>,
  env: Env
): Promise<void> {
  const messages = batch.messages as Message<SnapshotJobMessage>[];

  for (const msg of messages) {
    const { orgId, projectId, environmentSlug } = msg.body;

    try {
      const apiUrl = `${env.API_INTERNAL_URL}/api/trpc/snapshots.buildForWorker`;

      const response = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({
          json: {
            orgId,
            projectId,
            environmentSlug,
            workerSecret: env.CLOUDFLARE_WORKERS_ADMIN_KEY,
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("processSnapshotQueue API error:", errorText);
        msg.retry();
        continue;
      }

      const result = (await response.json()) as {
        result: { data: { json: unknown } };
      };
      const snapshot = result.result.data.json;
      const key = `snapshot:${orgId}:${projectId}:${environmentSlug}`;

      await env.GRADUAL_SNAPSHOT.put(key, JSON.stringify(snapshot));
      msg.ack();
    } catch (err) {
      console.error("processSnapshotQueue error:", err);
      msg.retry();
    }
  }
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    const isSDKRoute =
      pathname === "/api/v1/sdk/init" || pathname === "/api/v1/sdk/snapshot";

    if (isSDKRoute && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    let response: Response;

    switch (pathname) {
      case "/api/v1/sdk/init":
        response = await sdkInit(request, env);
        break;
      case "/api/v1/sdk/snapshot":
        response = await sdkGetSnapshot(request, env);
        break;
      case "/api/v1/snapshot":
        return adminGetSnapshot(request, env);
      case "/api/v1/queue-snapshot":
        return adminQueueSnapshot(request, env);
      case "/api/v1/publish-snapshot":
        return adminPublishSnapshot(request, env);
      case "/api/v1/build-snapshot-sync":
        return adminBuildSnapshotSync(request, env);
      case "/api/v1/submit-api-key":
        return adminSubmitApiKey(request, env);
      case "/api/v1/verify":
        return adminVerifyApiKey(request, env);
      case "/api/v1/revoke-api-key":
        return adminRevokeApiKey(request, env);
      default:
        return new Response("Not found", { status: 404 });
    }

    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  },

  queue(batch, env): Promise<void> {
    return processSnapshotQueue(batch, env);
  },
} satisfies ExportedHandler<Env>;
