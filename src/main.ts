import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
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

export const createApp = ViteSSG(App, { routes }, ({ app }) => {
  app.use(createPinia())
})
