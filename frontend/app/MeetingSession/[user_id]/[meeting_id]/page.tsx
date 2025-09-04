// frontend/app/MeetingSession/[user_id]/[meeting_id]/page.tsx
'use client';

// frontend/app/MeetingSession/[user_id]/[meeting_id]/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

export default function MeetingSessionPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user_id, meeting_id } = useParams<{ user_id: string; meeting_id: string }>();
  const search = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const client = ZoomMtgEmbedded.createClient();
      const zoomRoot = containerRef.current || undefined; // HTMLElement | undefined
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL as string;

      // 1) Get meeting details (passcode, etc.) via backend proxy to Zoom
      //    This route already exists and uses attachAccessToken; we provide userId in query
      const meetRes = await fetch(`${backend}/zoom/meetings/${meeting_id}?userId=${user_id}`, {
        cache: 'no-store',
      });
      if (!meetRes.ok) throw new Error(`Failed to fetch meeting details: ${meetRes.status}`);
      const meeting = await meetRes.json();

      // Zoom returns numeric id and passcode (password)
      const meetingNumber: string = String(meeting?.id || meeting_id);
      const password: string = meeting?.password || meeting?.passcode || '';

      // Determine role (host=1, participant=0). Allow override via ?role=host
      const role: 0 | 1 = search.get('role') === 'host' ? 1 : 0;

      // 2) Generate Meeting SDK signature from backend
      const sigRes = await fetch(`${backend}/zoom/sdk-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingNumber, role }),
      });
      if (!sigRes.ok) throw new Error(`Failed to get SDK signature: ${sigRes.status}`);
      const { signature } = await sigRes.json();

      // 3) If host, fetch ZAK (user-level access token) from backend
      let zak: string | undefined = undefined;
      if (role === 1) {
        const zakRes = await fetch(`${backend}/zoom/zak?userId=${user_id}`, { cache: 'no-store' });
        if (!zakRes.ok) throw new Error(`Failed to get ZAK: ${zakRes.status}`);
        const data = await zakRes.json();
        zak = data?.zak || data?.token || undefined;
      }

      // 4) Compute name/email (prefer backend/Zoom values, fall back to placeholders)
      const userName: string = meeting?.host_email || 'FlowMinder User';
      const userEmail: string = meeting?.host_email || '';

      // 5) Init and join
      await client.init({
        zoomAppRoot: zoomRoot,
        language: 'en-US',
        patchJsMedia: true,
      });


      // 6) Join the meeting
      await client.join({
        signature,
        meetingNumber,
        password,
        userName,
        userEmail,
        zak,
      });
    };

    run().catch((err) => {
      console.error('Meeting SDK flow failed:', err);
    });
  }, [meeting_id, user_id, search]);

  return (
    <div id="meetingSDKElement" ref={containerRef} style={{ width: '100%', height: '100vh' }} />
  );
}
