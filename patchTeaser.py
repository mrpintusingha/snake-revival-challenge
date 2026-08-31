import re

path = 'src/components/SnakeTeaser.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_return = '''
  return (
    <div className="relative mx-auto w-full max-w-[320px] rounded-[2rem] bg-zinc-900 p-4 pb-8 shadow-2xl border-4 border-zinc-800 scale-90 sm:scale-100 origin-top">
      <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-black shadow-inner"></div>
      
      <div className="rounded-lg bg-zinc-950 p-3 shadow-inner ring-1 ring-zinc-800 ring-offset-1 ring-offset-zinc-900">
        <div className="w-full">
          <LcdScreen state={stateRef.current} overlay={overlay} className="shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-2">
        <span className="text-[9px] font-bold tracking-widest text-zinc-500">CLASSIC</span>
      </div>

      <div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6 opacity-80 pointer-events-none">
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
      </div>
    </div>
  );
'''

# replace the return statement
content = re.sub(r'  return <LcdScreen.*?;', new_return, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
