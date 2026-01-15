import { eq } from "@gradual/db";
import { user } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedTRPCContext } from "../../trpc";
import type { UpdateUserInput } from "./auth.schemas";

export const updateUser = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: UpdateUserInput;
}) => {
  const [updatedUser] = await ctx.db
    .update(user)
    .set({
      ...input,
    })
    .where(eq(user.id, ctx.session.user.id))
    .returning();

  await ctx.authApi.updateUser({
    body: {
      ...(input.onboardingStep ? { onboardingStep: input.onboardingStep } : {}),
      ...(input.hasOnboarded ? { hasOnboarded: input.hasOnboarded } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.image ? { image: input.image } : {}),
    },
  });

  return updatedUser;
};

export const getUserOnboardingStatus = async ({
  ctx,
}: {
  ctx: ProtectedTRPCContext;
}) => {
  const [foundUser] = await ctx.db
    .select()
    .from(user)
    .where(eq(user.id, ctx.session.user.id))
    .limit(1);

  if (!foundUser) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return {
    onboardingStep: foundUser?.onboardingStep,
    hasOnboarded: foundUser?.hasOnboarded,
  };
};
