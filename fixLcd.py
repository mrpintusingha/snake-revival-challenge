import os

path = 'src/components/LcdScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('ctx.textBaseline = "middle";', 'ctx.textBaseline = "top";')
content = content.replace('ctx.fillText("SNAKE", PAD + 1, HEADER / 2 + 1);', 'ctx.fillText("SNAKE", PAD + 1, PAD);')
content = content.replace('ctx.fillText(String(state?.score ?? 0).padStart(4, "0"), W - PAD - 1, HEADER / 2 + 1);', 'ctx.fillText(String(state?.score ?? 0).padStart(4, "0"), W - PAD - 1, PAD);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
