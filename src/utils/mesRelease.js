import { API_BASE } from "../config/api.js";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

const nowIsoLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export async function releaseAssignedMesResources({ token, userId, username }) {
  if (!token || !userId) return;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const createdAt = nowIsoLocal();

  try {
    const res = await fetch(`${API_BASE}/production/workstations`, { headers });
    const wsList = normalizeList(await res.json());
    const mine = wsList.filter((ws) => ws.user_id != null && Number(ws.user_id) === Number(userId));

    await Promise.all(
      mine.flatMap((ws) => {
        const ops = [];
        if (ws.current_operation_id) {
          ops.push(
            fetch(`${API_BASE}/production/logs`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                operation_id: ws.current_operation_id,
                status_id: null,
                workstation_id: ws.id,
                user_id: Number(userId),
                note: "Wylogowanie",
                created_at: createdAt,
              }),
            }).catch(() => {}),
          );
        }
        ops.push(
          fetch(`${API_BASE}/production/workstations/${ws.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              user_id: null,
              current_operation_id: null,
              current_task_id: null,
              status_id: null,
            }),
          }).catch(() => {}),
        );
        return ops;
      }),
    );
  } catch {
    // Logout should continue even if cleanup cannot complete.
  }

  try {
    const res = await fetch(`${API_BASE}/service/workstations`, { headers });
    const wsList = normalizeList(await res.json());
    const mine = wsList.filter((ws) => ws.user_id != null && Number(ws.user_id) === Number(userId));

    await Promise.all(
      mine.flatMap((ws) => [
        fetch(`${API_BASE}/service/logs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            operator: username || null,
            created_at: createdAt,
            status_service: "Wylogowanie",
            mes_activ_service_id: ws.aktualne_zlecenie_serwisowe_id || null,
            mes_activ_changeover_id: ws.aktualne_przezbrojenie_id || null,
            status_changeover: null,
          }),
        }).catch(() => {}),
        fetch(`${API_BASE}/service/workstations/${ws.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            user_id: null,
            status_changeovers: null,
            st: null,
            aktualne_przezbrojenie_id: null,
            aktualne_zlecenie_serwisowe_id: null,
            aktualny_typ_zlecenia: null,
          }),
        }).catch(() => {}),
      ]),
    );
  } catch {
    // Logout should continue even if cleanup cannot complete.
  }
}
