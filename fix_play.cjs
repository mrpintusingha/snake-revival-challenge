const fs = require('fs');

let playCode = fs.readFileSync('src/routes/play.tsx', 'utf8');

// play.tsx: add initialCheckpoint to beginAttempt
playCode = playCode.replace(/const \[sessionToken, setSessionToken\] = useState<string \| null>\(null\);/g, `const [sessionToken, setSessionToken] = useState<string | null>(null);\n  const [initialCheckpoint, setInitialCheckpoint] = useState<string | null>(null);`);

playCode = playCode.replace(/setSessionToken\(res\.sessionToken\);/g, `setSessionToken(res.sessionToken);\n      setInitialCheckpoint(res.initialCheckpoint);`);

// pass initialCheckpoint to SnakeGame
playCode = playCode.replace(/<SnakeGame\n\s+attemptNumber=\{attemptNumber\}\n\s+attemptsRemaining=\{attemptsRemaining\}\n\s+onGameOver/g, `<SnakeGame\n            sessionToken={sessionToken}\n            initialCheckpoint={initialCheckpoint!}\n            attemptNumber={attemptNumber}\n            attemptsRemaining={attemptsRemaining}\n            onGameOver`);

// update onGameOver signature in play.tsx
playCode = playCode.replace(/async \(r: \{ score: number; foods: number; durationMs: number \}\) => \{/g, `async (r: { score: number; foods: number; durationMs: number; checkpoint: string }) => {`);

playCode = playCode.replace(/sessionToken,\n\s+foods: r\.foods,\n\s+durationMs: r\.durationMs,\n\s+reportedScore: r\.score,\n\s+\}\},/g, `sessionToken,\n            foods: r.foods,\n            durationMs: r.durationMs,\n            reportedScore: r.score,\n            checkpoint: r.checkpoint,\n          }},`);

fs.writeFileSync('src/routes/play.tsx', playCode);
console.log('play.tsx updated');
