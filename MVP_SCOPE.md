# Yuri Barbershop — Escopo MVP

Data: 2026-09-17

## Objetivo

Manter o produto focado no ciclo operacional principal:

Cliente → serviço → data/horário → solicitação → WhatsApp → confirmação → atendimento → caixa/histórico.

## Manter no MVP

- Agendamento público e responsivo no celular.
- Serviços com preço e duração.
- Horários conforme funcionamento.
- Solicitação de agendamento e confirmação manual.
- WhatsApp como canal de solicitação/contato.
- Agenda administrativa.
- Confirmar, cancelar e arquivar agendamentos.
- Clientes: nome e telefone; aniversário/observação opcionais.
- Serviços: cadastro, preço e duração.
- Produtos: catálogo, preço, estoque e venda.
- Caixa: atendimento, valor, forma de pagamento, cliente e data.
- Histórico básico.
- Relatórios básicos de faturamento, atendimentos e vendas.
- Configurações de funcionamento e mensagens.
- Autenticação e proteção das áreas administrativas.

## Corrigir antes de considerar o MVP pronto

1. Fluxo de agendamento ponta a ponta.
2. Envio de solicitação pelo WhatsApp.
3. Finalização/venda de produto e respectivo fluxo de WhatsApp, quando aplicável.
4. Cancelamento de agendamento e liberação do horário.
5. Cadastro de cliente apenas com nome + telefone.
6. Responsividade mobile, sem overflow horizontal e com controles fáceis de tocar.
7. Consistência entre agendamento, atendimento, caixa, histórico e relatórios.
8. Ausência de dados fictícios em produção.
9. Tratamento de erros e estados de carregamento nos fluxos críticos.

## Cortar do MVP / não expandir agora

- Assinaturas.
- Clube complexo.
- Catálogo de estilos como módulo operacional.
- Sistema de promoções avançado.
- Dashboard excessivamente analítico.
- Recursos duplicados ou legados que não participam do fluxo principal.

## V2

- Fidelidade avançada.
- CRM e segmentação.
- Remarketing/campanhas avançadas.
- Relatórios avançados.
- Gestão completa de colaboradores e comissões.
- Pagamento online.
- Multiempresa/multiunidade.
- Assinaturas e planos.
- Automação de marketing.

## Critério de pronto

O MVP só deve ser considerado pronto quando um cliente conseguir usar o celular para solicitar um horário sem ajuda, o pedido chegar corretamente ao barbeiro, o barbeiro conseguir confirmar/cancelar, e o atendimento concluído puder alimentar o histórico e o caixa sem retrabalho desnecessário.
