import re

path = 'src/routes/index.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "The classic mobile Snake experience, rebuilt for the 90s generation."
new_sub = "Remember when this could keep you busy for hours? The classic mobile Snake experience, rebuilt for the 90s generation."

content = content.replace("The classic mobile Snake experience, rebuilt for the 90s generation.", new_sub)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
