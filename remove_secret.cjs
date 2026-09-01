const fs = require('fs');

let apiCode = fs.readFileSync('src/lib/api.functions.ts', 'utf8');

const replacementKey = `const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Required server secret is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),`;

apiCode = apiCode.replace(/const key = await crypto\.subtle\.importKey\([\s\n]+"raw",[\s\n]+new TextEncoder\(\)\.encode\(process\.env\["SUPABASE_SERVICE_ROLE_KEY"\] \|\| "fallback_secret_key"\),/g, replacementKey);

fs.writeFileSync('src/lib/api.functions.ts', apiCode);
console.log('Done');
