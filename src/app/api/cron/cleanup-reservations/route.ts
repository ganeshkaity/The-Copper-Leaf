import { NextResponse } from 'next/server';
import { getAdminDb, getAdminRtdb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    const now = Date.now();
    const sixtyMinutesMs = 60 * 60 * 1000;

    // 1. Find confirmed reservations that have passed their 60-min arrival window
    const snapshot = await adminDb
      .collection('tableReservations')
      .where('status', '==', 'CONFIRMED')
      .get();

    let expiredCount = 0;
    const batch = adminDb.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const cutoff = (data.startAt || 0) + sixtyMinutesMs;
      if (now > cutoff) {
        batch.update(doc.ref, {
          status: 'NO_SHOW',
          noShowAt: now,
          updatedAt: now,
        });

        // If table was marked RESERVED, mark it AVAILABLE
        if (data.tableId) {
          const tableRef = adminDb.collection('tables').doc(data.tableId);
          batch.update(tableRef, {
            status: 'AVAILABLE',
            updatedAt: now,
          });
        }
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
    }

    // 2. Daily hygiene: prune stale RTDB temporary table locks
    try {
      const adminRtdb = getAdminRtdb();
      if (adminRtdb) {
        const locksRef = adminRtdb.ref('tableLocks');
        const locksSnap = await locksRef.get();
        if (locksSnap.exists()) {
          const restaurantsLocks = locksSnap.val();
          for (const restId of Object.keys(restaurantsLocks)) {
            const tableLocks = restaurantsLocks[restId];
            if (tableLocks && typeof tableLocks === 'object') {
              for (const tId of Object.keys(tableLocks)) {
                if (tableLocks[tId]?.expiresAt && tableLocks[tId].expiresAt < now) {
                  await adminRtdb.ref(`tableLocks/${restId}/${tId}`).remove();
                }
              }
            }
          }
        }
      }
    } catch (rtdbErr) {
      console.warn('RTDB daily sweep warning:', rtdbErr);
    }

    return NextResponse.json({
      success: true,
      job: 'once-daily-maintenance',
      expiredReservationsCount: expiredCount,
    });
  } catch (error: any) {
    console.error('Reservation cleanup cron error:', error);
    return NextResponse.json({ error: error?.message || 'Cron execution failed.' }, { status: 500 });
  }
}
