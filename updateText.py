import os

config_path = 'src/lib/config.ts'
with open(config_path, 'r', encoding='utf-8') as f:
    config = f.read()

config = config.replace('short: "90s Snake"', 'short: "90s Kids"')
config = config.replace('tagline1: "You played it as a kid."', 'tagline1: "Bring back your childhood memories."')

with open(config_path, 'w', encoding='utf-8') as f:
    f.write(config)

index_path = 'src/routes/index.tsx'
with open(index_path, 'r', encoding='utf-8') as f:
    index = f.read()

index = index.replace('You played Snake as a kid.', 'Bring back your childhood memories.')
index = index.replace('You played it as a kid.', 'Bring back your childhood memories.')

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index)

print("Updated text in config.ts and index.tsx")
