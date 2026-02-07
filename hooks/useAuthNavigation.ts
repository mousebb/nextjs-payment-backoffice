import { useRouter } from 'next/navigation';
import { usePermission } from './usePermission';

export const useAuthNavigation = () => {
  const { can } = usePermission();
  const router = useRouter();

  const authPush = (
    path: string,
    requiredPermission: { resource: string; action: string },
    options?: { scroll?: boolean }
  ) => {
    if (can(requiredPermission.resource, requiredPermission.action)) {
      router.push(path, options);
    } else {
      router.push('/access-denied', options);
    }
  };

  return { authPush };
};
