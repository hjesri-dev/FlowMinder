// meeting/[user_id]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';


export default function MeetingPage() {
  const router = useRouter();
  const { user_id: zoomUserId } = useParams();

  return (
    <div className="flex flex-col items-center justify-center h-screen box-border p-6">
      <h1 className="text-2xl font-semibold mb-4 text-center">Welcome to FlowMinder</h1>
      <p className="mb-6">Zoom User ID: {zoomUserId}</p>
      <div className="flex space-x-4">
        <button
          className="px-6 py-3 bg-green-600 text-white rounded-lg"
          onClick={() => router.push(`/schedule/${zoomUserId}`)}
        >
          Schedule New Meeting
        </button>
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          onClick={() => router.push(`/join/${zoomUserId}`)}
        >
          Join Existing Meeting
        </button>
      </div>
    </div>
  );
}