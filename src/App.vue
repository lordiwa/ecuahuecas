<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useHead } from '@unhead/vue'
import { useAuth } from '@/composables/useAuth'
import { absoluteUrl } from '@/lib/og'

// Site-wide DEFAULT head. unhead dedupes meta by name/property, so any per-page
// `useHead` block (HuecaDetail, ResenaDetail, index…) OVERRIDES these. This
// guarantees EVERY route — including ones with no per-page block (top10, mapa,
// buscar, crítico) — ships baseline Open Graph + Twitter card tags with the
// branded static fallback image, so social previews never render blank.
const ogDefault = absoluteUrl('/og-default.png')
useHead({
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'EcuaHuecas' },
    { property: 'og:title', content: 'EcuaHuecas — Comida de calle, sin filtros' },
    {
      property: 'og:description',
      content: 'Reseñas honestas de huecas ecuatorianas: comida de calle, sin filtros.',
    },
    { property: 'og:image', content: ogDefault },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'EcuaHuecas — Comida de calle, sin filtros' },
    {
      name: 'twitter:description',
      content: 'Reseñas honestas de huecas ecuatorianas: comida de calle, sin filtros.',
    },
    { name: 'twitter:image', content: ogDefault },
  ],
})

const theme = ref<'light' | 'dark'>('light')

const { currentUser, initAuthListener, signOut } = useAuth()

// Register the auth listener only in the browser (never during SSG prerender).
onMounted(() => {
  if (typeof window !== 'undefined') initAuthListener()
})

const menuOpen = ref(false)

const userInitial = computed(() => {
  const u = currentUser.value
  const source = u?.displayName || u?.email || '?'
  return source.trim().charAt(0).toUpperCase() || '?'
})

function closeMenu() {
  menuOpen.value = false
}

async function onSignOut() {
  closeMenu()
  await signOut()
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.user-menu')) closeMenu()
}

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('click', onDocClick)
})

// Expose the admin link only in dev, or when ?admin=true is present — so it is
// never statically rendered into production by accident. Guard `location` for
// the SSG build (no `window` during module evaluation).
const showAdmin =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('admin'))

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme.value
  }
})

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
  <div class="bandera-strip" aria-hidden="true">
    <span class="bandera-amarillo"></span>
    <span class="bandera-azul"></span>
    <span class="bandera-rojo"></span>
  </div>

  <header class="app-header">
    <RouterLink to="/" class="logo">
      <img src="/logo-72.png" width="36" height="36" alt="" />
      <span class="logo-text">EcuaHuecas</span>
    </RouterLink>
    <nav class="app-nav">
      <RouterLink to="/mapa">Mapa</RouterLink>
      <RouterLink to="/top10">Top 10</RouterLink>
      <RouterLink to="/buscar">Buscar</RouterLink>
      <RouterLink v-if="showAdmin" to="/admin/resenas" class="admin-link">Admin</RouterLink>
      <button class="btn btn--ghost" @click="toggleTheme" :aria-label="`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`">
        {{ theme === 'light' ? 'Oscuro' : 'Claro' }}
      </button>

      <!-- No public "Ingresar" button (TASK-025): admins sign in by typing
           /admin (the guard sends them to /login) or /login directly. The user
           menu only appears once a user is signed in. -->
      <div v-if="currentUser" class="user-menu">
        <button
          class="user-avatar"
          type="button"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          aria-label="Menú de usuario"
          @click="menuOpen = !menuOpen"
        >
          <img
            v-if="currentUser.photoURL"
            :src="currentUser.photoURL"
            width="34"
            height="34"
            alt=""
            referrerpolicy="no-referrer"
          />
          <span v-else class="user-initial">{{ userInitial }}</span>
        </button>
        <div v-if="menuOpen" class="user-dropdown" role="menu">
          <span class="user-dropdown__email">{{ currentUser.email }}</span>
          <button type="button" role="menuitem" class="user-dropdown__item" disabled>
            Mi perfil
          </button>
          <button type="button" role="menuitem" class="user-dropdown__item" @click="onSignOut">
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  </header>

  <main class="app-main">
    <RouterView />
  </main>

  <footer class="app-footer">
    <p class="eyebrow">Comida de calle, sin filtros</p>
    <p class="footer-meta">© {{ new Date().getFullYear() }} EcuaHuecas — Quito · Guayaquil</p>
  </footer>
</template>

<style scoped>
.bandera-strip {
  display: flex;
  height: 8px;
}
.bandera-amarillo { flex: 2; background: var(--amarillo); }
.bandera-azul     { flex: 1; background: var(--azul); }
.bandera-rojo     { flex: 1; background: var(--rojo); }

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: var(--papel);
  border-bottom: 2.5px solid var(--linea);
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--tinta);
}
.logo img { display: block; }
.logo-text {
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: 0.5px;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 18px;
}
.app-nav a {
  font-family: var(--texto);
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  color: var(--tinta);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.app-nav a.router-link-active {
  color: var(--rojo);
}
.app-nav a.admin-link {
  color: var(--azul);
  border-bottom: 2.5px solid var(--azul);
}

.user-menu {
  position: relative;
}
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: var(--borde);
  border-radius: var(--radio-sm);
  background: var(--amarillo);
  cursor: pointer;
  overflow: hidden;
  box-shadow: var(--sombra-bloque-sm);
}
.user-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.user-initial {
  font-family: var(--display);
  font-size: 16px;
  color: var(--tinta);
}
.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 200px;
  display: flex;
  flex-direction: column;
  background: var(--crema);
  border: var(--borde);
  border-radius: var(--radio-sm);
  box-shadow: var(--sombra-bloque);
  overflow: hidden;
  z-index: 200;
}
.user-dropdown__email {
  padding: 10px 14px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--tinta);
  opacity: 0.7;
  border-bottom: var(--borde);
  word-break: break-all;
}
.user-dropdown__item {
  text-align: left;
  padding: 12px 14px;
  font-family: var(--texto);
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: transparent;
  border: none;
  color: var(--tinta);
  cursor: pointer;
}
.user-dropdown__item:hover:not(:disabled) {
  background: var(--amarillo-suave);
}
.user-dropdown__item:disabled {
  opacity: 0.5;
  cursor: default;
}

.app-main {
  min-height: 60vh;
}

.app-footer {
  padding: 40px 24px 60px;
  border-top: 2.5px solid var(--linea);
  margin-top: 80px;
}
.footer-meta {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--tinta);
  opacity: 0.7;
  margin-top: 6px;
}
</style>
