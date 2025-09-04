"use client";

import { useMemo } from "react";
import { useNudgeStore } from "@/stores/useNudgeStore";

export default function NudgeStatsPanel() {
  const byId = useNudgeStore((s) => s.byId);

  const { speakUp, moveAlong } = useMemo(() => {
    const rows = Object.values(byId).filter((p) => p?.in_meeting);
    let more = 0, less = 0;
    for (const r of rows) {
      more += r.more ?? 0; // "Speak up"
      less += r.less ?? 0; // "Move along"
    }
    return { speakUp: more, moveAlong: less };
  }, [byId]);

  return (
    <div className="flex flex-col gap-2 p-4 pt-0">
      <div className="flex flex-row gap-2 text-center">
        <div className="w-[50%] bg-green-900/85 text-white p-4 mt-3 rounded-lg shadow-md">
          <h2 className="text-md font-semibold mb-2">Move along nudges</h2>
          <h1 className="text-2xl font-bold text-center">{moveAlong}</h1>
        </div>
        <div className="w-[50%] bg-sky-900/85 text-white p-4 mt-3 rounded-lg shadow-md">
          <h2 className="text-md font-semibold mb-2">Invite to speak nudges</h2>
          <h1 className="text-2xl font-bold text-center">{speakUp}</h1>
        </div>
      </div>
    </div>
  );
}
