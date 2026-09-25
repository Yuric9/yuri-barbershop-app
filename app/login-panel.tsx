"use client";

import { useState } from "react";

export default function LoginPanel() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, area: "admin" }),
      });
      const data = await response.json() as { error?: string; role?: string };

      if (!response.ok) {
        setMessage(data.error || "Não foi possível entrar.");
        return;
      }

      if (data.role !== "admin") {
        setMessage("Este acesso é exclusivo para administradores.");
        return;
      }

      window.location.assign("/");
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="access-box login-card" id="acesso">
      <span className="eyebrow">ÁREA RESTRITA</span>
      <h1>Acesso administrativo</h1>
      <p>Entre com o e-mail e a senha da administração para abrir o painel de gestão.</p>

      <form className="own-login-form" onSubmit={submit}>
        <label>
          E-mail administrativo
          <input
            required
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>

        <label>
          Senha
          <input
            required
            type={showPassword ? "text" : "password"}
            minLength={8}
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>

        <label className="show-password-option">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          <span>Mostrar senha</span>
        </label>

        {message && <p className="login-message" role="alert">{message}</p>}

        <button className="primary-button login-submit" disabled={loading}>
          {loading ? "Aguarde..." : "Entrar no painel"}
        </button>
      </form>

      <div className="login-help">
        <b>Acesso protegido</b>
        <span>Somente contas com perfil administrativo podem entrar.</span>
        <small>Se você não possui o acesso, procure o responsável pelo sistema.</small>
      </div>

      <a className="privacy-link" href="/privacidade">Privacidade e proteção de dados</a>
    </div>
  );
}
