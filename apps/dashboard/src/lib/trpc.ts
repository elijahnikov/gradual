import * as Api from "@gradual/api";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
  unstable_localLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import { auth } from "@/auth/server";
import { env } from "@/env";
import { getBaseUrl } from "@/lib/url";

export const makeTRPCClient = createIsomorphicFn()
  .server(() => {
    return createTRPCClient<Api.AppRouter>({
      links: [
        unstable_localLink({
          router: Api.appRouter,
          transformer: SuperJSON,
          createContext: () => {
            const headers = new Headers(getRequestHeaders());
            headers.set("x-trpc-source", "tanstack-start-server");
            return Api.createTRPCContext({ auth, headers });
          },
        }),
      ],
    });
  })
  .client(() => {
    return createTRPCClient<Api.AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: SuperJSON,
            eventSourceOptions() {
              const headers = new Headers();
              headers.set("x-trpc-source", "tanstack-start-client");
              return headers;
            },
          }),
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: `${getBaseUrl()}/api/trpc`,
            headers() {
              const headers = new Headers();
              headers.set("x-trpc-source", "tanstack-start-client");
              return headers;
            },
          }),
        }),
      ],
    });
  });

export const { useTRPC, TRPCProvider } = createTRPCContext<Api.AppRouter>();
