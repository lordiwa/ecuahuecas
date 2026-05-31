<script setup lang="ts">
// Admin-only user management. The route guard (main.ts) already enforces
// `meta.adminOnly` (admin claim required) before this page mounts, and the
// callables fail closed server-side too — this is defense in depth, not the
// only gate.
//
// SSG-safe: Firebase is only touched on mount (browser) and on user actions.
import { ref, onMounted } from 'vue'
import {
  listCriticos,
  grantCriticoRole,
  revokeCriticoRole,
  type AdminUser,
} from '@/lib/adminUsers'
import { authErrorMessage } from '@/composables/authErrors'

const users = ref<AdminUser[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
// Per-user in-flight flag so each row's buttons disable independently.
const busy = ref<Record<string, boolean>>({})

async function refresh() {
  loading.value = true
  error.value = null
  try {
    users.value = await listCriticos()
  } catch (err) {
    error.value = authErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

async function setRole(u: AdminUser, grant: boolean) {
  busy.value = { ...busy.value, [u.uid]: true }
  error.value = null
  try {
    if (grant) await grantCriticoRole(u.uid)
    else await revokeCriticoRole(u.uid)
    await refresh()
  } catch (err) {
    error.value = authErrorMessage(err)
  } finally {
    busy.value = { ...busy.value, [u.uid]: false }
  }
}

function displayName(u: AdminUser): string {
  return u.displayName || u.email || u.uid
}
</script>

<template>
  <div class="container section">
    <div class="head-row">
      <div>
        <p class="eyebrow">Admin · Usuarios</p>
        <h1 class="h-display">Gestión de críticos</h1>
        <p class="cuerpo-editorial sub">
          Promueve o revoca el rol de crítico. Tras un cambio, el usuario debe
          refrescar su sesión para que surta efecto.
        </p>
      </div>
      <button type="button" class="btn btn--blanco" :disabled="loading" @click="refresh">
        {{ loading ? 'Cargando…' : 'Actualizar' }}
      </button>
    </div>

    <p v-if="error" class="msg msg--error" role="alert">{{ error }}</p>

    <p v-if="loading && users.length === 0" class="msg">Cargando usuarios…</p>

    <p v-else-if="!loading && users.length === 0" class="msg">
      No hay usuarios para mostrar.
    </p>

    <ul v-else class="user-list">
      <li v-for="u in users" :key="u.uid" class="user card">
        <div class="user-main">
          <div class="user-id">
            <img
              v-if="u.photoURL"
              :src="u.photoURL"
              width="40"
              height="40"
              alt=""
              referrerpolicy="no-referrer"
              class="avatar"
            />
            <span v-else class="avatar avatar--initial">
              {{ displayName(u).charAt(0).toUpperCase() }}
            </span>
            <div>
              <h2 class="user-name">{{ displayName(u) }}</h2>
              <p class="user-email">{{ u.email || 'sin correo' }}</p>
            </div>
          </div>
          <div class="user-roles">
            <span v-if="u.admin" class="chip chip--rojo">admin</span>
            <span v-if="u.critico" class="chip chip--azul">crítico</span>
            <span v-if="!u.admin && !u.critico" class="chip">sin rol</span>
          </div>
        </div>
        <div class="user-actions">
          <button
            v-if="!u.critico"
            type="button"
            class="btn btn--azul"
            :disabled="busy[u.uid] || u.admin"
            :title="u.admin ? 'Los admin ya tienen el rol crítico' : ''"
            @click="setRole(u, true)"
          >
            {{ busy[u.uid] ? '…' : 'Promover a crítico' }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn--ghost"
            :disabled="busy[u.uid] || u.admin"
            :title="u.admin ? 'No se puede revocar a un admin desde aquí' : ''"
            @click="setRole(u, false)"
          >
            {{ busy[u.uid] ? '…' : 'Revocar crítico' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.sub { margin-top: 8px; max-width: 52ch; opacity: 0.8; }

.msg {
  font-family: var(--texto);
  border: var(--borde);
  border-radius: var(--radio-md);
  background: var(--crema);
  padding: 18px 20px;
  margin-bottom: 16px;
}
.msg--error {
  color: var(--crema);
  background: var(--rojo);
  font-weight: 700;
  box-shadow: var(--sombra-bloque-sm);
}

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}
.user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 18px;
}
.user-main {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.user-id {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: var(--borde);
  border-radius: var(--radio-sm);
  object-fit: cover;
  background: var(--amarillo);
  overflow: hidden;
}
.avatar--initial {
  font-family: var(--display);
  font-size: 18px;
  color: var(--tinta);
}
.user-name {
  font-family: var(--titulo);
  font-size: 1.15rem;
  margin: 0;
}
.user-email {
  font-family: var(--mono);
  font-size: 11px;
  opacity: 0.7;
  margin: 2px 0 0;
  word-break: break-all;
}
.user-roles {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.user-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .user { flex-direction: column; align-items: stretch; }
  .user-actions { justify-content: space-between; }
}
</style>
