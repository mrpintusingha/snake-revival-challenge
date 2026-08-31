import re

files = ['src/components/SnakeTeaser.tsx', 'src/components/SnakeGame.tsx']
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix encoding glitches if they occur. The prompt was written in utf-8, but maybe powershell piped it as ANSI.
    # It might be in 'utf-8' but was written as something else. Let's just do explicit replacements.
    content = content.replace('â–²', '▲')
    content = content.replace('â—€', '◀')
    content = content.replace('â–¶', '▶')
    content = content.replace('â–¼', '▼')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
