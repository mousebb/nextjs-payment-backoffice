import React from 'react';
import ReactDOM from 'react-dom';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
import FloatingLabelSelect from './FloatingLabelSelect';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface UpdateTransactionStatusModalProps {
  type: string;
  isOpen: boolean;
  oldStatus: string;
  newStatus: string;
  reason: string;
  sendNotification?: boolean;
  isLoading?: boolean;
  onChangeStatus: (v: string) => void;
  onChangeReason: (v: string) => void;
  onChangeSendNotification: (v: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const UpdateTransactionStatusModal: React.FC<
  UpdateTransactionStatusModalProps
> = ({
  type,
  isOpen,
  oldStatus,
  newStatus,
  reason,
  sendNotification = true,
  isLoading = false,
  onChangeStatus,
  onChangeReason,
  onChangeSendNotification,
  onCancel,
  onSubmit,
}) => {
  let t: any = (key: string) => key;
  try {
    t = useTranslations
      ? useTranslations('TransactionStatus')
      : (key: string) => key;
  } catch {}

  let statusOptions: string[] = [];
  if (oldStatus === 'pending' || oldStatus === 'submitted') {
    statusOptions = ['success', 'failed'];
  } else if (oldStatus === 'success') {
    statusOptions = ['failed'];
  } else if (oldStatus === 'failed') {
    statusOptions = ['success'];
  }

  if (!isOpen) return null;

  const modalContent = (
    <div
      onMouseDown={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 capitalize">
            Update {type} Status
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSubmit();
          }}
          className="p-6 space-y-4"
        >
          <FloatingLabelSelect
            id="new_status"
            name="new_status"
            label="New Status *"
            value={newStatus}
            onChange={e => onChangeStatus(e.target.value)}
          >
            <option value="" disabled>
              Select status
            </option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {t(status)}
              </option>
            ))}
          </FloatingLabelSelect>
          <FloatingLabelTextarea
            id="reason"
            name="reason"
            label="Reason"
            value={reason}
            onChange={e => onChangeReason(e.target.value)}
            rows={3}
            textareaClassName="resize-none"
          />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Send Callback Notification
            </label>
            <button
              type="button"
              onClick={() => onChangeSendNotification(!sendNotification)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sendNotification ? 'bg-sky-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sendNotification ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newStatus}
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== 'undefined' && typeof document !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null;
};

export default UpdateTransactionStatusModal;
