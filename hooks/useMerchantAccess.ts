import { useAuth } from '@/components/AuthContext';

interface AccessCheckResult {
  shouldProceed: boolean;
  error: string | null;
}

export const useMerchantAccess = () => {
  const { accessibleMerchantIds, user } = useAuth();

  // 检查用户权限和关联商户的函数
  const checkUserAccess = (): AccessCheckResult => {
    // 检查用户角色是否为 merchant
    const isMerchantRole = user?.roles?.includes('merchant');

    // 检查用户是否有关联的 merchant id
    const hasAccessibleMerchants =
      accessibleMerchantIds &&
      ((Array.isArray(accessibleMerchantIds) &&
        accessibleMerchantIds.length > 0) ||
        (typeof accessibleMerchantIds === 'string' &&
          accessibleMerchantIds.trim() !== ''));

    // 如果是 merchant 角色但没有关联的 merchant id，返回错误信息
    if (isMerchantRole && !hasAccessibleMerchants) {
      return {
        shouldProceed: false,
        error:
          'You have merchant role but no merchants are currently assigned to your account. Please contact an administrator to link merchants to your account.',
      };
    }

    return { shouldProceed: true, error: null };
  };

  return {
    checkUserAccess,
    accessibleMerchantIds,
    user,
  };
};
