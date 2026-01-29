# ESLint and build

## Why `DISABLE_ESLINT_PLUGIN=true` in production build

If the repo is opened at the **workspace root** (`Qudrat`) and there is a **root `node_modules`** (e.g. from running `npm install` at root), the production build can hit:

```text
[eslint] Plugin "react" was conflicted between "...\client\node_modules\eslint-config-react-app\..." and "BaseConfig » ...\node_modules\eslint-config-react-app\..."
```

That happens because both **root** and **client** have `eslint-config-react-app`, and Create React App’s ESLint plugin ends up merging configs from both, so the same plugin is loaded from two different paths.

To avoid that, **production build** uses `DISABLE_ESLINT_PLUGIN=true` in `client/.env.production`, so the build does not run ESLint and completes successfully. You still get linting in:

- **Development:** `npm start` (ESLint runs; uses `client/.eslintrc.cjs` with `root: true` and client-only resolution).
- **Editor:** if your editor uses ESLint with the project config, it will use `client/.eslintrc.cjs` and/or `client/package.json` `eslintConfig`.

## How to run ESLint during build (optional)

If you want ESLint to run again during `npm run build` in `client`:

1. **Prefer running from `client`:**  
   Always run `npm run build` from the **client** directory:  
   `cd client && npm run build`. Do not run a single “build” from the repo root that only runs the client build.

2. **Avoid duplicate `eslint-config-react-app` at root:**  
   - If there is **no** `package.json` at the repo root, avoid creating a root `node_modules` (do not run `npm install` at the root).  
   - If you use a root `package.json`, ensure it does not pull in `eslint-config-react-app` (or remove root’s `node_modules` and rely on `client` for the app).

3. **Remove the build-time disable:**  
   In `client/.env.production`, remove or comment out the line:  
   `DISABLE_ESLINT_PLUGIN=true`  
   Then run `npm run build` from `client` again. If the conflict is gone (no root copy of the config), the build will run ESLint.

With the current setup, **the conflict is avoided** and the production build succeeds; the above steps are only if you explicitly want ESLint during the build again.
