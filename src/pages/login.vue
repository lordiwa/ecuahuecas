<script setup lang="ts">
// SSG-safe: no Firebase at module eval. `useAuth` is lazy and the listener is
// browser-guarded. Auth calls only fire on user interaction.
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useAuth } from '@/composables/useAuth'
import { safeNextPath } from '@/lib/safeNext'

useHead({ title: 'Iniciar sesión — EcuaHuecas' })

const route = useRoute()
const router = useRouter()
const { currentUser, loading, error, signInWithGoogle, signInWithEmail } = useAuth()

const showEmail = ref(false)
const email = ref('')
const password = ref('')

function nextDestination(): string {
  // Shared hardened same-site check (see src/lib/safeNext.ts).
  return safeNextPath(route.query.next)
}

// Redirect once authenticated (covers both Google popup and email sign-in).
watch(
  currentUser,
  (user) => {
    if (user) router.replace(nextDestination())
  },
  { immediate: true },
)

async function onGoogle() {
  await signInWithGoogle()
}

async function onEmailSubmit() {
  await signInWithEmail(email.value.trim(), password.value)
}
</script>

<template>
  <section class="container section login">
    <div class="login-card card">
      <p class="eyebrow">Acceso</p>
      <h1 class="h-display login-title">Inicia sesión</h1>
      <p class="cuerpo-editorial login-sub">
        Entra para gestionar reseñas y borradores.
      </p>

      <p v-if="error" class="login-error" role="alert">{{ error }}</p>

      <button
        class="btn btn--blanco login-google"
        type="button"
        :disabled="loading"
        @click="onGoogle"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        Continuar con Google
      </button>

      <button
        class="btn btn--ghost login-toggle"
        type="button"
        @click="showEmail = !showEmail"
      >
        {{ showEmail ? 'Ocultar correo y contraseña' : 'Usar correo y contraseña' }}
      </button>

      <form v-if="showEmail" class="login-email" @submit.prevent="onEmailSubmit">
        <label class="login-field">
          <span>Correo</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="tu@correo.com"
          />
        </label>
        <label class="login-field">
          <span>Contraseña</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
          />
        </label>
        <button class="btn btn--rojo" type="submit" :disabled="loading">
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login {
  display: flex;
  justify-content: center;
}
.login-card {
  width: 100%;
  max-width: 440px;
  padding: 32px;
  background: var(--crema);
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque);
}
.login-title { margin-top: 4px; }
.login-sub { margin-top: 8px; opacity: 0.8; }

.login-error {
  margin-top: 20px;
  padding: 12px 14px;
  font-family: var(--texto);
  font-weight: 700;
  color: var(--crema);
  background: var(--rojo);
  border: var(--borde);
  border-radius: var(--radio-sm);
  box-shadow: var(--sombra-bloque-sm);
}

.login-google {
  width: 100%;
  margin-top: 24px;
}
.login-toggle {
  margin-top: 14px;
  width: 100%;
}

.login-email {
  margin-top: 20px;
  display: grid;
  gap: 16px;
}
.login-field {
  display: grid;
  gap: 6px;
}
.login-field span {
  font-family: var(--texto);
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.login-field input {
  font-family: var(--texto);
  font-size: 1.05rem;
  padding: 12px 16px;
  border: var(--borde);
  border-radius: var(--radio-sm);
  background: var(--papel);
  color: var(--tinta);
}
.login-field input:focus {
  outline: none;
  box-shadow: var(--sombra-bloque-sm);
}
.login-email .btn { width: 100%; }
</style>
