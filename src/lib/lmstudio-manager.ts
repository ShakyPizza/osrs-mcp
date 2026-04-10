// Explicit model lifecycle management for LM Studio.
// Pre-loads the model before the first inference call in a session so there
// is no JIT cold-start delay. Skips the load request if the model is already
// known to be loaded. LM Studio's own idle TTL handles unloading.

const BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://localhost:1234";

// Track models we have already loaded in this process lifetime.
const loaded = new Set<string>();

export async function ensureModelLoaded(modelId: string): Promise<void> {
  if (loaded.has(modelId)) return;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/v1/models/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Loading a large model can take 30–60 s.
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({ model: modelId }),
    });
  } catch (err) {
    // LM Studio not reachable — let the inference call fail with its own error.
    return;
  }

  if (res.ok) {
    loaded.add(modelId);
    return;
  }

  const body = await res.text().catch(() => "");

  // 409 / "already loaded" is fine — mark it and move on.
  if (res.status === 409 || body.toLowerCase().includes("already")) {
    loaded.add(modelId);
    return;
  }

  // Any other error: log to stderr and let the inference call surface the real failure.
  process.stderr.write(`[lmstudio] load warning: ${res.status} ${body}\n`);
}

// Call this when a model is known to have been unloaded (e.g. if you detect
// a "no models loaded" inference error) so the next call re-triggers the load.
export function invalidateModel(modelId: string): void {
  loaded.delete(modelId);
}
