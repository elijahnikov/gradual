import { eq } from "@gradual/db";
import { user } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedTRPCContext } from "../../trpc";
import type {
  ListSubscriptionsByOrganizationIdInput,
  UpdateUserInput,
} from "./auth.schemas";

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
      hasOnboarded: input.hasOnboarded,
      onboardingStep: input.onboardingStep,
      defaultOrganizationId: input.defaultOrganizationId,
    },
    headers: ctx.headers,
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

export const listSubscriptionsByOrganizationId = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: ListSubscriptionsByOrganizationIdInput;
}) => {
  const subscriptions = await ctx.authApi.subscriptions({
    query: {
      page: 1,
      limit: 10,
      status: "active",
      referenceId: input.organizationId,
    },
    asResponse: true,
    headers: ctx.headers,
  });
  const result = await subscriptions.json();
  return result;
};
