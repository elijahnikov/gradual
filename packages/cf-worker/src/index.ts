interface SnapshotJobMessage {
  orgId: string;
  projectId: string;
  environmentSlug: string;
}

interface Env {
  GRADUAL_API_KEY: KVNamespace;
  GRADUAL_SNAPSHOT: KVNamespace;
  SNAPSHOT_QUEUE: Queue<SnapshotJobMessage>;
  CLOUDFLARE_WORKERS_ADMIN_KEY: string;
  API_INTERNAL_URL: string;
}

async function handleSnapshot(request: Request, env: Env): Promise<Response> {
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

async function handleQueueSnapshot(
  request: Request,
  env: Env
): Promise<Response> {
  console.log("[Worker] Received queue-snapshot request");

  if (!verifyAdminAuth(request, env)) {
    console.log("[Worker] Unauthorized - invalid admin key");
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await request.json()) as SnapshotJobMessage;
    console.log("[Worker] Queue request body:", JSON.stringify(body));

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

    console.log("[Worker] Message sent to queue");
    return new Response(
      JSON.stringify({ success: true, message: "Snapshot job queued" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[Worker] Error queuing snapshot job:", err);
    return new Response(
      err instanceof Error ? err.message : "Error queuing snapshot job",
      { status: 500 }
    );
  }
}

async function handlePublishSnapshot(
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
      key: string;
      snapshot: unknown;
    };

    if (!(body.key && body.snapshot)) {
      return new Response("Missing required fields: key, snapshot", {
        status: 400,
      });
    }

    await env.GRADUAL_SNAPSHOT.put(body.key, JSON.stringify(body.snapshot));

    return new Response(JSON.stringify({ success: true, key: body.key }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error publishing snapshot:", err);
    return new Response(
      err instanceof Error ? err.message : "Error publishing snapshot",
      { status: 500 }
    );
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

async function handleVerifyApiKey(
  request: Request,
  env: Env
): Promise<Response> {
  if (!verifyAdminAuth(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed. Use POST.", { status: 405 });
  }

  try {
    const body = (await request.json()) as { apiKey?: string };
    const apiKey = body.apiKey ?? null;

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

async function handleRevokeApiKey(
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
    const apiKey = body.apiKey ?? null;

    if (apiKey === null) {
      return new Response("Missing API key", { status: 400 });
    }

    const key = `apiKey:${apiKey}`;
    await env.GRADUAL_API_KEY.delete(key);

    return new Response(
      JSON.stringify({ success: true, message: "API key revoked" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error revoking API key:", err);
    return new Response(
      err instanceof Error ? err.message : "Error revoking API key",
      { status: 500 }
    );
  }
}

async function handleBuildSnapshotSync(
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
    const url = `${env.API_INTERNAL_URL}/api/trpc/snapshots.buildForWorker`;
    console.log(
      `[Sync] Building snapshot: ${orgId}/${projectId}/${environmentSlug}`
    );
    console.log(`[Sync] Calling API: ${url}`);

    const response = await fetch(url, {
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
      console.error(`[Sync] API error: ${errorText}`);
      return new Response(errorText, { status: response.status });
    }

    const result = (await response.json()) as { result: { data: unknown } };
    const snapshot = result.result.data;

    const key = `snapshot:${orgId}:${projectId}:${environmentSlug}`;
    await env.GRADUAL_SNAPSHOT.put(key, JSON.stringify(snapshot));

    console.log(`[Sync] Snapshot published: ${key}`);
    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Sync] Error:", err);
    return new Response(
      err instanceof Error ? err.message : "Error building snapshot",
      { status: 500 }
    );
  }
}

// SDK Endpoints (no admin auth - uses SDK API key)

async function handleSdkInit(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await request.json()) as { apiKey?: string };
    const apiKey = body.apiKey;

    if (!apiKey) {
      return Response.json(
        { valid: false, error: "Missing API key" },
        { status: 400 }
      );
    }

    const value = await env.GRADUAL_API_KEY.get(`apiKey:${apiKey}`);
    if (!value) {
      return Response.json(
        { valid: false, error: "Invalid API key" },
        { status: 401 }
      );
    }

    const metadata = JSON.parse(value) as { orgId: string; projectId: string };
    return Response.json({ valid: true, ...metadata }, { status: 200 });
  } catch (err) {
    console.error("[SDK Init] Error:", err);
    return Response.json(
      { valid: false, error: "Server error" },
      { status: 500 }
    );
  }
}

async function handleSdkSnapshot(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }
  const apiKey = authHeader.slice(7);

  // Verify API key and get org/project
  const keyData = await env.GRADUAL_API_KEY.get(`apiKey:${apiKey}`);
  if (!keyData) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { orgId, projectId } = JSON.parse(keyData) as {
    orgId: string;
    projectId: string;
  };

  // Get environment from query param
  const url = new URL(request.url);
  const environment = url.searchParams.get("environment");
  if (!environment) {
    return Response.json(
      { error: "Missing environment parameter" },
      { status: 400 }
    );
  }

  // Fetch snapshot from KV
  const snapshotKey = `snapshot:${orgId}:${projectId}:${environment}`;
  const snapshot = await env.GRADUAL_SNAPSHOT.get(snapshotKey);
  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return new Response(snapshot, {
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const requestUrl = new URL(request.url);
    const { pathname } = requestUrl;

    if (pathname === "/api/v1/snapshot") {
      return await handleSnapshot(request, env);
    }

    if (pathname === "/api/v1/queue-snapshot") {
      return await handleQueueSnapshot(request, env);
    }

    if (pathname === "/api/v1/publish-snapshot") {
      return await handlePublishSnapshot(request, env);
    }

    if (pathname === "/api/v1/submit-api-key") {
      return await handleSubmitApiKey(request, env);
    }

    if (pathname === "/api/v1/verify") {
      return await handleVerifyApiKey(request, env);
    }

    if (pathname === "/api/v1/revoke-api-key") {
      return await handleRevokeApiKey(request, env);
    }

    // Direct snapshot build (bypasses queue, for testing)
    if (pathname === "/api/v1/build-snapshot-sync") {
      return await handleBuildSnapshotSync(request, env);
    }

    // SDK endpoints (no admin auth)
    if (pathname === "/api/v1/sdk/init") {
      return await handleSdkInit(request, env);
    }

    if (pathname === "/api/v1/sdk/snapshot") {
      return await handleSdkSnapshot(request, env);
    }

    return new Response("Not found", { status: 404 });
  },

  async queue(batch, env): Promise<void> {
    const messages = batch.messages as Message<SnapshotJobMessage>[];
    console.log(
      `[Worker Queue] Processing batch of ${messages.length} messages`
    );

    for (const msg of messages) {
      const { orgId, projectId, environmentSlug } = msg.body;
      console.log(
        `[Worker Queue] Processing: ${orgId}/${projectId}/${environmentSlug}`
      );

      try {
        const url = `${env.API_INTERNAL_URL}/api/trpc/snapshots.buildForWorker`;
        console.log(`[Worker Queue] Calling API: ${url}`);

        const response = await fetch(url, {
          method: "POST",
          body: JSON.stringify({
            json: {
              orgId,
              projectId,
              environmentSlug,
              workerSecret: env.CLOUDFLARE_WORKERS_ADMIN_KEY,
            },
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to build snapshot: ${errorText}`);
          msg.retry();
          continue;
        }

        const result = (await response.json()) as { result: { data: unknown } };
        const snapshot = result.result.data;

        const key = `snapshot:${orgId}:${projectId}:${environmentSlug}`;
        await env.GRADUAL_SNAPSHOT.put(key, JSON.stringify(snapshot));

        console.log(`Snapshot published: ${key}`);
        msg.ack();
      } catch (err) {
        console.error("Error processing snapshot job:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
