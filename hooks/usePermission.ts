import { useContext, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/AuthContext';

export type Permission = {
  resource: string;
  action: string;
};

export const usePermission = () => {
  const { user } = useAuth();

  const userPermissions = useMemo(() => {
    return (user?.permissions || []).map(perm => {
      const [resource, action] = perm.split(':');
      return { resource, action };
    });
  }, [user?.permissions]);

  const can = useCallback(
    (resource: string, action: string) => {
      // 检查是否有 all:* 权限
      if (
        userPermissions.some(
          perm =>
            perm.resource === 'all' &&
            (perm.action === '*' || perm.action === action)
        )
      ) {
        return true;
      }

      return userPermissions.some(
        perm => perm.resource === resource && perm.action === action
      );
    },
    [userPermissions]
  );

  const canAny = useCallback(
    (checks: { resource: string; action: string }[]) => {
      return checks.some(check => can(check.resource, check.action));
    },
    [can]
  );

  const canAll = useCallback(
    (checks: { resource: string; action: string }[]) => {
      return checks.every(check => can(check.resource, check.action));
    },
    [can]
  );

  return { can, canAny, canAll };
};
