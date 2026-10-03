import { ref, runTransaction, get, remove } from 'firebase/database';
import { rtdb } from '@/lib/firebase/client';
import { TableLock } from '@/types';

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function acquireTableLock(
  restaurantId: string,
  tableId: string,
  uid: string,
  purpose: 'QR_ORDER' | 'BOOKING',
  referenceId: string
): Promise<{ success: boolean; error?: string; expiresAt?: number }> {
  const lockRef = ref(rtdb, `tableLocks/${restaurantId}/${tableId}`);
  const now = Date.now();
  const expiresAt = now + LOCK_DURATION_MS;

  try {
    const result = await runTransaction(lockRef, (currentData: TableLock | null) => {
      // If no lock or lock has expired or already owned by same user
      if (!currentData || currentData.expiresAt < now || currentData.uid === uid) {
        return {
          uid,
          purpose,
          startedAt: now,
          expiresAt,
          referenceId,
        };
      }
      // Table is currently locked by someone else
      return undefined; // Abort transaction
    });

    if (result.committed) {
      return { success: true, expiresAt };
    } else {
      return {
        success: false,
        error: 'This table is currently being selected or ordered at by another guest. Please try another table.',
      };
    }
  } catch (error: any) {
    console.error('Error acquiring table lock:', error);
    return { success: false, error: error?.message || 'Failed to acquire table hold.' };
  }
}

export async function releaseTableLock(
  restaurantId: string,
  tableId: string,
  uid: string
): Promise<void> {
  const lockRef = ref(rtdb, `tableLocks/${restaurantId}/${tableId}`);
  try {
    const snap = await get(lockRef);
    if (snap.exists()) {
      const data = snap.val() as TableLock;
      if (data.uid === uid || data.expiresAt < Date.now()) {
        await remove(lockRef);
      }
    }
  } catch (error) {
    console.warn('Error releasing table lock:', error);
  }
}

export async function checkTableLock(
  restaurantId: string,
  tableId: string
): Promise<{ isLocked: boolean; lock?: TableLock }> {
  const lockRef = ref(rtdb, `tableLocks/${restaurantId}/${tableId}`);
  try {
    const snap = await get(lockRef);
    if (snap.exists()) {
      const lock = snap.val() as TableLock;
      if (lock.expiresAt > Date.now()) {
        return { isLocked: true, lock };
      }
    }
  } catch (e) {
    console.warn('Error checking table lock:', e);
  }
  return { isLocked: false };
}
