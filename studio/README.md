# ecuahuecas Studio

A self-contained [Sanity Studio](https://www.sanity.io/studio) (React + `sanity`
v5) for browsing and editing ecuahuecas content. It points at the **same**
`gvc4yjqj` / `production` dataset as the sibling `blog-component` project, but is
a **separate Studio** so the two content models stay decoupled.

It is its own app with its own `node_modules` and does NOT touch the ecuahuecas
app's `package.json`, Vite configs, or `src/`. It is also excluded from the
app's `vue-tsc` typecheck scope.

## Document types

This Studio owns **only** ecuahuecas's own document types:

- **`hueca`** – a street-food spot.
- **`critico`** – a reviewer (the ecuahuecas analog of `author`).
- **`resena`** – a review (the ecuahuecas analog of `post`); its `body` reuses
  the same `blockContent` PortableText model as blog-component (`callout`,
  `gallery`, embeds, etc. are copied from there).

It does **not** define or touch blog-component's `post` / `author` / `category`
types, even though they live in the same shared dataset.

## Prerequisites

`sanity login` is **interactive** and cannot be run for you — run it yourself in
a terminal. You only need to do it once per machine.

## Commands

```sh
# 1. Authenticate (interactive — run in your own terminal, once):
cd studio
npx sanity login

# 2. Run the Studio locally (from the studio/ folder):
cd studio
npm install        # first time only — installs this app's own deps
npm run dev        # opens http://localhost:3333

# 3. (Optional) Deploy a hosted Studio to *.sanity.studio:
cd studio
npm run deploy     # the first deploy assigns an appId for you
```

## CORS

If the local Studio at `http://localhost:3333` shows CORS / network errors, add
`http://localhost:3333` as an allowed CORS origin (with credentials) in
[sanity.io/manage](https://www.sanity.io/manage) → project `gvc4yjqj` → **API →
CORS Origins**.
