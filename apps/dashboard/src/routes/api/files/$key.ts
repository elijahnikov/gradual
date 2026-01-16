import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/auth/server";
import { getSignedUrlForDownload } from "@/lib/utils/r2";

export const Route = createFileRoute("/api/files/$key")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { key } = params;

        try {
          const signedUrl = await getSignedUrlForDownload(key);
          return new Response(JSON.stringify({ url: signedUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to get file URL", error);

          const err = error as {
            name?: string;
            $metadata?: { httpStatusCode?: number };
          };
          if (
            err.name === "NoSuchKey" ||
            err.$metadata?.httpStatusCode === 404
          ) {
            return new Response(JSON.stringify({ error: "File not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({ error: "Failed to get file URL" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
