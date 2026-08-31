import re

path = 'src/routes/play.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('ðŸ‘‘', '👑')
content = content.replace('ðŸ  ', '🐍')
content = content.replace('ðŸŒŽ', '🌍')
content = content.replace('ðŸ ³ï¸ ', '🏳️‍🌈')
content = content.replace('ðŸ˜ˆ', '😈')
content = content.replace('â€”', '—')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
