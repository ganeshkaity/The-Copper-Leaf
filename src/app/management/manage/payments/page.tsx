'use client';

import { redirect } from 'next/navigation';

export default function WaiterPaymentsRedirect() {
  redirect('/management/manage/billing');
}
