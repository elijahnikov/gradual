import { createUpdateSchema } from "@gradual/db";
import { user } from "@gradual/db/schema";
import type z from "zod/v4";

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export const updateUserSchema = createUpdateSchema(user)
  .omit({
    id: true,
    createdAt: true,
    emailVerified: true,
    email: true,
    updatedAt: true,
  })
  .partial();
