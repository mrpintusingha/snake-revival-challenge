const fs = require('fs');

// 1. Fix src/components/game/SnakeGame.tsx Props
let snakeGame = fs.readFileSync('src/components/game/SnakeGame.tsx', 'utf8');
snakeGame = snakeGame.replace(/type Props = \{\n\s+attemptNumber: number;/g, `type Props = {\n  sessionToken: string;\n  initialCheckpoint: string;\n  attemptNumber: number;`);
fs.writeFileSync('src/components/game/SnakeGame.tsx', snakeGame);

// 2. Fix api.functions.ts
let apiFuncs = fs.readFileSync('src/lib/api.functions.ts', 'utf8');
apiFuncs = apiFuncs.replace(/process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\| "fallback_secret_key"/g, `process.env["SUPABASE_SERVICE_ROLE_KEY"] || "fallback_secret_key"`);
apiFuncs = apiFuncs.replace(/JSON\.parse\(atob\(payload\)\)/g, `JSON.parse(atob(payload!))`);

// Ensure startAttempt returns initialCheckpoint
const returnBlock = `const initialCheckpoint = await signCheckpointData({ t: token, seq: 0, f: 0, d: 0 });
    return {
      sessionToken: token,
      initialCheckpoint,
      attemptNumber: attemptData.attempt_number,
      attemptsRemaining: attemptData.attempts_remaining,
      challengeCode: attemptData.challenge_code as string | null,
    };`;
apiFuncs = apiFuncs.replace(/return \{\n\s+sessionToken: token,\n\s+attemptNumber: attemptData\.attempt_number,\n\s+attemptsRemaining: attemptData\.attempts_remaining,\n\s+challengeCode: attemptData\.challenge_code as string \| null,\n\s+\};/g, returnBlock);
fs.writeFileSync('src/lib/api.functions.ts', apiFuncs);

// 3. Fix play.tsx
let playTsx = fs.readFileSync('src/routes/play.tsx', 'utf8');
if (!playTsx.includes('const [initialCheckpoint, setInitialCheckpoint] = useState("");')) {
  playTsx = playTsx.replace(/const \[sessionToken, setSessionToken\] = useState\(""\);/g, `const [sessionToken, setSessionToken] = useState("");\n  const [initialCheckpoint, setInitialCheckpoint] = useState("");`);
}

// Ensure onGameOver signature inside PlayPage handles checkpoint properly when calling submitScore
playTsx = playTsx.replace(/const res = await fnSubmit\(\{[\s\n]*data: \{[\s\n]*sessionToken,[\s\n]*foods: r\.foods,[\s\n]*durationMs: r\.durationMs,[\s\n]*reportedScore: r\.score,[\s\n]*\},/g, `const res = await fnSubmit({\n          data: {\n            sessionToken,\n            foods: r.foods,\n            durationMs: r.durationMs,\n            reportedScore: r.score,\n            checkpoint: r.checkpoint,\n          },`);
fs.writeFileSync('src/routes/play.tsx', playTsx);

// 4. Fix index.tsx parameter types
let indexTsx = fs.readFileSync('src/routes/index.tsx', 'utf8');
indexTsx = indexTsx.replace(/<form\n\s+onSubmit=\{\(e\) => \{/g, `<form\n                onSubmit={(e: React.FormEvent) => {`);
indexTsx = indexTsx.replace(/rows\.map\(\(row, i\) => \(/g, `rows.map((row: any, i: number) => (`);
fs.writeFileSync('src/routes/index.tsx', indexTsx);

console.log('Fixed all files');
