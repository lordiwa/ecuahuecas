// Pure role-derivation helpers — no Firebase, no Vue. Kept separate from
// useRole.ts so the (security-relevant) derivation logic is unit-testable and
// SSG-safe (importable in Node with zero side effects).

/** Custom claims we care about. Anything else on the token is ignored here. */
export interface RoleClaims {
  admin?: boolean
  critico?: boolean
  [key: string]: unknown
}

/** True only when the `admin` custom claim is exactly the boolean `true`. */
export function deriveIsAdmin(claims: RoleClaims | null | undefined): boolean {
  return claims?.admin === true
}

/**
 * True when the user is a crítico OR an admin. Admins implicitly hold every
 * crítico capability, so we fold admin in here rather than at every call site.
 */
export function deriveIsCritico(claims: RoleClaims | null | undefined): boolean {
  return claims?.critico === true || deriveIsAdmin(claims)
}
