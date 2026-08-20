# Checkpoint — antes da Central dinâmica de Agendamentos

Data: 2026-08-19

Commit base preservado: `9ef174ca0b21925251a2ef932d5f901797575e6b`

Estado preservado:
- fluxo atual de Agendamentos com três caminhos: serviço, produto e serviço + produto;
- `app/mobile-booking-bridge.tsx` no estado imediatamente anterior à Central dinâmica;
- `app/mobile-booking.css` e `app/booking-commerce.css` no estado imediatamente anterior à Central dinâmica;
- menu do cliente ainda com o bloco lateral de contato/redes.

Se a nova Central não agradar, este commit é o ponto exato para reconstruir/reverter a experiência anterior sem perder a referência do estado aprovado.
