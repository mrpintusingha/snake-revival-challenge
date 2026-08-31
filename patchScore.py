import re

path = 'src/components/ScoreCard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"90s SNAKE CHALLENGE"', '"90s SNAKE"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
