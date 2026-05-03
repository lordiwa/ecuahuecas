<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const theme = ref<'light' | 'dark'>('light')

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
      <img src="/gallinazo.png" width="36" height="36" alt="" />
      <span class="logo-text">EcuaHuecas</span>
    </RouterLink>
    <nav class="app-nav">
      <RouterLink to="/mapa">Mapa</RouterLink>
      <RouterLink to="/top10">Top 10</RouterLink>
      <RouterLink to="/buscar">Buscar</RouterLink>
      <button class="btn btn--ghost" @click="toggleTheme" :aria-label="`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`">
        {{ theme === 'light' ? 'Oscuro' : 'Claro' }}
      </button>
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
