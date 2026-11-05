import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Logger } from './logger';

const PENDING_REFERRAL_KEY = 'skatequest:pending-referral';

type PendingReferral = {
  code: string;
  userId: string;
};

let applyInFlight: Promise<void> | null = null;

export async function savePendingReferralCode(code: string, userId: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  if (!normalized || !userId) return;

  const pending: PendingReferral = { code: normalized, userId };
  await AsyncStorage.setItem(PENDING_REFERRAL_KEY, JSON.stringify(pending));
}

export async function applyPendingReferralCode(userId: string): Promise<void> {
  if (!userId) return;
  if (applyInFlight) return applyInFlight;

  applyInFlight = (async () => {
    const raw = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
    if (!raw) return;

    let pending: PendingReferral;
    try {
      pending = JSON.parse(raw) as PendingReferral;
    } catch {
      await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
      return;
    }

    // Never let a referral entered for one signup attach to another account
    // that happens to log in later on the same device.
    if (!pending.code || pending.userId !== userId) return;

    const { data, error } = await supabase.rpc('apply_referral_code', {
      p_code: pending.code,
      p_user_id: userId,
    });

    if (error) {
      // Network/auth timing errors are retryable. Keep the pending code so the
      // next authenticated startup can try again.
      Logger.warn('Pending referral application deferred', {
        message: error.message,
        userId,
      });
      return;
    }

    const result = (data ?? {}) as { success?: boolean; error?: string };

    // A server response is authoritative. Success consumes the code; a
    // semantic rejection (invalid, claimed, self-referral) should not loop on
    // every future app launch.
    if (result.success || result.error) {
      await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
    }
  })()
    .catch(error => {
      Logger.warn('Pending referral application failed', {
        message: error instanceof Error ? error.message : String(error),
        userId,
      });
    })
    .finally(() => {
      applyInFlight = null;
    });

  return applyInFlight;
}
