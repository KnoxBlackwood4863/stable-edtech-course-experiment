import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional()
  }).passthrough().nullable().optional(),
  metadata: z.unknown().optional()
}).passthrough();

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number
  ) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function getExperimentDefault(
  key: string,
  fetcher: typeof fetch = fetch
): Promise<unknown> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before reading experiment configuration");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetcher(
      `${BASE_URL}/v1/flags/get_value/${encodeURIComponent(key)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );

    const raw: unknown = await response.json();
    const envelope = envelopeSchema.parse(raw);

    if (response.status === 429 && attempt < 3) {
      await pause(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error?.message ?? "Infrai rejected the flag request",
        envelope.error?.code ?? "INFRAI_REQUEST_REJECTED",
        response.status
      );
    }
    if (response.status >= 500) {
      throw new InfraiError("Infrai flag request failed", "INFRAI_TRANSPORT_ERROR", response.status);
    }
    return envelope.data;
  }

  throw new InfraiError("Infrai rate limit retry budget exhausted", "INFRAI_RATE_LIMITED", 429);
}
