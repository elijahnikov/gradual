import { expo } from "@better-auth/expo";
import type { BetterAuthPlugin } from "better-auth";
import { lastLoginMethod, organization } from "better-auth/plugins";
import { ac, admin, member, owner, viewer } from "../permissions";
import { polarPlugin as polar } from "./polar";
import { emailOTPPlugin as emailOTP } from "./resend";

export const plugins: BetterAuthPlugin[] = [
  emailOTP,
  polar,
  expo(),
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
];
