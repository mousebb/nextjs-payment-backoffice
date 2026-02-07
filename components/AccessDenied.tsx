import { XCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface AccessDeniedProps {
  onBack: () => void;
  message?: string;
  buttonText?: string;
  title?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  onBack,
  message = 'You do not have permission to view this page.',
  buttonText = 'Go to Dashboard',
  title = 'Access Denied',
}) => (
  <div className="p-6 text-center bg-white dark:bg-gray-800 shadow-md rounded-lg">
    <XCircleIcon className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-red-600 dark:text-red-300">
      {title}
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
    <button
      onClick={onBack}
      className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
    >
      {buttonText}
    </button>
  </div>
);

export default AccessDenied;
