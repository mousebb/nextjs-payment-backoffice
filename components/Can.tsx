// components/Can.tsx
import { ReactNode, useMemo } from 'react';
import { usePermission } from '@/hooks/usePermission';

type CanProps = {
  checks?: { resource: string; action: string }[];
  all?: boolean;
  resource?: string;
  action?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

const Can = ({
  checks,
  all = false,
  resource,
  action,
  children,
  fallback = null,
}: CanProps) => {
  const { can, canAny, canAll } = usePermission();

  const isAllowed = useMemo(() => {
    if (checks && checks.length > 0) {
      return all ? canAll(checks) : canAny(checks);
    } else if (resource && action) {
      return can(resource, action);
    }
    return false;
  }, [checks, resource, action, can, canAny, canAll]);

  return isAllowed ? <>{children}</> : <>{fallback}</>;
};

export default Can;
