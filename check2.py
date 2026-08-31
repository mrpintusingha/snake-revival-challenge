with open('src/components/SnakeGame.tsx', 'rb') as f:
    b = f.read()
if b'\xe2\x96\xb2' in b: # UP arrow
    print("UP ARROW IS PRESENT")
elif b'\xc3\xa2\xe2\x80\x93\xc2\xb2' in b:
    print("MANGLED ARROW IS PRESENT")
