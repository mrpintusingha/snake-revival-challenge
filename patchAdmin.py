import os

path = 'src/routes/admin.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('â€”', '—')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
