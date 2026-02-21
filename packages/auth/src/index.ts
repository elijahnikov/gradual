import { expo } from "@better-auth/expo";
import { db } from "@gradual/db/client";
import { checkout, polar, portal, usage } from "@polar-sh/better-auth";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  bearer,
  deviceAuthorization,
  emailOTP,
  lastLoginMethod,
  oAuthProxy,
  organization,
} from "better-auth/plugins";
import { Resend } from "resend";
import { authEnv } from "../env";
import { ac, admin, member, owner, viewer } from "./permissions";
import { polarClient } from "./polar";

export const resend = new Resend(authEnv().AUTH_RESEND_KEY as string);

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    appName: "Gradual",
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
      lastLoginMethod(),
      organization({
        ac,
        roles: {
          owner,
          admin,
          member,
          viewer,
        },
      }),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (type === "sign-in") {
            const { error } = await resend.emails.send({
              from: "Gradual <noreply@notifications.gradual.so>",
              to: [email],
              template: {
                id: "email-otp",
                variables: {
                  otp,
                },
              },
            });
            if (error) {
              console.error("Error sending email", error);
            }
          } else if (type === "email-verification") {
            console.log("email-verification", email, otp);
          }
        },
      }),
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      bearer(),
      deviceAuthorization({
        verificationUri: "/device",
      }),
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        use: [
          usage(),
          portal(),
          checkout({
            products: [
              {
                productId: "702b22c1-f1f7-4aa8-828b-56e322f9a7c2",
                slug: "Enterprise",
              },
              {
                productId: "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864",
                slug: "Pro",
              },
              {
                productId: "89d57bae-1a06-45bf-9f6a-bf437862e775",
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
