'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { onApiError, type ApiErrorEvent } from '@/services/apiErrorEmitter';

function getErrorMessage(event: ApiErrorEvent): string {
  // Use backend message if available
  if (event.message) return event.message;

  // Generate message based on HTTP status
  switch (event.status) {
    case 400:
      return 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.';
    case 403:
      return 'Bạn không có quyền thực hiện hành động này.';
    case 404:
      return 'Không tìm thấy dữ liệu yêu cầu.';
    case 409:
      return 'Dữ liệu đã được cập nhật bởi yêu cầu khác. Vui lòng thử lại.';
    case 422:
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
    case 429:
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    case 500:
    case 502:
    case 503:
      return 'Lỗi hệ thống. Vui lòng thử lại sau.';
    default:
      return 'Có lỗi xảy ra. Vui lòng thử lại.';
  }
}

function getErrorTitle(event: ApiErrorEvent): string {
  const method = event.method?.toUpperCase() || '';

  if (event.status === 0 || !event.status) {
    return 'Mất kết nối';
  }

  if (method === 'GET') {
    return 'Tải dữ liệu thất bại';
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return 'Thao tác thất bại';
  }

  return 'Yêu cầu thất bại';
}

export default function GlobalErrorHandler() {
  const toast = useToast();
  const toastRef = useRef(toast);
  // Always keep the ref in sync (avoids stale closure)
  toastRef.current = toast;

  useEffect(() => {
    const unsubscribe = onApiError((event) => {
      const title = getErrorTitle(event);
      const message = getErrorMessage(event);
      toastRef.current.error(title, message);
    });

    return () => {
      unsubscribe();
    };
  }, []);


  return null;
}
