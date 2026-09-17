"use client";

import { useMemo, useState } from "react";

const SERVICES = [
  { name: "Corte", price: 30, duration: 60 },
  { name: "Barba", price: 30, duration: 40 },
  { name: "Corte + Barba", price: 50, duration: 90 },
  { name: "Sobrancelha", price: 15, duration: 15 },
  { name: "Pigmentação", price: 30, duration: 30 },
  { name: "Relaxamento", price: 70, duration: 60 },
];

function slotsForDate(date: string) {
  if (!date) return [];
  const day = new Date(`${date}T12:00:00`).getDay();
  const start = day === 0 || day === 6 ? 8 * 60 : 18 * 60;
  const end = day === 0 ? 12 * 60 : 20 * 60 + 30;
  const result: string[] = [];
  for (let minute = start; minute <= end; minute += 30) {
    result.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return result;
}

export default function PublicBooking() {
  const [serviceName, setServiceName] = useState(SERVICES[0].name);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");

  const service = SERVICES.find((item) => item.name === serviceName) ?? SERVICES[0];
  const slots = useMemo(() => slotsForDate(date), [date]);
  const today = new Date().toISOString().slice(0, 10);

  function sendRequest() {
    if (!date || !time || !name.trim() || !phone.trim()) {
      setNotice("Preencha nome, telefone, data e horário.");
      return;
    }

    const formattedDate = new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T12:00:00`));
    const message = [
      "Olá, Yuri! Vim pelo agendamento online.",
      "",
      `Nome: ${name.trim()}`,
      `Telefone: ${phone.trim()}`,
      `Serviço: ${service.name}`,
      `Valor: R$ ${service.price.toFixed(2).replace(".", ",")}`,
      `Duração: ${service.duration} min`,
      `Data: ${formattedDate}`,
      `Horário solicitado: ${time}`,
      "",
      "Gostaria de verificar a disponibilidade.",
    ].join("\n");

    window.open(`https://wa.me/5562981007636?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setNotice("Solicitação preparada no WhatsApp. A confirmação será feita manualmente.");
  }

  return (
    <main className="public-booking-mvp">
      <header className="public-booking-header">
        <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
        <div>
          <strong>YURI BARBERSHOP</strong>
          <span>Agendamento online</span>
        </div>
      </header>

      <section className="public-booking-card" aria-labelledby="booking-title">
        <span className="eyebrow">ATENDIMENTO ONLINE</span>
        <h1 id="booking-title">Agende seu horário</h1>
        <p>Escolha o serviço, informe o horário desejado e envie a solicitação pelo WhatsApp.</p>

        <label>
          Serviço
          <select value={serviceName} onChange={(event) => { setServiceName(event.target.value); setTime(""); }}>
            {SERVICES.map((item) => (
              <option key={item.name} value={item.name}>{item.name} — R$ {item.price.toFixed(2).replace(".", ",")}</option>
            ))}
          </select>
        </label>

        <div className="public-booking-summary">
          <span>{service.duration} min</span>
          <strong>R$ {service.price.toFixed(2).replace(".", ",")}</strong>
        </div>

        <div className="public-booking-grid">
          <label>
            Data
            <input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} />
          </label>
          <label>
            Horário
            <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date}>
              <option value="">Escolha</option>
              {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
        </div>

        {date && slots.length === 0 && <p className="public-booking-warning">Não há atendimento para esta data.</p>}

        <div className="public-booking-grid">
          <label>
            Seu nome
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" autoComplete="name" />
          </label>
          <label>
            WhatsApp
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(62) 99999-9999" inputMode="tel" autoComplete="tel" />
          </label>
        </div>

        <button className="public-booking-submit" type="button" onClick={sendRequest}>Verificar disponibilidade pelo WhatsApp</button>
        {notice && <p className="public-booking-notice" role="status">{notice}</p>}

        <footer>
          <span>Seg–Sex: 18h–20h30</span>
          <span>Sáb: 8h–20h30</span>
          <span>Dom: 8h–12h</span>
        </footer>
      </section>

      <style jsx>{`
        .public-booking-mvp{min-height:100vh;background:#0b0b0b;color:#f5f5f5;padding:24px 16px 48px;font-family:Arial,sans-serif}
        .public-booking-header{max-width:720px;margin:0 auto 22px;display:flex;align-items:center;gap:14px}
        .public-booking-header img{width:48px;height:48px;object-fit:contain}
        .public-booking-header div{display:grid;gap:3px}.public-booking-header strong{letter-spacing:.12em;font-size:14px}.public-booking-header span{font-size:12px;color:#aaa}
        .public-booking-card{max-width:720px;margin:auto;background:#151515;border:1px solid #2b2b2b;border-radius:20px;padding:24px;box-shadow:0 12px 40px #0008}
        .eyebrow{font-size:11px;letter-spacing:.16em;color:#aaa}.public-booking-card h1{font-size:clamp(28px,6vw,42px);margin:8px 0}.public-booking-card>p{color:#aaa;line-height:1.5}
        label{display:grid;gap:8px;font-size:13px;color:#ddd;margin-top:18px}input,select{width:100%;box-sizing:border-box;background:#0e0e0e;color:#fff;border:1px solid #343434;border-radius:12px;padding:13px;font:inherit;min-height:46px}select{appearance:auto}
        .public-booking-summary{display:flex;justify-content:space-between;margin-top:12px;padding:12px 14px;background:#101010;border-radius:12px;color:#aaa}.public-booking-summary strong{color:#fff}
        .public-booking-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.public-booking-submit{width:100%;margin-top:22px;border:0;border-radius:12px;padding:15px;background:#f2f2f2;color:#090909;font-weight:800;cursor:pointer}.public-booking-submit:active{transform:translateY(1px)}
        .public-booking-warning,.public-booking-notice{padding:12px 14px;border-radius:12px;background:#101010;color:#ddd;line-height:1.4}.public-booking-notice{margin:14px 0 0}.public-booking-card footer{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:22px;padding-top:18px;border-top:1px solid #292929;color:#888;font-size:11px}
        @media(max-width:620px){.public-booking-mvp{padding:16px 10px 32px}.public-booking-card{padding:18px;border-radius:16px}.public-booking-grid{grid-template-columns:1fr;gap:0}.public-booking-header{margin-bottom:14px}.public-booking-card h1{font-size:30px}}
      `}</style>
    </main>
  );
}
