import { apiRequest } from '@/lib/api/client';
import type { UpdateUserRoleRequest, UserProfileDto } from '@/types/api';

/**
 * Administration. ADMIN role required.
 *
 * One endpoint, and that is not an omission in this file — it is the whole admin API. There is no
 * user list, no vendor entity, no order list, no verification queue and no content or config
 * writes (plan §6.3). Which is why the roles screen asks for a user id rather than rendering a
 * table: there is no endpoint that can populate one.
 */

/**
 * Changes a user's role and returns the updated profile.
 *
 * The backend refuses to demote the last active administrator, which comes back as a 409/403 —
 * worth handling explicitly, since it is the one failure an admin is most likely to trigger and
 * the least likely to expect.
 */
export function updateUserRole(
  userId: string,
  body: UpdateUserRoleRequest
): Promise<UserProfileDto> {
  return apiRequest<UserProfileDto>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PUT',
    auth: true,
    body,
  });
}
