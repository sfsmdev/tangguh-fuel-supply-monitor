import { AuthService, UserAccount } from '../../../backend/src/index';

export class AuthController {
  static async login(body: {
    username?: string;
    password?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const { username = '', password = '' } = body || {};
    const user = AuthService.authenticate(username, password);
    if (!user) {
      return {
        success: false,
        error: 'Invalid username or password. Please verify your credentials.',
      };
    }
    return {
      success: true,
      user,
    };
  }
}

