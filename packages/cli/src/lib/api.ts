import SuperJSON from "superjson";

const TRAILING_SLASH = /\/$/;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export class GradualApi {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(TRAILING_SLASH, "");
    this.token = token;
  }

  async query<T>(path: string, input?: unknown): Promise<T> {
    let url = `${this.baseUrl}/api/trpc/${path}`;
    if (input !== undefined) {
      const serialized = SuperJSON.serialize(input);
      url += `?input=${encodeURIComponent(JSON.stringify(serialized))}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<T>(response);
  }

  async mutate<T>(path: string, input?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/trpc/${path}`;
    const body =
      input !== undefined
        ? JSON.stringify(SuperJSON.serialize(input))
        : undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      let code = "UNKNOWN";
      try {
        const errorBody = (await response.json()) as {
          error?: { message?: string; code?: string };
        };
        if (errorBody.error?.message) {
          message = errorBody.error.message;
        }
        if (errorBody.error?.code) {
          code = errorBody.error.code;
        }
      } catch {
        // ignore parse errors
      }

      if (response.status === 401) {
        throw new ApiError(
          "Session expired. Run `gradual login` to re-authenticate.",
          "UNAUTHORIZED",
          401
        );
      }

      throw new ApiError(message, code, response.status);
    }

    const json = (await response.json()) as {
      result: { data: unknown };
    };

    return SuperJSON.deserialize(
      json.result.data as Parameters<typeof SuperJSON.deserialize>[0]
    ) as T;
  }
}
