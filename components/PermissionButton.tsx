import { ButtonHTMLAttributes } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  resource: string;
  action: string;
}

export const PermissionButton = ({
  resource,
  action,
  children,
  ...props
}: PermissionButtonProps) => {
  const { can } = usePermission();

  if (!can(resource, action)) return null;

  return <button {...props}>{children}</button>;
};
