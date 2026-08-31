import re

path = 'src/components/SnakeGame.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const triggerGameOverTransition = useCallback(() => {', '''const triggerGameOverTransition = useCallback(() => {
    setPhase("submitting");''')

content = content.replace('phase === "over" || phase === "awaiting-continue"', 'phase === "over" || phase === "awaiting-continue" || phase === "submitting"')

content = content.replace('phase === "awaiting-continue" ? "PRESS ANY KEY" : ""', '(phase === "awaiting-continue" || phase === "submitting") ? (phase === "submitting" ? "LOADING..." : "PRESS ANY KEY") : ""')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
