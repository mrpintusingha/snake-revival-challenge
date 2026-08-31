import os

files = ['src/routes/index.tsx', 'src/components/SiteChrome.tsx', 'src/components/ScoreCard.tsx', 'src/lib/config.ts', 'src/routes/play.tsx']
for path in files:
    try:
        with open(path, 'r', encoding='windows-1252') as f:
            content = f.read()
            
        content = content.replace('ðŸ‘‘', '👑')
        content = content.replace('ðŸ  ', '🐍')
        content = content.replace('ðŸŒŽ', '🌍')
        content = content.replace('ðŸ ³ï¸ ', '🏳️‍🌈')
        content = content.replace('ðŸ˜ˆ', '😈')
        content = content.replace('ðŸ¥‡', '🥇')
        content = content.replace('ðŸ¥ˆ', '🥈')
        content = content.replace('ðŸ¥‰', '🥉')
        content = content.replace('ðŸŸ¢', '🟢')
        content = content.replace('â€”', '—')
        content = content.replace('â€¢', '•')

        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f"Failed {path}: {e}")
