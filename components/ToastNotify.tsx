import { ToastContainer, toast, ToastOptions, Id } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 1500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'light',
};

const ToastNotify = {
  success: (msg: string, options?: ToastOptions) => {
    const id: Id = toast.info(
      <span className="flex items-center">
        <svg
          className="animate-spin h-5 w-5 mr-2 text-sky-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          ></path>
        </svg>
        <span className="text-sm">Processing...</span>
      </span>,
      {
        ...defaultOptions,
        ...options,
        autoClose: false,
        type: 'info',
        icon: false,
      }
    );
    setTimeout(() => {
      toast.update(id, {
        render: msg,
        type: 'success',
        autoClose: defaultOptions.autoClose,
        isLoading: false,
        icon: undefined,
        ...options,
      });
    }, 900);
  },
  error: (msg: any, options?: ToastOptions) => {
    const message = Array.isArray(msg) ? msg.join(', ') : msg;
    return toast.error(message, { ...defaultOptions, ...options });
  },
  info: (msg: string, options?: ToastOptions) =>
    toast.info(msg, { ...defaultOptions, ...options }),
  warn: (msg: string, options?: ToastOptions) =>
    toast.warn(msg, { ...defaultOptions, ...options }),
  container: ToastContainer,
};

export default ToastNotify;
