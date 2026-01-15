import { createFileRoute } from "@tanstack/react-router";
import { deleteFile, getSignedUrlForDownload, listFiles } from "@/lib/utils/r2";

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { prefix } = await request.json();
        const files = await listFiles(prefix);
        return new Response(JSON.stringify(files), { status: 200 });
      },
      POST: async ({ request }) => {
        const { key } = await request.json();
        const file = await getSignedUrlForDownload(key);
        return new Response(JSON.stringify(file), { status: 200 });
      },
      DELETE: async ({ request }) => {
        const { key } = await request.json();
        try {
          const file = await deleteFile(key);
          return new Response(JSON.stringify(file), { status: 200 });
        } catch (error) {
          console.error("Failed to delete file", error);
          return new Response(
            JSON.stringify({ error: "Failed to delete file" }),
            { status: 500 }
          );
        }
      },
    },
  },
});
