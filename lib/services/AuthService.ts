import { supabase } from '@/lib/supabase'

export interface AuthIdentity {
  userId: string
  email?: string
  role?: string
  claims: Record<string, any>
}

export type AuthRequestFailureReason = 'missing-authorization' | 'invalid-token'

export type AuthRequestResult =
  | { ok: true; token: string; identity: AuthIdentity }
  | { ok: false; status: number; reason: AuthRequestFailureReason }

export class AuthService {
  /**
   * Attempts to resolve the current authenticated identity using the active session (client-side).
   */
  public static async getClientIdentity(options?: { allowExpired?: boolean }): Promise<AuthIdentity | null> {
    return this.fetchIdentity(undefined, options)
  }

  /**
   * Resolves an identity from a provided JWT (server-side or custom flows).
   */
  public static async getIdentityFromToken(
    token: string,
    options?: { allowExpired?: boolean }
  ): Promise<AuthIdentity | null> {
    if (!token) {
      return null
    }
    return this.fetchIdentity(token, options)
  }

  /**
   * Convenience helper for API routes to authenticate a request using the Authorization header.
   */
  public static async authenticateRequest(headers: Headers): Promise<AuthRequestResult> {
    const token = this.getBearerToken(headers)
    if (!token) {
      return { ok: false, status: 401, reason: 'missing-authorization' }
    }

    const identity = await this.getIdentityFromToken(token)
    if (!identity) {
      return { ok: false, status: 401, reason: 'invalid-token' }
    }

    return { ok: true, token, identity }
  }

  /**
   * Extracts the bearer token from a set of headers.
   */
  public static getBearerToken(headers: Headers): string | null {
    const authHeader =
      headers.get('authorization') ??
      headers.get('Authorization') ??
      headers.get('AUTHORIZATION')

    if (!authHeader) {
      return null
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    return match?.[1]?.trim() ?? null
  }

  private static async fetchIdentity(
    token?: string,
    options?: { allowExpired?: boolean }
  ): Promise<AuthIdentity | null> {
    try {
      const { data, error } = await supabase.auth.getClaims(token, options)

      if (error || !data?.claims) {
        if (error) {
          console.warn('[AuthService] getClaims error', error)
        }
        return null
      }

      return this.normalizeClaims(data.claims)
    } catch (err) {
      console.error('[AuthService] Unexpected error while fetching claims', err)
      return null
    }
  }

  private static normalizeClaims(claims: Record<string, any>): AuthIdentity | null {
    if (!claims || typeof claims !== 'object') {
      return null
    }

    const candidateIds = [
      claims.sub,
      claims.user_id,
      claims.userId,
      claims.id,
    ]

    const userId = candidateIds.find((value) => typeof value === 'string' && value.length > 0)

    if (!userId) {
      console.warn('[AuthService] Claims payload missing user identifier', claims)
      return null
    }

    const email =
      typeof claims.email === 'string'
        ? claims.email
        : typeof claims.user_email === 'string'
          ? claims.user_email
          : undefined

    const role = typeof claims.role === 'string' ? claims.role : undefined

    return {
      userId,
      email,
      role,
      claims,
    }
  }
}

