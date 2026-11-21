import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  discoveryService,
  DiscoveryPartner,
  reportDiscoveryError,
  SpotPulse,
} from '../lib/discoveryService';

let nextChannel = 0;
export function useSpotDiscovery(spotIds: string[]) {
  const key = [...spotIds].sort().join(',');
  const [pulse, setPulse] = useState<Record<string, SpotPulse>>({});
  const [partners, setPartners] = useState<DiscoveryPartner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const [rows, entries] = await Promise.all([
        discoveryService.getPulse(key ? key.split(',') : []),
        discoveryService.getPartners(),
      ]);
      if (request !== generation.current) return;
      setPulse(Object.fromEntries(rows.map(row => [row.spot_id, row])));
      setPartners(entries);
      setError(null);
    } catch (err) {
      if (request === generation.current)
        setError(reportDiscoveryError('Spot discovery failed', err));
    }
  }, [key]);
  useEffect(() => {
    void refresh();
    const channel = supabase.channel(`discovery-${++nextChannel}`);
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => void refresh(), 200);
    };
    for (const table of ['live_checkins', 'spot_conditions', 'map_sponsors', 'partner_referrals']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    }
    channel.subscribe();
    const timer = setInterval(() => void refresh(), 30000);
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => {
      generation.current++;
      clearInterval(timer);
      clearTimeout(debounce);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [refresh]);
  return useMemo(() => ({ pulse, partners, error, refresh }), [pulse, partners, error, refresh]);
}
