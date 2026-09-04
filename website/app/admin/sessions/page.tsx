"use client";

import { useEffect, useState } from "react";
import { getSessions, type SessionRow } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AdminShell } from "../admin-shell";

export default function SessionsPage() {
  return (
    <AdminShell>
      <Sessions />
    </AdminShell>
  );
}

function Sessions() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getSessions(token, { take: 100 })
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
      })
      .catch(() => setError("Could not load sessions."));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">{total} sessions</p>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Transcript</th>
              <th className="px-3 py-2">NSQF mapping</th>
              <th className="px-3 py-2">Top recommendation</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Bandwidth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="border-b border-neutral-100 align-top last:border-0 dark:border-neutral-800"
              >
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{s.language}</td>
                <td className="max-w-xs px-3 py-2">{s.rawTranscript}</td>
                <td className="px-3 py-2">
                  {s.mappings.length === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : (
                    s.mappings.map((m) => (
                      <div key={m.id}>
                        {m.nsqfQualification ? (
                          <>
                            {m.nsqfQualification.qpCode} · {m.nsqfQualification.title}{" "}
                            <span className="text-emerald-600">
                              {Math.round(m.confidence * 100)}%
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-600">
                            {m.normalizedSkill} (review)
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.recommendations[0]?.trainingProgram.name ?? (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {[s.district, s.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {s.bandwidthKbps ? `${s.bandwidthKbps} kbps` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
