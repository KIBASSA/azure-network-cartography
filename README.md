# Azure Network Cartography

## Static build

Run `npm run build` (or `node build.js`) to generate the `dist` directory. The script bundles all JavaScript from `src/` so that `dist/app.js` has no `import` statements and works as a standalone file. You can then open `dist/index.html` directly in your browser without starting a server.
