import { expo } from "@better-auth/expo";
import { db } from "@gradual/db/client";
import { checkout, polar, portal, usage } from "@polar-sh/better-auth";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";
import { polarClient } from "./polar";

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
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        use: [
          usage(),
          portal(),
          checkout({
            products: [
              {
                productId: "d9376414-2b89-48a8-bdec-7a97ba70e1c4",
                slug: "Enterprise",
              },
              {
                productId: "4e1c7974-4814-4d97-a117-aa72aad58771",
                slug: "Pro",
              },
              {
                productId: "fa8a8c64-d3ce-41f8-a28c-88073097e152",
                slug: "Free",
              },
            ],
            successUrl: process.env.POLAR_SUCCESS_URL,
            authenticatedUsersOnly: true,
          }),
        ],
      }),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: {},
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
