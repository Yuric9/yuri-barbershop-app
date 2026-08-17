"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CatalogItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  imageKey: string;
};

function imageUrl(key: string) {
  return `/api/upload?key=${encodeURIComponent(key)}`;
}

async function upload(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok || !data.key) throw new Error(data.error || "Falha no envio da imagem");
  return String(data.key);
}

export default function CatalogAdminEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({ name: "", category: "corte", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setIsAdmin(Boolean(data.isAdmin));
    setItems(data.catalogItems || []);
  }

  useEffect(() => {
    const syncTarget = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const addButton = buttons.find((button) => button.textContent?.includes("Adicionar modelo"));
      setTarget((addButton?.closest("section") as HTMLElement | null) || null);
    };
    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    refresh().catch(() => undefined);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (target) refresh().catch(() => undefined);
  }, [target]);

  function beginEdit(item: CatalogItem) {
    setEditing(item);
    setForm({ name: item.name, category: item.category, description: item.description || "" });
    setFile(null);
    setMessage("");
    setTimeout(() => document.getElementById("catalog-edit-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function saveEdit() {
    if (!editing || !form.name.trim()) return;
    try {
      setSaving(true);
      setMessage("");
      const imageKey = file ? await upload(file) : editing.imageKey;
      const response = await fetch("/api/catalog-admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", id: editing.id, ...form, imageKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o modelo");
      setEditing(null);
      setFile(null);
      setMessage("Modelo atualizado com sucesso.");
      await refresh();
      window.dispatchEvent(new Event("focus"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o modelo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: CatalogItem) {
    if (!window.confirm(`Excluir “${item.name}” do catálogo?`)) return;
    try {
      setMessage("");
      const response = await fetch("/api/catalog-admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir o modelo");
      if (editing?.id === item.id) setEditing(null);
      setMessage("Modelo removido do catálogo.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o modelo.");
    }
  }

  if (!target || !isAdmin || !items.length) return null;

  return createPortal(
    <div style={{ marginTop: 24, padding: 20, border: "1px solid #ded6c8", borderRadius: 18, background: "#fffdf9", boxShadow: "0 12px 30px rgba(44,31,15,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <small style={{ color: "#a77a21", fontWeight: 900, letterSpacing: ".12em" }}>GERENCIAR CATÁLOGO</small>
          <h3 style={{ margin: "5px 0 0", fontSize: 22 }}>Modelos publicados</h3>
          <p style={{ margin: "5px 0 0", color: "#777066", fontSize: 13 }}>Edite nome, legenda, categoria ou foto. Você também pode excluir um modelo.</p>
        </div>
        <strong>{items.length} {items.length === 1 ? "modelo" : "modelos"}</strong>
      </div>

      {message && <p style={{ padding: "10px 12px", background: "#f5efe3", borderRadius: 10, fontSize: 13 }}>{message}</p>}

      {editing && <div id="catalog-edit-panel" style={{ marginBottom: 18, padding: 16, border: "1px solid #c99a38", borderRadius: 14, background: "#fffaf0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Nome
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Categoria
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="corte">Corte</option><option value="barba">Barba</option><option value="quimica">Procedimento químico</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, gridColumn: "1/-1" }}>Descrição / legenda
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, gridColumn: "1/-1" }}>Trocar foto <small style={{ fontWeight: 400, color: "#777" }}>Opcional — deixe vazio para manter a foto atual.</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="primary-button small" disabled={saving || !form.name.trim()} onClick={saveEdit}>{saving ? "Salvando..." : "Salvar alterações"}</button>
          <button type="button" onClick={() => { setEditing(null); setFile(null); }}>Cancelar</button>
        </div>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {items.map(item => <article key={item.id} style={{ display: "grid", gridTemplateColumns: "78px 1fr", gap: 12, padding: 10, border: "1px solid #e5ddd0", borderRadius: 14, background: "white", alignItems: "center" }}>
          <img src={imageUrl(item.imageKey)} alt={item.name} style={{ width: 78, height: 78, objectFit: "cover", borderRadius: 10, background: "#eee" }} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</strong>
            <small style={{ display: "block", color: "#8a8174", marginTop: 3 }}>{item.category === "corte" ? "Corte" : item.category === "barba" ? "Barba" : "Procedimento químico"}</small>
            <p style={{ margin: "5px 0 8px", fontSize: 11, color: "#6d675f", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description || "Sem descrição"}</p>
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" onClick={() => beginEdit(item)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #d3c5aa", background: "#fffaf0", fontWeight: 700 }}>Editar</button>
              <button type="button" onClick={() => remove(item)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e0c0bb", background: "#fff5f3", color: "#9b3f34", fontWeight: 700 }}>Excluir</button>
            </div>
          </div>
        </article>)}
      </div>
    </div>,
    target,
  );
}
