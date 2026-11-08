import { RBAC_USERS, UserAccount } from '../models/User';

export class AuthService {
  static authenticate(
    usernameInput: string,
    passwordInput: string
  ): UserAccount | null {
    const cleanUsername = (usernameInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    const matchedUser = RBAC_USERS[cleanUsername];
    if (
      !matchedUser ||
      (matchedUser.password !== cleanPassword &&
        matchedUser.password?.toLowerCase() !== cleanPassword.toLowerCase())
    ) {
      return null;
    }

    const { password: _, ...safeUser } = matchedUser;
    return safeUser;
  }

  static getUserByUsername(usernameInput: string): UserAccount | null {
    const cleanUsername = (usernameInput || '').trim().toLowerCase();
    const matchedUser = RBAC_USERS[cleanUsername];
    if (!matchedUser) return null;
    const { password: _, ...safeUser } = matchedUser;
    return safeUser;
  }
}

