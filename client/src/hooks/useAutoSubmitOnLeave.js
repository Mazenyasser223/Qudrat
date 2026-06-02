import { useEffect, useRef } from 'react';
import axios from 'axios';

const getApiBaseUrl = () =>
  axios.defaults.baseURL ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

/**
 * Auto-submits an in-progress exam when the student leaves the page
 * (closes tab, refreshes, or navigates away in the app).
 */
export function useAutoSubmitOnLeave({
  enabled,
  getSubmitRequest,
  onAutoSubmit
}) {
  const getSubmitRequestRef = useRef(getSubmitRequest);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const submittedRef = useRef(false);

  useEffect(() => {
    getSubmitRequestRef.current = getSubmitRequest;
    onAutoSubmitRef.current = onAutoSubmit;
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    submittedRef.current = false;

    const submitOnce = (useKeepalive = false) => {
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;

      const request = getSubmitRequestRef.current?.();
      if (!request?.url || !request?.body) {
        return;
      }

      if (useKeepalive) {
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
        return;
      }

      onAutoSubmitRef.current?.();
    };

    const handlePageLeave = () => submitOnce(true);

    window.addEventListener('beforeunload', handlePageLeave);
    window.addEventListener('pagehide', handlePageLeave);

    return () => {
      window.removeEventListener('beforeunload', handlePageLeave);
      window.removeEventListener('pagehide', handlePageLeave);
      submitOnce(false);
    };
  }, [enabled]);
}
