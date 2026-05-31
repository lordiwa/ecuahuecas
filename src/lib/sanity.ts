/**
 * Sanity READ client for ecuahuecas.
 *
 * Thin wrapper around the `blog-component` library so the rest of the app
 * imports post-reading helpers from `@/lib/sanity` instead of reaching into the
 * library directly. Reads go through the public CDN client (`useCdn: true`, no
 * token) against the reused Sanity project — config comes from PUBLIC,
 * non-secret `VITE_SANITY_*` env vars.
 *
 * Out of scope here (separate tickets): Sanity schemas (TASK-017), the AI wizard
 * (TASK-018), and PortableText rendering (TASK-013). No write token lives here.
 */
import {
  createBlogClient,
  getPostBySlug,
  getPostList,
  type Post,
  type PostListItem,
} from 'blog-component'

// Re-export the read-side types so app code can `import type { Post } from '@/lib/sanity'`.
export type { Post, PostListItem }

// Derive the client type from the library's factory return rather than importing
// it from `@sanity/client` directly (that package is only a transitive dep).
type BlogClient = ReturnType<typeof createBlogClient>

let client: BlogClient | null = null

/**
 * Lazily create and memoize the configured READ client. Lazy so the client is
 * only built when first needed (and so env access happens at call time, which
 * keeps module import side-effect free for SSG).
 */
function getClient(): BlogClient {
  if (client === null) {
    client = createBlogClient({
      projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
      dataset: import.meta.env.VITE_SANITY_DATASET,
      useCdn: true,
    })
  }
  return client
}

/** Fetch the published post list (cards). */
export function listPosts(): Promise<PostListItem[]> {
  return getPostList(getClient())
}

/** Fetch a single published post by slug, or `null` when none matches. */
export function postBySlug(slug: string): Promise<Post | null> {
  return getPostBySlug(getClient(), slug)
}
