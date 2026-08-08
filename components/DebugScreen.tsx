import React, { useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

export default function DebugScreen() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

    const checks = [
      `SUPABASE_URL: ${(extra.supabaseUrl as string) ? 'OK' : 'MISSING'}`,
      `SUPABASE_KEY: ${(extra.supabaseAnonKey as string) ? 'OK' : 'MISSING'}`,
      `SENTRY_DSN: ${(extra.sentryDsn as string) ? 'OK' : 'MISSING'}`,
      `MAPBOX_TOKEN: ${((extra.mapboxAccessToken as string) || (extra.mapboxToken as string)) ? 'OK' : 'MISSING'}`,
    ];
    setLogs(checks);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SkateQuest Debug</Text>
      {logs.map((log, i) => (
        <Text key={i} style={[styles.log, log.includes('MISSING') ? styles.error : styles.ok]}>
          {log}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  log: { fontSize: 16, marginBottom: 10, padding: 10, borderRadius: 5 },
  ok: { backgroundColor: '#1a3a1a', color: '#4ade80' },
  error: { backgroundColor: '#3a1a1a', color: '#f87171' },
});
