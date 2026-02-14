import { polarClient } from "@polar-sh/better-auth/client";
import {
  deviceAuthorizationClient,
  emailOTPClient,
  lastLoginMethodClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    polarClient(),
    emailOTPClient(),
    organizationClient(),
    lastLoginMethodClient(),
    deviceAuthorizationClient(),
  ],
});
