import { eq } from "@gradual/db";
import { db } from "@gradual/db/client";
import { user } from "@gradual/db/schema";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/auth/server";
import { getPublicUrl, uploadFile } from "@/lib/utils/r2";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session?.user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const formData = await request.formData();
          const file = formData.get("file") as File | null;

          if (!file) {
            return new Response(JSON.stringify({ error: "No file provided" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!file.type.startsWith("image/")) {
            return new Response(
              JSON.stringify({ error: "File must be an image" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            return new Response(
              JSON.stringify({ error: "File size must be less than 5MB" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const timestamp = Date.now();
          const fileExtension = file.name.split(".").pop() || "jpg";
          const key = `avatars/${session.user.id}/${timestamp}.${fileExtension}`;

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          await uploadFile(buffer, key, file.type);

          const publicUrl = await getPublicUrl(key);

          await db
            .update(user)
            .set({ image: publicUrl })
            .where(eq(user.id, session.user.id));

          return new Response(JSON.stringify({ url: publicUrl, key }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to upload file", error);
          return new Response(
            JSON.stringify({ error: "Failed to upload file" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
