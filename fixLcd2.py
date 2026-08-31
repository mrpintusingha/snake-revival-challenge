import os

path = 'src/components/LcdScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const HEADER = 12;', 'const HEADER = 14;')
content = content.replace('ctx.fillRect(0, HEADER - 1, W, 1);', 'ctx.fillRect(0, HEADER - 2, W, 1);')
content = content.replace('ctx.fillText("SNAKE", PAD + 1, PAD);', 'ctx.fillText("SNAKE", PAD + 1, PAD + 1);')
content = content.replace('ctx.fillText(String(state?.score ?? 0).padStart(4, "0"), W - PAD - 1, PAD);', 'ctx.fillText(String(state?.score ?? 0).padStart(4, "0"), W - PAD - 1, PAD + 1);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
