import re

path1 = 'src/components/SnakeGame.tsx'
with open(path1, 'rb') as f:
    c = f.read().decode('utf-8')

new_pad = '''        <div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6">
          <div />
          <PadButton label="▲" onPress={() => input("up")} />
          <div />
          <PadButton label="◀" onPress={() => input("left")} />
          <div className="flex items-center justify-center">
             <div className="h-4 w-4 rounded-full bg-zinc-800 shadow-inner" />
          </div>
          <PadButton label="▶" onPress={() => input("right")} />
          <div />
          <PadButton label="▼" onPress={() => input("down")} />
          <div />
        </div>'''

c = re.sub(r'<div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6">.*?</div>\s*</div>', new_pad + '\n      </div>', c, flags=re.DOTALL)

with open(path1, 'wb') as f:
    f.write(c.encode('utf-8'))

path2 = 'src/components/SnakeTeaser.tsx'
with open(path2, 'rb') as f:
    c2 = f.read().decode('utf-8')

new_teaser_pad = '''      <div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6 opacity-80 pointer-events-none">
        <div />
        <div className="flex h-12 w-full items-center justify-center rounded-lg border-b-4 border-zinc-950 bg-zinc-800 text-sm text-zinc-400 shadow-md">▲</div>
        <div />
        <div className="flex h-12 w-full items-center justify-center rounded-lg border-b-4 border-zinc-950 bg-zinc-800 text-sm text-zinc-400 shadow-md">◀</div>
        <div className="flex items-center justify-center">
           <div className="h-4 w-4 rounded-full bg-zinc-800 shadow-inner" />
        </div>
        <div className="flex h-12 w-full items-center justify-center rounded-lg border-b-4 border-zinc-950 bg-zinc-800 text-sm text-zinc-400 shadow-md">▶</div>
        <div />
        <div className="flex h-12 w-full items-center justify-center rounded-lg border-b-4 border-zinc-950 bg-zinc-800 text-sm text-zinc-400 shadow-md">▼</div>
        <div />
      </div>'''

c2 = re.sub(r'<div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6 opacity-80 pointer-events-none">.*?</div>\s*</div>', new_teaser_pad + '\n    </div>', c2, flags=re.DOTALL)

with open(path2, 'wb') as f:
    f.write(c2.encode('utf-8'))
