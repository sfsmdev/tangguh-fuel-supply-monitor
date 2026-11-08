import { UserAccount } from '../models/User';
import { SupabaseProvider } from '../db/SupabaseProvider';

/**
 * Authentication Service backed directly by Supabase (`public.app_users` & `public.rbac_roles`).
 * No usernames or passwords are hardcoded in application source code.
 */
export class AuthService {
  static async authenticate(
    usernameInput: string,
    passwordInput: string
  ): Promise<UserAccount | null> {
    const cleanUsername = (usernameInput || '').trim();
    const cleanPassword = (passwordInput || '').trim();

    if (!cleanUsername || !cleanPassword) {
      return null;
    }

    return SupabaseProvider.authenticateUser(cleanUsername, cleanPassword);
  }

  static async getUserByUsername(
    usernameInput: string
  ): Promise<UserAccount | null> {
    const cleanUsername = (usernameInput || '').trim();
    if (!cleanUsername) {
      return null;
    }

    return SupabaseProvider.getUserProfile(cleanUsername);
  }
}
