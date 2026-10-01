import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade | Yuri Barbershop" };

export default function PrivacyPage() {
  return (
    <main className="legal">
      <Link href="/">← Voltar</Link>
      <h1>Privacidade e proteção de dados</h1>
      <p>
        A Yuri Barbershop registra nome, telefone, data de aniversário e histórico de atendimentos dos clientes para organizar a agenda,
        o caixa, o programa de fidelidade e o relacionamento com cada cliente.
      </p>
      <h2>Como usamos os dados</h2>
      <p>
        Os dados são usados somente na operação da barbearia: agendamentos, confirmações e mensagens pelo WhatsApp, cartão fidelidade e
        campanhas de relacionamento. Não vendemos nem compartilhamos dados para publicidade de terceiros.
      </p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir a correção ou a exclusão dos seus dados entrando em contato com a Yuri Barbershop pelo WhatsApp.</p>
      <h2>Segurança</h2>
      <p>O sistema é acessado apenas pela administração, com senha protegida por criptografia, sessão segura e limite de tentativas de login.</p>
    </main>
  );
}
