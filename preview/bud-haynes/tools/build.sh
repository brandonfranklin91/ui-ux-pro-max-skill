#!/bin/sh
# Rebuilds js/hero.bundle.js (the file index.html loads) from js/main.js (hero.js, ambient.js,
# world.js, kit.js) and the vendored three.js. Run after editing those.
#   sh tools/build.sh        (needs Node; fetches esbuild via npx)
cd "$(dirname "$0")/.." || exit 1
${ESBUILD:-npx --yes esbuild@0.24.0} js/main.js --bundle --format=iife --minify --target=es2020 \
  --alias:three=./vendor/three/three.module.min.js \
  --alias:three/addons=./vendor/three/addons \
  --legal-comments=none --outfile=js/hero.bundle.js
