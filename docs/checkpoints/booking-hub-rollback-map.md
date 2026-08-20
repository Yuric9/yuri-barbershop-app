# Mapa de retorno — Central de Agendamentos

## Estado aprovado antes da nova Central
Commit: `9ef174ca0b21925251a2ef932d5f901797575e6b`

Esse commit representa exatamente a versão anterior da tela de Agendamentos, com:
- Serviço;
- Produto;
- Serviço + produto;
- fluxo simples até o WhatsApp;
- sem a nova home dinâmica/central.

## Implementação da nova Central
Principais commits:
- `1f27fa0304c39633ed0460e9ad488a57ce072d8c` — lógica da Central dinâmica;
- `6314f6ded8fdd34e0b554a8ba7cee4190c2cca6a` — visual da Central;
- `ddc178fd6888839e2dc9de0da73e4af4a2af6b2a` — ativação do CSS no layout.

Se a nova experiência não for aprovada, usar o commit base acima como referência para restaurar a tela anterior.
