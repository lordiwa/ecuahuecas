// Maps Firebase Auth error codes to legible Spanish messages.
// Raw `auth/...` codes must never be shown to end users.

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña es demasiado débil (mínimo 6 caracteres).',
  'auth/missing-password': 'Ingresa tu contraseña.',
  'auth/too-many-requests':
    'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  'auth/popup-closed-by-user': 'Cerraste la ventana antes de iniciar sesión.',
  'auth/cancelled-popup-request': 'Se canceló el inicio de sesión.',
  'auth/popup-blocked':
    'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo de nuevo.',
  'auth/network-request-failed':
    'Problema de conexión. Revisa tu internet e inténtalo de nuevo.',
  'auth/unauthorized-domain':
    'Este dominio no está autorizado para iniciar sesión. Contacta al administrador.',
  'auth/operation-not-allowed':
    'Este método de inicio de sesión no está habilitado.',
}

/**
 * Extract a Firebase-style `code` from an unknown thrown value, if present.
 * Firebase errors carry a string `code` like `auth/wrong-password`.
 */
export function getAuthErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code
    if (typeof code === 'string') return code
  }
  return undefined
}

/** Translate any thrown auth error into a user-facing Spanish message. */
export function authErrorMessage(err: unknown): string {
  const code = getAuthErrorCode(err)
  if (code && code in MESSAGES) return MESSAGES[code]
  // Our own config error (from firebase.ts) carries a useful Spanish message.
  if (err instanceof Error && err.message && !code) return err.message
  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}
