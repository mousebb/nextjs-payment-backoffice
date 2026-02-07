import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({
  resource,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) => {
  const { can } = usePermission();

  return can(resource, action) ? <>{children}</> : <>{fallback}</>;
};

export const RoutePermissionGuard = ({
  resource,
  action,
  children,
}: Omit<PermissionGuardProps, 'fallback'>) => {
  const { can } = usePermission();
  const router = useRouter();

  useEffect(() => {
    if (!can(resource, action)) {
      router.push('/access-denied');
    }
  }, [can, resource, action, router]);

  return can(resource, action) ? <>{children}</> : null;
};
