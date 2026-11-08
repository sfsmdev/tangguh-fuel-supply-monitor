import { AuthService, UserAccount } from '../../../backend/src/index';

export class RbacMiddleware {
  static verifyUser(username?: string | null): UserAccount {
    if (!username) {
      throw new Error('Unauthorized: Authentication required.');
    }
    const user = AuthService.getUserByUsername(username);
    if (!user) {
      throw new Error('Unauthorized: Invalid user session.');
    }
    return user;
  }

  static requireAdmin(username?: string | null): UserAccount {
    const user = this.verifyUser(username);
    if (!user.canManageClients || !user.canManageStorage) {
      throw new Error('Forbidden: Administrator privileges required.');
    }
    return user;
  }

  static requireEdit(username?: string | null): UserAccount {
    const user = this.verifyUser(username);
    if (!user.canEdit) {
      throw new Error('Forbidden: Write/Edit permission required.');
    }
    return user;
  }

  static requireDelete(username?: string | null): UserAccount {
    const user = this.verifyUser(username);
    if (!user.canDelete) {
      throw new Error('Forbidden: Delete permission required.');
    }
    return user;
  }
}

