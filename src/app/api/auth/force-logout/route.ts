import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUid, adminUid } = body;

    if (!targetUid || !adminUid) {
      return NextResponse.json({ error: 'Missing targetUid or adminUid.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    // Verify admin
    const adminSnap = await adminDb.collection('users').doc(adminUid).get();
    if (!adminSnap.exists || adminSnap.data()?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Only ADMIN can force logout users.' }, { status: 403 });
    }

    const now = Date.now();

    // 1. Update forceLogoutAt in Firestore so active client listener signs out
    await adminDb.collection('users').doc(targetUid).update({
      forceLogoutAt: now,
      updatedAt: now,
    });

    // 2. Revoke Firebase Auth refresh tokens via Admin SDK
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        await adminAuth.revokeRefreshTokens(targetUid);
      } catch (e) {
        console.warn('Could not revoke refresh tokens in Firebase Auth:', e);
      }
    }

    return NextResponse.json({ success: true, targetUid });
  } catch (error: any) {
    console.error('Force logout error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to force logout user.' }, { status: 500 });
  }
}
