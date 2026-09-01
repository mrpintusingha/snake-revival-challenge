const fs = require('fs');

let gameCode = fs.readFileSync('src/components/game/SnakeGame.tsx', 'utf8');

// import useServerFn and syncCheckpoint
gameCode = gameCode.replace(/import \{ audio \} from "@\/lib\/audio";/g, `import { audio } from "@/lib/audio";\nimport { useServerFn } from "@tanstack/react-start";\nimport { syncCheckpoint } from "@/lib/api.functions";`);

// update Props
gameCode = gameCode.replace(/type Props = \{\n\s+attemptNumber: number;/g, `type Props = {\n  sessionToken: string;\n  initialCheckpoint: string;\n  attemptNumber: number;`);

gameCode = gameCode.replace(/onGameOver: \(result: \{ score: number; foods: number; durationMs: number \}\) => void;/g, `onGameOver: (result: { score: number; foods: number; durationMs: number; checkpoint: string }) => void;`);

gameCode = gameCode.replace(/export function SnakeGame\(\{ attemptNumber, attemptsRemaining, onGameOver \}: Props\) \{/g, `export function SnakeGame({ sessionToken, initialCheckpoint, attemptNumber, attemptsRemaining, onGameOver }: Props) {`);

// add sync references
gameCode = gameCode.replace(/const startedAt = useRef\(0\);/g, `const startedAt = useRef(0);\n  const fnSync = useServerFn(syncCheckpoint);\n  const lastSyncRef = useRef<{ foods: number; token: string }>({ foods: 0, token: initialCheckpoint });\n  const isSyncingRef = useRef(false);`);

// update triggerGameOverTransition
gameCode = gameCode.replace(/onGameOver\(\{\n\s+score: s\.score,\n\s+foods: s\.foods,\n\s+durationMs: Math\.round\(performance\.now\(\) - startedAt\.current\),\n\s+\}\);/g, `onGameOver({\n      score: s.score,\n      foods: s.foods,\n      durationMs: Math.round(performance.now() - startedAt.current),\n      checkpoint: lastSyncRef.current.token,\n    });`);

// insert sync logic inside game loop
// the loop has: `const ate = step(s);`
const syncLogic = `
        if (ate) {
          if (s.score > previousScore && s.score % 500 === 0 && previousScore > 0) {
            audio.milestone();
          } else {
            audio.eat();
          }

          // Trigger checkpoint sync every 5 foods
          if (s.foods - lastSyncRef.current.foods >= 5 && !isSyncingRef.current) {
            isSyncingRef.current = true;
            const currentFoods = s.foods;
            const currentDuration = Math.round(performance.now() - startedAt.current);
            fnSync({
              data: {
                sessionToken,
                checkpoint: lastSyncRef.current.token,
                foods: currentFoods,
                durationMs: currentDuration
              }
            }).then(res => {
              lastSyncRef.current = { foods: currentFoods, token: res.checkpoint };
            }).catch(err => {
              console.error("Checkpoint sync failed", err);
            }).finally(() => {
              isSyncingRef.current = false;
            });
          }
        }
`;

gameCode = gameCode.replace(/if \(ate\) \{\n\s+if \(s\.score > previousScore && s\.score % 500 === 0 && previousScore > 0\) \{\n\s+audio\.milestone\(\);\n\s+\} else \{\n\s+audio\.eat\(\);\n\s+\}\n\s+\}/g, syncLogic);

fs.writeFileSync('src/components/game/SnakeGame.tsx', gameCode);
console.log('SnakeGame.tsx updated');
