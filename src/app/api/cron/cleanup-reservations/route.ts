import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    const now = Date.now();
    const sixtyMinutesMs = 60 * 60 * 1000;

    // Find confirmed reservations that have passed their 60-min arrival window
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

    return NextResponse.json({ success: true, expiredReservationsCount: expiredCount });
  } catch (error: any) {
    console.error('Reservation cleanup cron error:', error);
    return NextResponse.json({ error: error?.message || 'Cron execution failed.' }, { status: 500 });
  }
}
