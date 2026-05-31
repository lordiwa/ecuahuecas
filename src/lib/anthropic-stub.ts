/**
 * Browser/SSG stub for `@anthropic-ai/sdk`.
 *
 * `blog-component`'s bundle does `import Anthropic from '@anthropic-ai/sdk'`,
 * which transitively drags in the SDK's Node-only agent toolset
 * (`tools/agent-toolset/fs-util.mjs` → `node:fs`/`node:path`), and that cannot
 * be bundled for the browser (Rollup: "realpath is not exported by
 * __vite-browser-external").
 *
 * ecuahuecas only uses the library's READ/RENDER surface (`BlogPostPreview`,
 * `BlockContent`) — never the AI authoring path (`generatePostBody`), which is
 * the sole consumer of this default export and is server-side-only anyway. So
 * aliasing the SDK to this inert stub in the client build is safe: if the AI
 * path were ever invoked client-side it would throw, which is the desired
 * "do not run secrets in the browser" behavior.
 */
export default class AnthropicStub {
  constructor() {
    throw new Error(
      '@anthropic-ai/sdk is stubbed in the ecuahuecas client build; AI authoring is server-side only.',
    )
  }
}
