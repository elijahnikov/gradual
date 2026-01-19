import { db } from "@gradual/db/client";

import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { plugins } from "./plugins";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    baseURL: options.baseUrl,
    secret: options.secret,
    user: {
      additionalFields: {
        hasOnboarded: {
          type: "boolean",
          defaultValue: false,
          required: true,
        },
        onboardingStep: {
          type: "number",
          defaultValue: 0,
          required: true,
        },
        defaultOrganizationId: {
          type: "string",
          required: false,
          defaultValue: null,
        },
      },
    },
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      ...plugins,
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        redirectURI: `${options.baseUrl}/api/auth/callback/github`,
      },
      google: {
        prompt: "select_account",
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirectURI: `${options.baseUrl}/api/auth/callback/google`,
      },
      linear: {
        clientId: process.env.LINEAR_CLIENT_ID as string,
        clientSecret: process.env.LINEAR_CLIENT_SECRET as string,
        scope: ["read", "write"],
      },
    },
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
