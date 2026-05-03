import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
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
]

export const createApp = ViteSSG(App, { routes }, ({ app }) => {
  app.use(createPinia())
})
