import {
  ClipboardDocumentIcon,
  CheckIcon as ClipboardCheckIcon,
} from '@heroicons/react/24/outline';
import ToastNotify from './ToastNotify';
import React from 'react';

interface CopyButtonProps {
  value: string;
  copied: boolean;
  onCopied: () => void;
  title?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  copied,
  onCopied,
  title,
}) => (
  <button
    onClick={e => {
      e.stopPropagation(); // 阻止事件冒泡，防止触发表单提交
      navigator.clipboard.writeText(value);
      onCopied();
      ToastNotify.info('Copied!');
    }}
    title={title}
    className="text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none"
  >
    {copied ? (
      <ClipboardCheckIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
    ) : (
      <ClipboardDocumentIcon className="h-4 w-4" />
    )}
  </button>
);

export default CopyButton;
