// frontend/app/join/[user_id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type MeetingItem = {
  id: number | string;
  topic?: string;
  start_time?: string;
  timezone?: string;
  start_url?: string;
  join_url?: string;
  agenda?: string;
};

export default function JoinPage() {
  const { user_id: zoomUserId } = useParams(); // Get the Zoom user ID from the URL parameters
  const router = useRouter();
  const [loading, setLoading] = useState(true);  // Loading state for fetching meetings
  const [error, setError] = useState<string | null>(null); // Error state for handling fetch errors
  const [items, setItems] = useState<MeetingItem[]>([]); // State to hold the list of meetings

  // Fetch upcoming meetings for the user
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL as string;
    if (!base) {
      setError('Missing NEXT_PUBLIC_BACKEND_URL');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${base}/zoom/meetings/upcoming?userId=${zoomUserId}`);  // Fetch meetings from the backend
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message || 'Failed to load meetings');
      } finally {
        setLoading(false);
      }
    })();
  }, [zoomUserId]);

  const copy = async (text?: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); alert('Link copied'); }
    catch { alert('Could not copy'); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading upcoming meetings…</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4 text-center">Upcoming meetings</h1>

      {items.length === 0 ? (
        <div className="text-gray-600">No upcoming meetings found.</div>
      ) : (
        <ul className="w-full max-w-3xl space-y-3">
          {items.map((m) => (
            <li key={String(m.id)} className="rounded-lg p-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-900 dark:text-gray-100">{m.topic || 'Untitled meeting'}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {m.start_time ? new Date(m.start_time).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : '—'}
                {m.timezone ? ` (${m.timezone})` : ''}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="px-3 py-2 rounded bg-green-600 text-white"
                  onClick={() => m.start_url && (window.location.href = m.start_url)}
                  disabled={!m.start_url}
                >Open host link</button>
                <button
                  className="px-3 py-2 rounded bg-stone-700 text-white"
                  onClick={() => copy(m.join_url)}
                  disabled={!m.join_url}
                >Copy join link</button>
                <button
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                  onClick={() => router.push(`/MeetingSession/${zoomUserId as string}/${m.id}?role=1`)}
                >Open in app</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <button
          onClick={() => router.push(`/meeting/${zoomUserId as string}`)}
          className="px-4 py-2 rounded bg-gray-600 text-white"
        >Back</button>
      </div>
    </div>
  );
}