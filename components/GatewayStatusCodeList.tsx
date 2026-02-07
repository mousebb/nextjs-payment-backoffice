'use client';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  CONFIG,
  ENUM_CONFIG,
  DEFAULT_PAGE_SIZE,
  WEB_ACTION_METHODS,
  ACCESS_LOG_TYPE,
} from '../constants/config';
import { API_ROUTES } from '../constants/apiRoutes';
import { authFetch, recordAccessLog } from '@/lib/utils';
import { getBasicData } from '@/lib/basic-data.service';
import LocalPagingList from './LocalPagingList';
import { ListColumn, ActionDropdownItem } from '../types/list';
import EditGatewayStatusCodeModal from './EditGatewayStatusCodeModal';
import ConfirmationModal from './ConfirmationModal';
import ToastNotify from './ToastNotify';
import FloatingLabelSelect from './FloatingLabelSelect';
import CustomCheckbox from './CustomCheckbox';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBasicData } from '@/hooks/useBasicData';

interface ApiGatewayStatusCode {
  id: string;
  gateway_id: string;
  gateway_name: string;
  gateway_status_code: string;
  internal_status_code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const GatewayStatusCodeList: React.FC = () => {
  const { logout, userRole, user } = useAuth();
  const [codes, setCodes] = useState<ApiGatewayStatusCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('gateway_name');
  const [sortOrder, setSortOrder] = useState<
    ENUM_CONFIG.ASC | ENUM_CONFIG.DESC
  >(ENUM_CONFIG.ASC);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<ApiGatewayStatusCode | null>(
    null
  );
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<ApiGatewayStatusCode | null>(
    null
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [isBatchUploadModalOpen, setBatchUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [gateways, setGateways] = useState<any[]>([]);
  const { isLoading: isBasicDataLoading, refresh: refreshBasicData } =
    useBasicData();

  const handleRefresh = () => setRefreshKey(k => k + 1);
  const handleAdd = () => {
    setEditingCode(null);
    setAddModalOpen(true);
  };

  const handleEdit = (row: ApiGatewayStatusCode) => {
    setEditingCode(row);
    setAddModalOpen(true);
  };

  const handleDelete = (row: ApiGatewayStatusCode) => {
    setDeletingCode(row);
    setDeleteConfirmOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Get filtered data based on current search term
      const filteredData = codes.filter(item => {
        const s = search.trim().toLowerCase();
        return (
          (item.gateway_name?.toLowerCase() || '').includes(s) ||
          (item.gateway_status_code?.toLowerCase() || '').includes(s) ||
          (item.internal_status_code?.toLowerCase() || '').includes(s) ||
          (item.description?.toLowerCase() || '').includes(s)
        );
      });
      setSelectedItems(new Set(filteredData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCode) return;
    const startTime = Date.now();
    let res: Response | null = null;
    try {
      res = await authFetch(
        `${CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES}/${deletingCode.id}`,
        {
          method: 'DELETE',
        }
      );
      if (res && res.ok) {
        ToastNotify.success('Deleted successfully');
        handleRefresh();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to delete');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to delete');
    } finally {
      await recordAccessLog({
        path: `/gateways-status-codes`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify({
          name: deletingCode.gateway_name,
          id: deletingCode.id,
        }),
        response: JSON.stringify(res),
        duration_ms: Date.now() - startTime,
      });
      setDeleteConfirmOpen(false);
      setDeletingCode(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedItems.size === 0) return;
    setBatchDeleteConfirmOpen(true);
  };

  const handleBatchUpload = () => {
    setBatchUploadModalOpen(true);
    fetchGateways();
  };

  const fetchGateways = async () => {
    try {
      const data = await getBasicData(
        'gateways',
        CONFIG.API_BASE_URL + API_ROUTES.GATEWAYS
      );
      setGateways(data || []);
    } catch (e) {
      setGateways([]);
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());

    // Validate headers
    const expectedHeaders = [
      'status code',
      'internal status code',
      'description',
    ];
    if (!expectedHeaders.every(h => headers.includes(h))) {
      throw new Error(
        'Invalid CSV format. Expected headers: status code; internal status code; description'
      );
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      if (values.length >= 3) {
        items.push({
          gateway_status_code: values[0],
          internal_status_code: values[1] || null,
          description: values[2] || null,
        });
      }
    }

    return items;
  };

  const handleUploadSubmit = async () => {
    if (!uploadedFile || !selectedGatewayId) {
      ToastNotify.error('Please select a gateway and upload a CSV file');
      return;
    }

    setIsUploading(true);
    const startTime = Date.now();
    let res: Response | null = null;
    let uploadData: any = {};
    try {
      const text = await uploadedFile.text();
      const items = parseCSV(text);

      uploadData = {
        gateway_id: selectedGatewayId,
        items: items,
      };

      res = await authFetch(
        `${CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES_BATCH_UPLOAD}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData),
        }
      );

      if (res && res.ok) {
        ToastNotify.success(`Successfully uploaded ${items.length} items`);
        setBatchUploadModalOpen(false);
        setUploadedFile(null);
        setSelectedGatewayId('');
        handleRefresh();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to upload items');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to process file');
    } finally {
      await recordAccessLog({
        path: `/gateways-status-codes`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.CREATE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(uploadData),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setIsUploading(false);
    }
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;
    const startTime = Date.now();
    let res: Response | null = null;
    let selectedIds: string[] = [];
    try {
      selectedIds = Array.from(selectedItems);
      res = await authFetch(
        `${CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES_BATCH_DELETE}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedIds),
        }
      );
      if (res && res.ok) {
        ToastNotify.success(`Successfully deleted ${selectedItems.size} items`);
        setSelectedItems(new Set());
        handleRefresh();
      } else {
        const err = await res?.json().catch(() => ({}));
        ToastNotify.error(err.message || 'Failed to delete items');
      }
    } catch (e: any) {
      ToastNotify.error(e.message || 'Failed to delete items');
    } finally {
      await recordAccessLog({
        path: `/gateways-status-codes`,
        type: ACCESS_LOG_TYPE.WEB,
        method: WEB_ACTION_METHODS.DELETE,
        user_id: user?.id,
        ip_address: user?.ip_address || '',
        status_code: res?.status || 200,
        request: JSON.stringify(selectedIds),
        response: res?.ok ? JSON.stringify(res.status) : '',
        duration_ms: Date.now() - startTime,
      });
      setBatchDeleteConfirmOpen(false);
    }
  };

  useEffect(() => {
    const fetchCodes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = CONFIG.API_BASE_URL + API_ROUTES.GATEWAY_STATUS_CODES;
        const response = await authFetch(apiUrl);
        if (!response) {
          logout();
          return;
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: 'Failed to fetch gateway status codes' }));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        }
        const result: ApiGatewayStatusCode[] = await response.json();
        setCodes(result || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setCodes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCodes();
  }, [logout, userRole, refreshKey]);

  const handleClose = () => {
    setUploadedFile(null);
    setSelectedGatewayId('');
    setBatchUploadModalOpen(false);
  };

  const filter = (item: ApiGatewayStatusCode, search: string) => {
    const s = search.trim().toLowerCase();
    return (
      (item.gateway_name?.toLowerCase() || '').includes(s) ||
      (item.gateway_status_code?.toLowerCase() || '').includes(s) ||
      (item.internal_status_code?.toLowerCase() || '').includes(s) ||
      (item.description?.toLowerCase() || '').includes(s)
    );
  };

  // Get filtered data count for select all checkbox
  const filteredDataCount = React.useMemo(() => {
    if (!search.trim()) return codes.length;
    return codes.filter(item => filter(item, search)).length;
  }, [codes, search]);

  const columns: ListColumn<ApiGatewayStatusCode>[] = [
    {
      key: 'select',
      title: (
        // <input
        //   type="checkbox"
        //   className="appearance-none bg-gray-50 checked:bg-sky-500 checked:border-transparent border border-gray-400 h-4 w-4 rounded "
        //   checked={selectedItems.size === filteredDataCount && filteredDataCount > 0}
        //   onChange={(e) => handleSelectAll(e.target.checked)}
        // />
        <CustomCheckbox
          isRound={false}
          checked={
            selectedItems.size === filteredDataCount && filteredDataCount > 0
          }
          indeterminate={
            selectedItems.size > 0 && selectedItems.size < filteredDataCount
          }
          onChange={e => handleSelectAll(e.target.checked)}
        />
      ),
      align: 'center',
      sortable: false,
      render: (_, row) => (
        // <input
        //   type="checkbox"
        //   className="appearance-none bg-gray-50 checked:bg-sky-300 checked:border-transparent border border-gray-400 h-4 w-4 rounded-full"
        //   checked={selectedItems.has(row.id)}
        //   onChange={(e) => handleSelectItem(row.id, e.target.checked)}
        // /> */}
        <CustomCheckbox
          checked={selectedItems.has(row.id)}
          onChange={e => handleSelectItem(row.id, e.target.checked)}
        />
      ),
    },
    { key: 'gateway_name', title: 'Gateway Name' },
    { key: 'gateway_status_code', title: 'Gateway Status Code' },
    { key: 'internal_status_code', title: 'Internal Status Code' },
    { key: 'description', title: 'Description' },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleDelete(row)}
            title="Delete"
          >
            <TrashIcon className="h-4 w-4 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  const actions: ActionDropdownItem[] = [
    {
      label: 'Refresh',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      onClick: handleRefresh,
      disabled: isLoading,
    },
    {
      label: 'Batch Upload',
      icon: <ArrowUpTrayIcon className="h-4 w-4" />,
      onClick: handleBatchUpload,
      disabled: isLoading,
    },
    {
      label: 'Batch Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: handleBatchDelete,
      disabled: isLoading || selectedItems.size === 0,
    },
  ];

  return (
    <>
      <LocalPagingList
        columns={columns}
        rawData={codes}
        searchTerm={search}
        onSearchTermChange={setSearch}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={col => {
          if (sortColumn === col) {
            setSortOrder(prev =>
              prev === ENUM_CONFIG.ASC ? ENUM_CONFIG.DESC : ENUM_CONFIG.ASC
            );
          } else {
            setSortColumn(col);
            setSortOrder(ENUM_CONFIG.ASC);
          }
          setCurrentPage(1);
        }}
        itemsPerPage={DEFAULT_PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
        error={error}
        addButton={{ label: 'Add Gateway Status Code', onClick: handleAdd }}
        actions={actions}
        searchPlaceholder="Search by Gateway Name, Status Code, Internal Status Code, Description..."
        filterFunction={filter}
      />
      <EditGatewayStatusCodeModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          handleRefresh();
        }}
        editData={editingCode}
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Gateway Status Code"
        message="Are you sure you want to delete this gateway status code? This action cannot be undone."
        confirmText="Delete"
      />
      <ConfirmationModal
        isOpen={isBatchDeleteConfirmOpen}
        onClose={() => setBatchDeleteConfirmOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title="Batch Delete Gateway Status Codes"
        message={`Are you sure you want to delete ${selectedItems.size} selected gateway status code(s)? This action cannot be undone.`}
        confirmText="Delete All"
        customContent={
          <div className="mt-4 max-h-40 overflow-y-auto">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected items:
            </div>
            <div className="space-y-1">
              {Array.from(selectedItems).map(id => {
                const item = codes.find(code => code.id === id);
                return item ? (
                  <div
                    key={id}
                    className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        Name: {item.gateway_name},{' '}
                      </span>
                      <span>Code: {item.gateway_status_code}, </span>
                      <span>
                        Internal Code: {item.internal_status_code || 'N/A'}
                      </span>
                    </div>
                    {item.description && (
                      <div className="mt-1 text-gray-500 dark:text-gray-500">
                        Description: {item.description}
                      </div>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        }
      />
      {/* Batch Upload Modal */}
      {isBatchUploadModalOpen && (
        <div
          onMouseDown={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 transform transition-all overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Batch Upload Gateway Status Codes
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FloatingLabelSelect
                id="gateway_id"
                name="gateway_id"
                label="Gateway Name *"
                value={selectedGatewayId}
                onChange={e => setSelectedGatewayId(e.target.value)}
                disabled={isUploading}
              >
                <option value="">Select Gateway</option>
                {gateways.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </FloatingLabelSelect>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upload CSV File *
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploadedFile
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-sky-400 dark:hover:border-sky-500'
                  }`}
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      if (
                        file.type === 'text/csv' ||
                        file.name.endsWith('.csv')
                      ) {
                        handleFileUpload(file);
                      } else {
                        ToastNotify.error('Please upload a CSV file');
                      }
                    }
                  }}
                >
                  {uploadedFile ? (
                    <div>
                      <div className="text-sky-600 dark:text-sky-400 font-medium">
                        {uploadedFile.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Click to change file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">
                        <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2" />
                        <p>Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          CSV file only
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Expected CSV format: status code; internal status code;
                  description
                </div>
                <div className="text-xs">
                  <a
                    href="/demo-upload-gateway-status-code.csv"
                    download
                    className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline"
                  >
                    Download demo CSV file
                  </a>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !uploadedFile || !selectedGatewayId}
                  className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GatewayStatusCodeList;
