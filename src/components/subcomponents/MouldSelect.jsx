import React, { useMemo, useState } from "react";

export default function MouldSelect({
  label,
  value,
  onChange,
  moulds,
  labelMould,
  placeholder = "— wybierz —",
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const all = moulds || [];
    const query = q.trim().toLowerCase();
    if (!query) return all;

    // normalizujemy do stringów
    const norm = (v) => String(v ?? "").toLowerCase();

    // 1) jeśli jest EXACT na mould_number -> pokazuj tylko exact
    const exactByMouldNo = all.filter((m) => norm(m.mould_number) === query);
    if (exactByMouldNo.length > 0) return exactByMouldNo;

    // 2) inaczej: szukaj po mould_number i product (oraz opcjonalnie id)
    return all.filter((m) => {
      const mouldNo = norm(m.mould_number);
      const product = norm(m.product);
      return mouldNo.includes(query) || product.includes(query);
    });
  }, [q, moulds]);

  return (
    <label className="grid gap-1 text-sm">
      <span className="opacity-80">{label}</span>

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Szukaj (mould_number / product)…"
        className="rounded-lg bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 px-3 py-2"
      />

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-white text-slate-900 border border-slate-300 px-3 py-2"
      >
        <option value="">{placeholder}</option>
        {filtered.map((m) => (
          <option key={m.id} value={String(m.id)}>
            {labelMould(m.id)}
          </option>
        ))}
      </select>

      <div className="text-xs opacity-60">
        {filtered.length} / {(moulds || []).length}
      </div>
    </label>
  );
}
