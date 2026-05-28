import { useEffect, useState } from 'react';
import { getPortalRestrictionStatus } from '@/lib/storage';

export function usePortalRestriction() {
  const [state, setState] = useState({
    loading: true,
    blocked: false,
    block: null,
    settings: null,
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const next = await getPortalRestrictionStatus();
        if (mounted) setState({ loading: false, ...next });
      } catch {
        if (mounted) setState({ loading: false, blocked: false, block: null, settings: null });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

export default usePortalRestriction;