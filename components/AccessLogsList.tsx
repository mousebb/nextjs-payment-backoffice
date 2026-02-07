import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  WEB_ACTION_METHODS,
  DEFAULT_PAGE_SIZE,
  ACCESS_LOG_TYPE,
  ALL_ACTION_METHODS,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  authFetch,
  getClientDateTime,
  getUtcDate,
  formatDateByUser,
} from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import RemotePagingList from './RemotePagingList';
import { ListColumn } from '../types/list';
import CommonSelect from './CommonSelect';
import CustomDateRangePicker from './CustomDateRangePicker';
import type { RangeValue } from '@react-types/shared';
import { CalendarDate } from '@internationalized/date';
import { usePermission } from '@/hooks/usePermission';
import AccessLogDetailModal from './AccessLogDetailModal';
import { useBasicData } from '@/hooks/useBasicData';

interface AccessLog {
  id: string;
  type: string;
  method: string;
  path: string;
  status_code: number;
  ip_address: string;
  duration_ms: number;
  user_id: string;
  username: string;
  role_name: string;
  created_at: string;
}

const AccessLogsList: React.FC = () => {
  const { logout, user } = useAuth();
  const { can } = usePermission();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.DESC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / DEFAULT_PAGE_SIZE);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  // 新增筛选项
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedType, setSelectedType] = useState(ACCESS_LOG_TYPE.WEB);
  const [selectedDateRange, setSelectedDateRange] = useState<
    RangeValue<CalendarDate>
  >(() => {
    const today = new CalendarDate(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { start: today, end: today };
  });

  // 下拉选项
  const [usernameOptions, setUsernameOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const typeOptions = useMemo(
    () =>
      Object.entries(ACCESS_LOG_TYPE).map(([k, v]) => ({
        id: k,
        name: v.toUpperCase(),
      })),
    []
  );

  // 2. action 联动
  const webActions = [
    { id: WEB_ACTION_METHODS.VIEW, name: 'VIEW' },
    { id: WEB_ACTION_METHODS.CREATE, name: 'CREATE' },
    { id: WEB_ACTION_METHODS.UPDATE, name: 'UPDATE' },
    { id: WEB_ACTION_METHODS.LOGIN, name: 'LOGIN' },
    { id: WEB_ACTION_METHODS.DELETE, name: 'DELETE' },
  ];
  const apiActions = [
    { id: 'GET', name: 'GET' },
    { id: 'POST', name: 'POST' },
    { id: 'PUT', name: 'PUT' },
    { id: 'DELETE', name: 'DELETE' },
  ];

  const methodOptions = useMemo(() => {
    if (selectedType === ACCESS_LOG_TYPE.WEB) {
      return webActions;
    }
    if (selectedType === ACCESS_LOG_TYPE.API) {
      return apiActions;
    }
    return [];
  }, [selectedType]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<any>(null);

  useEffect(() => {
    // 使用缓存的基础数据获取用户和角色
    const fetchBasicData = async () => {
      try {
        const [users, roles] = await Promise.all([
          getBasicData('users', CONFIG.API_BASE_URL + API_ROUTES.USERS),
          getBasicData('roles', CONFIG.API_BASE_URL + API_ROUTES.ROLES),
        ]);

        setUsernameOptions(
          Array.isArray(users)
            ? users.map(u => ({ id: u.id, name: u.username }))
            : []
        );
        setRoleOptions(
          Array.isArray(roles)
            ? roles.map(r => ({ id: r.id, name: r.name }))
            : []
        );
      } catch (error) {
        console.error('Error fetching basic data:', error);
      }
    };

    if (
      can('access_log', 'view') &&
      can('user', 'view') &&
      can('role', 'view')
    ) {
      fetchBasicData();
    }
  }, []);

  // useEffect(() => {
  //   if (user && !user.roles.includes(RolesEnum.ADMIN)) {
  //     setSelectedType(ACCESS_LOG_TYPE.WEB);
  //   }
  // }, [user]);

  const handleUserChange = (v: string) => {
    setSelectedUser(v);
    setCurrentPage(1);
  };
  const handleRoleChange = (v: string) => {
    setSelectedRole(v);
    setCurrentPage(1);
  };
  const handleMethodChange = (v: string) => {
    setSelectedMethod(v);
    setCurrentPage(1);
  };
  const handleTypeChange = (v: string) => {
    setSelectedType(v as ACCESS_LOG_TYPE);
    setSelectedMethod(''); // 切换 type 时重置 action
    setCurrentPage(1);
  };
  const handleDateRangeChange = (v: RangeValue<CalendarDate>) => {
    setSelectedDateRange(v);
    setCurrentPage(1);
  };
  const handleRefresh = () => setRefreshKey(k => k + 1);
  const handleSearchTermChange = (val: string) => {
    setSearchTerm(val);
    setRefreshKey(k => k + 1);
  };
  const handleSort = useCallback(
    (columnName: string) => {
      if (sortColumn === columnName) {
        setSortOrder(prev =>
          prev === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
        );
      } else {
        setSortColumn(columnName);
        setSortOrder(ENUM_CONFIG.ASC);
      }
      setCurrentPage(1);
    },
    [sortColumn]
  );

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', DEFAULT_PAGE_SIZE.toString());
        params.append('orderBy', sortColumn);
        params.append('orderDirection', sortOrder);
        // 搜索只支持username和ip_address
        if (searchTerm.trim()) {
          // params.append('username', searchTerm.trim());
          // params.append('ip_address', searchTerm.trim());
          params.append('body', searchTerm.trim());
        }
        if (selectedUser) params.append('user_id', selectedUser);
        if (selectedRole) params.append('role_id', selectedRole);
        if (selectedMethod) params.append('method', selectedMethod);
        if (selectedType) params.append('type', selectedType);
        if (selectedDateRange) {
          if (selectedDateRange.start) {
            params.append(
              'start',
              `${getUtcDate(selectedDateRange.start.toString(), true).toISOString()}`
            );
          }
          if (selectedDateRange.end) {
            params.append(
              'end',
              `${getUtcDate(selectedDateRange.end.toString(), false).toISOString()}`
            );
          }
        }
        const apiUrl =
          CONFIG.API_BASE_URL +
          API_ROUTES.ACCESS_LOGS +
          `?${params.toString()}`;
        const response = await authFetch(apiUrl);
        if (!response) {
          // authFetch 返回 null 表示 CSRF token 过期，已经自动跳转到登录页面
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch access logs' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result = await response.json();
        setLogs(result.data || []);
        setTotalItems(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [
    refreshKey,
    currentPage,
    sortColumn,
    sortOrder,
    searchTerm,
    selectedUser,
    selectedRole,
    selectedMethod,
    selectedType,
    selectedDateRange,
  ]);

  const ActionBadge = ({ method }: { method: string }) => {
    let colorClasses = '';
    let IconComponent = null;

    switch (method) {
      case 'LOGIN':
        colorClasses =
          'bg-lime-100 text-lime-700 dark:bg-lime-700 dark:bg-opacity-25 dark:text-lime-400';
        break;
      case 'VIEW':
      case 'GET':
        colorClasses =
          'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:bg-opacity-25 dark:text-teal-400';
        break;
      case 'CREATE':
      case 'POST':
        colorClasses =
          'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:bg-opacity-25 dark:text-amber-400';
        break;
      case 'UPDATE':
      case 'PUT':
        colorClasses =
          'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:bg-opacity-25 dark:text-blue-400';
        break;
      case 'DELETE':
        colorClasses =
          'bg-rose-100 text-rose-700 dark:bg-rose-700 dark:bg-opacity-25 dark:text-rose-400';
        break;
      default:
        colorClasses =
          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:bg-opacity-25 dark:text-gray-400';
      // IconComponent = <InformationCircleIcon className="h-3.5 w-3.5 mr-1" />;
      // text already correctly set for default
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {IconComponent}
        {method}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: number }) => {
    let colorClasses = '';
    switch (status) {
      case 200:
      case 201:
      case 202:
      case 204:
        colorClasses =
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:bg-opacity-25 dark:text-emerald-400';
        break;
      default:
        colorClasses =
          'bg-orange-100 text-orange-600 dark:bg-orange-700 dark:bg-opacity-25 dark:text-orange-400';
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}
      >
        {status}
      </span>
    );
  };

  const columns: ListColumn<AccessLog>[] = [
    { key: 'username', title: 'User Name', sortable: true },
    // { key: 'role_name', title: 'Role', sortable: true },
    { key: 'type', title: 'Type', sortable: true },
    {
      key: 'method',
      title: 'Action',
      sortable: true,
      render: (v: string) => <ActionBadge method={v} />,
    },
    {
      key: 'path',
      title: 'Path',
      sortable: true,
      render: (v: string) => (
        <span title={v}>{v.length > 20 ? `${v.substring(0, 20)}...` : v}</span>
      ),
    },
    {
      key: 'status_code',
      title: 'Status',
      sortable: true,
      render: (v: number) => <StatusBadge status={v} />,
    },
    { key: 'duration_ms', title: 'Duration(ms)', sortable: true },
    { key: 'ip_address', title: 'IP Address', sortable: true },
    {
      key: 'created_at',
      title: 'Created At',
      sortable: true,
      render: (v: string) =>
        formatDateByUser(v, user?.metadata?.data_time_format),
    },
  ];

  const actions = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
  ];

  // 搜索输入框和filters
  const filters = (
    <>
      {can('user', 'view') && can('role', 'view') && (
        <>
          <CommonSelect
            value={selectedUser}
            onChange={handleUserChange}
            options={usernameOptions}
            placeholder="User Name"
          />
          <CommonSelect
            value={selectedRole}
            onChange={handleRoleChange}
            options={roleOptions}
            placeholder="Role"
          />
          <CommonSelect
            value={selectedType}
            onChange={handleTypeChange}
            options={typeOptions}
            placeholder="Type"
          />
        </>
      )}
      <CommonSelect
        value={selectedMethod}
        onChange={handleMethodChange}
        options={methodOptions}
        placeholder="Action"
      />
      <CustomDateRangePicker
        value={selectedDateRange}
        onChange={handleDateRangeChange}
      />
    </>
  );

  // 点击行获取详情并弹窗
  const handleRowClick = async (log: AccessLog) => {
    try {
      const res = await authFetch(
        CONFIG.API_BASE_URL + API_ROUTES.ACCESS_LOGS + '/' + log.id
      );
      if (res && res.ok) {
        const data = await res.json();
        setDetailLog(data);
        setDetailModalOpen(true);
      } else {
        setDetailLog(null);
      }
    } catch {
      setDetailLog(null);
    }
  };

  return (
    <>
      <RemotePagingList
        showSearchBar={true}
        columns={columns}
        data={logs}
        totalItems={totalItems}
        isLoading={isLoading}
        error={error}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        searchPlaceholder="Search by Request or Response..."
        filters={filters}
        actions={actions}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
        showCheckboxColumn={false}
        onRefresh={handleRefresh}
        onRowClick={handleRowClick}
      />
      <AccessLogDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        log={detailLog}
      />
    </>
  );
};

export default AccessLogsList;
