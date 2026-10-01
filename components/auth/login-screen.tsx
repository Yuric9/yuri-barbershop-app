"use client";

import { useState, type FormEvent } from "react";
import { api } from "../../lib/client/api";
import { Button } from "../ui/button";
import { Alert } from "../ui/feedback";
import { CheckboxField, TextField } from "../ui/field";

export default function LoginScreen({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(notice ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      window.location.assign("/");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section className="login__card" aria-labelledby="login-title">
        <img className="login__logo" src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" width={88} height={88} />
        <span className="eyebrow">Sistema de gestão</span>
        <h1 id="login-title">Acesso administrativo</h1>
        <p className="login__subtitle">Entre com o e-mail e a senha da administração.</p>

        <form onSubmit={submit} className="login__form">
          <TextField label="E-mail" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField
            label="Senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <CheckboxField label="Mostrar senha" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" loading={loading} className="button--block">
            Entrar no painel
          </Button>
        </form>

        <a className="login__privacy" href="/privacidade">
          Privacidade e proteção de dados
        </a>
      </section>
    </main>
  );
}
