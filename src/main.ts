import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { safeNextPath } from './lib/safeNext'
// PortableText base styles for reseña/crítico rich text (rendered by
// blog-component's <BlogPostPreview>). Imported once, globally.
import 'blog-component/style.css'
import './styles/main.css'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('./pages/index.vue'),
    meta: { title: 'EcuaHuecas — Comida de calle, sin filtros' },
  },
  {
    path: '/huecas/:slug',
    name: 'hueca',
    component: () => import('./pages/HuecaDetail.vue'),
  },
  {
    path: '/resenas/:slug',
    name: 'resena',
    component: () => import('./pages/ResenaDetail.vue'),
  },
  {
    path: '/criticos/:slug',
    name: 'critico',
    component: () => import('./pages/CriticoDetail.vue'),
  },
  {
    path: '/top10',
    name: 'top10',
    component: () => import('./pages/top10.vue'),
  },
  {
    path: '/buscar',
    name: 'buscar',
    component: () => import('./pages/buscar.vue'),
  },
  {
    path: '/mapa',
    name: 'mapa',
    component: () => import('./pages/mapa.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('./pages/login.vue'),
    meta: { title: 'EcuaHuecas — Iniciar sesión' },
  },
  {
    path: '/admin/resenas',
    name: 'admin-resenas',
    component: () => import('./pages/admin/resenas/index.vue'),
    meta: { title: 'EcuaHuecas — Admin: Borradores', admin: true },
  },
  {
    path: '/admin/resenas/nueva',
    name: 'admin-resena-nueva',
    component: () => import('./pages/admin/resenas/nueva.vue'),
    meta: { title: 'EcuaHuecas — Admin: Nueva reseña', admin: true },
  },
  {
    path: '/admin/resenas/:id/editar',
    name: 'admin-resena-editar',
    component: () => import('./pages/admin/resenas/editar.vue'),
    meta: { title: 'EcuaHuecas — Admin: Editar reseña', admin: true },
  },
  {
    path: '/admin/usuarios',
    name: 'admin-usuarios',
    component: () => import('./pages/admin/usuarios.vue'),
    meta: { title: 'EcuaHuecas — Admin: Usuarios', admin: true, adminOnly: true },
  },
  {
    path: '/_dev/editor',
    name: 'dev-editor',
    component: () => import('./pages/_dev/editor.vue'),
    meta: { title: 'EcuaHuecas — Dev: Editor', dev: true },
  },
  {
    path: '/_dev/uploader',
    name: 'dev-uploader',
    component: () => import('./pages/_dev/uploader.vue'),
    meta: { title: 'EcuaHuecas — Dev: Uploader', dev: true },
  },
  {
    path: '/_dev/picker',
    name: 'dev-picker',
    component: () => import('./pages/_dev/picker.vue'),
    meta: { title: 'EcuaHuecas — Dev: Picker', dev: true },
  },
]

export const createApp = ViteSSG(App, { routes }, ({ app, router, isClient }) => {
  app.use(createPinia())

  // Auth gate. Runs in the browser only: during SSR/prerender there is no auth
  // state and `/admin/**` routes are excluded from the prerender crawl anyway
  // (see vite.config `includedRoutes`), so we short-circuit to avoid touching
  // Firebase off-browser.
  router.beforeEach(async (to) => {
    if (!isClient) return true
    if (!to.meta.admin) return true

    // Lazy import: keep auth/role code (and Firebase) out of the SSR bundle and
    // off the module-eval path. These modules are SSG-safe but we only need
    // them once a guarded route is actually hit in the browser.
    const { useAuth } = await import('./composables/useAuth')
    const { useRole } = await import('./composables/useRole')
    const { currentUser, authConfigured, initAuthListener, whenAuthReady } = useAuth()

    // Ensure the listener is running, then wait for the FIRST auth resolution so
    // a hard refresh on /admin/** doesn't race the async listener and bounce a
    // logged-in user to /login.
    initAuthListener()
    await whenAuthReady()

    // Distinguish "auth not configured" (init threw — no .env.local) from
    // "configured but logged out". A missing config is NOT a definitive logout:
    // send to /login, where the lazy init surfaces a clear "auth no configurada"
    // error, but WITHOUT a misleading ?next that implies a normal sign-in.
    if (!authConfigured.value) {
      return { path: '/login' }
    }

    // Configured but no user: send to login and remember where they wanted to go
    // (hardened same-site value so the redirect can't be abused).
    if (!currentUser.value) {
      return { path: '/login', query: { next: safeNextPath(to.fullPath) } }
    }

    // Admin-only routes (e.g. /admin/usuarios) additionally require the admin
    // claim. A logged-in non-admin (e.g. a crítico) must not reach them — send
    // them to the reseñas dashboard rather than to /login.
    if (to.meta.adminOnly) {
      const { isAdmin, refreshClaims } = useRole()
      // Claims may not have been read yet on a cold load; ensure they are.
      if (!isAdmin.value) await refreshClaims()
      if (!isAdmin.value) return { name: 'admin-resenas' }
    }

    return true
  })

  // DEV-only one-time admin bootstrap helper. Sign in as the ADMIN_EMAIL, then
  // run `await hacermeAdmin()` in the browser console to call the deployed
  // bootstrapAdmin callable and refresh your token. Never shipped to prod.
  if (import.meta.env.DEV && isClient) {
    ;(window as unknown as Record<string, unknown>).hacermeAdmin = async () => {
      const { getFirebaseFunctions } = await import('./lib/firebase')
      const { httpsCallable } = await import('firebase/functions')
      const { useRole } = await import('./composables/useRole')
      const res = await httpsCallable(getFirebaseFunctions(), 'bootstrapAdmin')()
      await useRole().refreshClaims()
      console.log('[hacermeAdmin] resultado:', res.data)
      return res.data
    }
    console.info(
      '[dev] Para hacerte admin: inicia sesión como el ADMIN_EMAIL y ejecuta  await hacermeAdmin()  en la consola.',
    )
  }
})
