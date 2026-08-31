with open('src/routes/index.tsx', 'rb') as f:
    b = f.read()
if b'\xf0\x9f\x90\x8d' in b:
    print("SNAKE EMOJI IS PRESENT")
elif b'\xc3\xb0\xc5\xb8\xc2\x90\xc2\x8d' in b:
    print("MANGLED UTF-8 IS PRESENT")
