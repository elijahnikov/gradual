import chalk from "chalk";
import open from "open";

interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

interface TokenResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface TokenErrorResponse {
  error: string;
  errorDescription?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deviceLogin(
  dashboardUrl: string
): Promise<TokenResponse> {
  const codeResponse = await fetch(
    `${dashboardUrl}/api/auth/device/authorize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "gradual-cli",
      }),
    }
  );

  if (!codeResponse.ok) {
    const text = await codeResponse.text();
    throw new Error(`Failed to request device code: ${text}`);
  }

  const codeData = (await codeResponse.json()) as DeviceCodeResponse;

  console.log();
  console.log(
    `  Your authorization code: ${chalk.bold.cyan(codeData.userCode)}`
  );
  console.log();
  console.log(`  ${chalk.dim("Opening browser to verify...")}`);
  console.log();

  await open(codeData.verificationUriComplete);

  let pollInterval = codeData.interval * 1000;
  const deadline = Date.now() + codeData.expiresIn * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    const tokenResponse = await fetch(
      `${dashboardUrl}/api/auth/device/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceCode: codeData.deviceCode,
          clientId: "gradual-cli",
        }),
      }
    );

    if (tokenResponse.ok) {
      return (await tokenResponse.json()) as TokenResponse;
    }

    const error = (await tokenResponse.json()) as TokenErrorResponse;

    if (error.error === "authorization_pending") {
      continue;
    }

    if (error.error === "slow_down") {
      pollInterval += 5000;
      continue;
    }

    if (error.error === "expired_token") {
      throw new Error("Device code expired. Please try again.");
    }

    throw new Error(
      error.errorDescription ?? error.error ?? "Device authorization failed"
    );
  }

  throw new Error("Device code expired. Please try again.");
}
