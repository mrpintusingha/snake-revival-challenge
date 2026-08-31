import re

path = 'src/components/SnakeGame.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'useState<"startup" | "countdown" | "playing" | "over" | "awaiting-continue">("startup")',
    'useState<"startup" | "countdown" | "playing" | "over" | "awaiting-continue" | "submitting">("startup")'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
