const fs = require('fs');

let apiCode = fs.readFileSync('src/lib/api.functions.ts', 'utf8');

// Add the checkpoint helpers at the top after utils:
const checkpointHelpers = `
async function signCheckpointData(payloadObj: { t: string; seq: number; f: number; d: number }): Promise<string> {
  const payload = btoa(JSON.stringify(payloadObj));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_key"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return \`\${payload}.\${sig}\`;
}

async function verifyCheckpointData(token: string) {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error("Invalid checkpoint format");
  const [payload, sig] = parts;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback_secret_key"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedSig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (sig !== expectedSig) throw new Error("Checkpoint signature mismatch");
  return JSON.parse(atob(payload)) as { t: string; seq: number; f: number; d: number };
}
`;

if (!apiCode.includes('signCheckpointData')) {
  apiCode = apiCode.replace('/* ------------------------------------------------------- public read data */', checkpointHelpers + '\n/* ------------------------------------------------------- public read data */');
}

// Update startAttempt to return initialCheckpoint
apiCode = apiCode.replace(/return {\n\s+sessionToken: token,\n\s+attemptNumber/g, `const initialCheckpoint = await signCheckpointData({ t: token, seq: 0, f: 0, d: 0 });\n    return {\n      sessionToken: token,\n      initialCheckpoint,\n      attemptNumber`);

// Add syncCheckpoint function
const syncCheckpointCode = `
export const syncCheckpoint = createServerFn({ method: "POST" })
  .validator((i: { sessionToken: string; checkpoint: string; foods: number; durationMs: number }) =>
    z
      .object({
        sessionToken: z.string().min(16).max(200),
        checkpoint: z.string().min(10),
        foods: z.number().int().min(0).max(5000),
        durationMs: z.number().int().min(0).max(3 * 3600 * 1000),
      })
      .parse(i)
  )
  .handler(async ({ data }) => {
    const prev = await verifyCheckpointData(data.checkpoint);
    if (prev.t !== data.sessionToken) throw new Error("Wrong session checkpoint");

    const foodsDelta = data.foods - prev.f;
    const timeDelta = data.durationMs - prev.d;

    if (foodsDelta < 1) throw new Error("No foods eaten");
    if (foodsDelta > 30) throw new Error("Too many foods since last checkpoint"); 
    if (timeDelta < foodsDelta * MIN_MS_PER_FOOD * 0.6) throw new Error("Too fast");

    return {
      checkpoint: await signCheckpointData({
        t: data.sessionToken,
        seq: prev.seq + 1,
        f: data.foods,
        d: data.durationMs
      })
    };
  });
`;

if (!apiCode.includes('syncCheckpoint = createServerFn')) {
  apiCode = apiCode.replace('export const submitScore =', syncCheckpointCode + '\nexport const submitScore =');
}

// Update submitScore validator
apiCode = apiCode.replace(/sessionToken: string; foods: number; durationMs: number; reportedScore: number \}\)/g, `sessionToken: string; foods: number; durationMs: number; reportedScore: number; checkpoint: string })`);
apiCode = apiCode.replace(/reportedScore: z\.number\(\)\.int\(\)\.min\(0\)\.max\(10_000_000\),/g, `reportedScore: z.number().int().min(0).max(10_000_000),\n        checkpoint: z.string().min(10),`);

// Update submitScore logic
apiCode = apiCode.replace(/const plausible =\n\s+!expired &&\n\s+data\.durationMs >= foods \* MIN_MS_PER_FOOD &&\n\s+elapsed >= foods \* MIN_MS_PER_FOOD \* 0\.7 &&\n\s+data\.reportedScore === score;/g, `let plausible = true;
    try {
      const prev = await verifyCheckpointData(data.checkpoint);
      if (prev.t !== data.sessionToken) throw new Error("Wrong session checkpoint");

      const foodsDelta = data.foods - prev.f;
      const timeDelta = data.durationMs - prev.d;

      if (foodsDelta < 0 || foodsDelta > 30) plausible = false;
      if (timeDelta < foodsDelta * MIN_MS_PER_FOOD * 0.6) plausible = false;
    } catch {
      plausible = false;
    }

    if (expired) plausible = false;
    if (data.durationMs < foods * MIN_MS_PER_FOOD) plausible = false;
    if (elapsed < foods * MIN_MS_PER_FOOD * 0.7) plausible = false;
    if (data.reportedScore !== score) plausible = false;`);

fs.writeFileSync('src/lib/api.functions.ts', apiCode);
console.log('api.functions.ts updated');
