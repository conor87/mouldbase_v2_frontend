import React from "react";

export default function CalendarHistoryModal({
  isOpen,
  onClose,
  historyId,
  historyRows,
  loading,
  error,
  formatDateTime,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-6">
        <div className="w-full max-w-7xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl text-white max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
            <h3 className="text-xl font-bold text-cyan-400">Historia zmian (ID: {String(historyId)})</h3>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              disabled={loading}
            >
              X
            </button>
          </div>

          <div className="p-5 overflow-y-auto">
            {loading && <p>Ladowanie historii...</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && historyRows.length === 0 && <p className="opacity-80">Brak wpisow w historii.</p>}

            {!loading && !error && historyRows.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      <th className="text-center px-4 py-3 font-semibold">Log ID</th>
                      <th className="text-center px-4 py-3 font-semibold">Akcja</th>
                      <th className="text-center px-4 py-3 font-semibold">Kto</th>
                      <th className="text-center px-4 py-3 font-semibold">Kiedy</th>
                      <th className="text-center px-4 py-3 font-semibold">Old</th>
                      <th className="text-center px-4 py-3 font-semibold">New</th>
                    </tr>
                  </thead>

                  <tbody className="align-top">
                    {historyRows.map((h) => (
                      <tr key={String(h.id)} className="border-t border-white/10">
                        <td className="px-4 py-3 whitespace-nowrap text-center">{h.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">{h.action}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">{h.updated_by ?? "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">{formatDateTime(h.created)}</td>
                        <td className="px-4 py-3">
                          <pre className="text-xs bg-black/30 p-2 rounded-xl overflow-auto max-h-56">
                            {JSON.stringify(h.old_data ?? null, null, 2)}
                          </pre>
                        </td>
                        <td className="px-4 py-3">
                          <pre className="text-xs bg-black/30 p-2 rounded-xl overflow-auto max-h-56">
                            {JSON.stringify(h.new_data ?? null, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-white/10 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
