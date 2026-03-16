import os
import urllib.request

def create_dummy_png(path, size):
    # A 1x1 transparent PNG base64
    b64 = b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    import base64
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64))

os.makedirs("icons", exist_ok=True)
for size in [16, 32, 48, 128]:
    create_dummy_png(f"icons/icon{size}.png", size)
    print(f"Created icons/icon{size}.png")
