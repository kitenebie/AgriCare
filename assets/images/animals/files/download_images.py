# Run on your own computer (needs Python 3, no extra packages):
#   python download_images.py
# Downloads every image in image-urls.txt into ./myungdo-images and zips them.
import os, urllib.request, zipfile
urls = [u.strip() for u in open("image-urls.txt") if u.strip()]
os.makedirs("myungdo-images", exist_ok=True)
ok = 0
for u in urls:
    name = u.rsplit("/", 1)[-1]
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r, open(os.path.join("myungdo-images", name), "wb") as f:
            f.write(r.read())
        ok += 1
        print("OK  ", name)
    except Exception as e:
        print("FAIL", name, e)
with zipfile.ZipFile("myungdo-images.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for n in os.listdir("myungdo-images"):
        z.write(os.path.join("myungdo-images", n), n)
print(f"Done: {ok}/{len(urls)} downloaded -> myungdo-images.zip")
