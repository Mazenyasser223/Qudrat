import { useEffect, useRef } from 'react';
import axios from 'axios';

const getApiBaseUrl = () =>
  axios.defaults.baseURL ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

/**
 * Auto-submits an in-progress exam when the student closes the tab or refreshes.
 * In-app navigation (e.g. Back button) does NOT trigger auto-submit.
 */
export function useAutoSubmitOnLeave({
  enabled,
  getSubmitRequest
}) {
  const getSubmitRequestRef = useRef(getSubmitRequest);
  const submittedRef = useRef(false);

  useEffect(() => {
    getSubmitRequestRef.current = getSubmitRequest;
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    submittedRef.current = false;

    const handlePageLeave = () => {
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;

      const request = getSubmitRequestRef.current?.();
      if (!request?.url || !request?.body) {
        return;
      }

      const baseUrl = getApiBaseUrl();
      const fullUrl = request.url.startsWith('http')
        ? request.url
        : `${baseUrl}${request.url}`;

      const headers = {
        'Content-Type': 'application/json',
        ...(request.token ? { Authorization: `Bearer ${request.token}` } : {})
      };

      fetch(fullUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.body),
        keepalive: true
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handlePageLeave);
    window.addEventListener('pagehide', handlePageLeave);

    return () => {
      window.removeEventListener('beforeunload', handlePageLeave);
      window.removeEventListener('pagehide', handlePageLeave);
    };
  }, [enabled]);
}
