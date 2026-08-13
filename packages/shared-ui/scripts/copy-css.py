import shutil, os

dist = 'dist'
if not os.path.isdir(dist):
    os.makedirs(dist)
shutil.copy2('src/index.css', 'dist/index.css')
