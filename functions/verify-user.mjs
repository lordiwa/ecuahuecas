// One-off: marca el email de un usuario de Firebase Auth como verificado
// (email_verified = true), para que pase el gate de admin que exige email
// verificado. NO es parte del deploy; se corre a mano una sola vez.
//
//   node verify-user.mjs <UID>
//
// Credenciales: usa Application Default Credentials. Antes de correrlo, una vez:
//   gcloud auth application-default login
// o exporta GOOGLE_APPLICATION_CREDENTIALS apuntando a un service account JSON
// (Firebase Console -> Configuracion del proyecto -> Cuentas de servicio ->
//  Generar nueva clave privada).
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const uid = process.argv[2]
if (!uid) {
  console.error('Uso: node verify-user.mjs <UID>')
  process.exit(1)
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'ecuahuecas',
})

try {
  const before = await getAuth().getUser(uid)
  console.log(`Usuario: ${before.email}  (verificado antes: ${before.emailVerified})`)

  await getAuth().updateUser(uid, { emailVerified: true })

  const after = await getAuth().getUser(uid)
  console.log(`Listo. Verificado ahora: ${after.emailVerified}`)
} catch (err) {
  console.error('Error:', err.message || err)
  process.exit(1)
}
