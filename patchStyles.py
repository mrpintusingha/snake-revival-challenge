import re

path = 'src/styles.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

flicker_css = '''
@keyframes lcd-flicker {
  0% { opacity: 0.97; }
  50% { opacity: 1; }
  100% { opacity: 0.98; }
}

@utility lcd-panel {
  background-color: var(--lcd);
  color: var(--lcd-ink);
  font-family: var(--font-lcd);
  image-rendering: pixelated;
  box-shadow:
    inset 0 0 0 2px oklch(0.55 0.07 135 / 0.5),
    0 0 0 6px oklch(0.22 0.02 150),
    0 0 0 8px oklch(0.34 0.02 150),
    0 18px 50px -12px oklch(0.84 0.19 130 / 0.18);
  animation: lcd-flicker 0.15s infinite alternate;
}
'''

content = re.sub(r'@utility lcd-panel \{.*?\}', flicker_css.strip(), content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
