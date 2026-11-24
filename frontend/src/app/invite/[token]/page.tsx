'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InviteTokenRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.token) {
      router.replace(`/invitations/accept?token=${params.token}`);
    } else {
      router.replace('/projects');
    }
  }, [params, router]);

  return null;
}
