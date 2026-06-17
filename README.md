# GZ Budget Monitor

Monitor de saldo de contas de anúncios (Meta Ads, Google Ads, LinkedIn Ads, TikTok Ads) integrado com Reportei API e Supabase.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (ou configure no Vercel):

```
REACT_APP_SUPABASE_URL=https://vlixibgpsloncnqjtcwu.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_anon_key
REACT_APP_REPORTEI_TOKEN=seu_token_reportei
```

## Deploy no Vercel

1. Suba o código no GitHub
2. Importe o repositório no Vercel
3. Configure as variáveis de ambiente acima em Settings > Environment Variables
4. Deploy automático

## Lógica de cálculo

- **Saldo disponível** = budget mensal + aportes PIX - spend acumulado no mês
- **Média diária** = spend acumulado ÷ dias decorridos no mês
- **Dias estimados** = saldo disponível ÷ média diária
- **Alerta** = quando dias estimados ≤ threshold configurado por cliente (padrão: 10 dias)
