import { AuthService, UserAccount } from '../../../backend/src/index';

export class RbacMiddleware {
  static async verifyUser(username?: string | null): Promise<UserAccount> {
    if (!username) {
      throw new Error('Unauthorized: Authentication required.');
    }
    const user = await AuthService.getUserByUsername(username);
    if (!user) {
      throw new Error('Unauthorized: Invalid user session.');
    }
    return user;
  }

  static async requireAdmin(username?: string | null): Promise<UserAccount> {
    const user = await this.verifyUser(username);
    if (
      user.roleCode !== 'admin' &&
      !user.canManageClients &&
      !user.canManageStorage
    ) {
      throw new Error('Forbidden: Administrator privileges required.');
    }
    return user;
  }

  static async requireEdit(username?: string | null): Promise<UserAccount> {
    const user = await this.verifyUser(username);
    if (
      !user.canEdit &&
      !user.canEditForecast &&
      !user.canEditOperations &&
      !user.canManageClients &&
      !user.canManageStorage
    ) {
      throw new Error('Forbidden: Write/Edit permission required.');
    }
    return user;
  }

  static async requireDelete(username?: string | null): Promise<UserAccount> {
    const user = await this.verifyUser(username);
    if (
      !user.canDelete &&
      !user.canDeleteForecast &&
      !user.canDeleteOperations &&
      !user.canManageClients &&
      !user.canManageStorage
    ) {
      throw new Error('Forbidden: Delete permission required.');
    }
    return user;
  }
}
