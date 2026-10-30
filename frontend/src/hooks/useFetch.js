import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useFetch(path) {
  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(path);
      setData(response?.data ?? response);
      setPagination(response?.pagination ?? null);
      setMeta(response?.meta ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, pagination, meta, loading, error, reload: load, setData };
}
