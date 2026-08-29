"use client";

import { useState } from "react";

type View = "client" | "register";

function loginEmail(value: string) {
  const identifier = value.trim().toLowerCase();
  if (identifier.includes("@")) return identifier;
  const phone = identifier.replace(/\D/g, "");
  return phone ? `cliente-${phone}@cadastro.local` : identifier;
}

export default function LoginPanel() {
  const [view, setView] = useState<View>("client");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const endpoint = view === "register" ? "/api/auth/register" : "/api/auth/login";
    const payload = view === "register"
      ? { name: form.name, phone: form.phone, password: form.password, area: "client" }
      : { email: loginEmail(form.email), password: form.password, area: "client" };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) setMessage(data.error || "Não foi possível entrar.");
      else window.location.assign("/");
    } catch { setMessage("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return <div className="access-box login-card" id="acesso">
    <span className="eyebrow">BEM-VINDO</span>
    <h1>{view === "register" ? "Crie seu cadastro" : "Entre na Yuri Barbershop"}</h1>
    <p>{view === "register" ? "Cadastro simples: informe seu nome, telefone e crie uma senha. Não é necessário e-mail nem confirmação." : "Use seu telefone ou e-mail e sua senha."}</p>
    <div className="login-tabs" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
      <button className={view === "client" ? "active" : ""} onClick={() => { setView("client"); setMessage(""); setShowPassword(false); }}>Cliente</button>
      <button className={view === "register" ? "active" : ""} onClick={() => { setView("register"); setMessage(""); setShowPassword(false); }}>Cadastrar</button>
    </div>
    <form className="own-login-form" onSubmit={submit}>
      {view === "register" ? <>
        <label>Nome<input required autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
        <label>Telefone<input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })}/></label>
      </> : <label>Telefone ou e-mail<input required autoComplete="username" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label>}
      <label>Senha<input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={view === "register" ? "new-password" : "current-password"} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/></label>
      <label className="show-password-option"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)}/><span>Mostrar senha</span></label>
      {view === "client" && <a className="forgot-password-link" href="https://wa.me/5562981007636?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20para%20recuperar%20meu%20acesso%20ao%20aplicativo%20da%20Yuri%20Barbershop." target="_blank" rel="noreferrer">Esqueci minha senha</a>}
      {message && <p className="login-message">{message}</p>}
      <button className="primary-button login-submit" disabled={loading}>{loading ? "Aguarde..." : view === "register" ? "Criar cadastro" : "Entrar"}</button>
    </form>
    <div className="login-help"><b>Horários de atendimento</b><span>Segunda a sexta: 18h às 20h30</span><span>Sábado: 8h às 20h30 • Domingo: 8h às 12h</span><small>O pedido de horário será confirmado pessoalmente pelo WhatsApp.</small></div>
    <a className="privacy-link" href="/privacidade">Privacidade e proteção de dados</a>
  </div>;
}
