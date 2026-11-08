import { AuthService, UserAccount } from '../../../backend/src/index';

export class AuthController {
  static async login(body: {
    username?: string;
    password?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const { username = '', password = '' } = body || {};
    const user = await AuthService.authenticate(username, password);
    if (!user) {
      return {
        success: false,
        error:
          'Invalid username or password. Please verify your credentials.',
      };
    }
    return {
      success: true,
      user,
    };
  }

  static async getProfile(
    username?: string | null
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    if (!username) {
      return { success: false, error: 'Username is required.' };
    }
    const user = await AuthService.getUserByUsername(username);
    if (!user) {
      return { success: false, error: 'User profile not found.' };
    }
    return { success: true, user };
  }
}
