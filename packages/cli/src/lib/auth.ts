import chalk from "chalk";
import open from "open";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

interface SessionResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: {
    token: string;
    expiresAt: string;
  };
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deviceLogin(dashboardUrl: string): Promise<LoginResult> {
  const codeResponse = await fetch(`${dashboardUrl}/api/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: "gradual-cli",
    }),
  });

  if (!codeResponse.ok) {
    const text = await codeResponse.text();
    throw new Error(`Failed to request device code: ${text}`);
  }

  const codeData = (await codeResponse.json()) as DeviceCodeResponse;

  const verifyUrl =
    codeData.verification_uri_complete || codeData.verification_uri;

  console.log();
  console.log(
    `  Your authorization code: ${chalk.bold.cyan(codeData.user_code)}`
  );
  console.log();
  console.log(`  ${chalk.dim(`Verify at: ${verifyUrl}`)}`);
  console.log();

  await open(verifyUrl);

  let pollInterval = codeData.interval * 1000;
  const deadline = Date.now() + codeData.expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    const tokenResponse = await fetch(`${dashboardUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: codeData.device_code,
        client_id: "gradual-cli",
      }),
    });

    if (tokenResponse.ok) {
      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
      };

      const sessionResponse = await fetch(
        `${dashboardUrl}/api/auth/get-session`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Failed to fetch session after authorization");
      }

      const session = (await sessionResponse.json()) as SessionResponse;

      return {
        token: tokenData.access_token,
        expiresAt: session.session.expiresAt,
        user: session.user,
      };
    }

    const error = (await tokenResponse.json()) as TokenErrorResponse;

    if (error.error === "authorization_pending") {
      continue;
    }

    if (error.error === "slow_down") {
      pollInterval += 5000;
      continue;
    }

    if (error.error === "access_denied") {
      throw new Error("Authorization was denied.");
    }

    if (error.error === "expired_token") {
      throw new Error("Device code expired. Please try again.");
    }

    throw new Error(
      error.error_description ?? error.error ?? "Device authorization failed"
    );
  }

  throw new Error("Device code expired. Please try again.");
}
