# Portfolio Pulse

Aplicação de trading fictício construída com Angular 17 standalone e uma API Express/MongoDB. Permite gerir uma carteira de ações com autenticação de utilizadores, cotações em tempo real via Finnhub, gráficos interativos e análise de portfólio.

## Funcionalidades

- Autenticação (registo, login, logout) com JWT
- Dashboard com KPIs: valor total, valor carteira, resultado, P&L diário, saldo disponível
- Compra e venda de ações com slippage simulado
- Ordens limitadas, stop-loss e trailing stop
- Screener com filtros por setor, preço, variação e watchlist
- AI Insights com sugestões de compra/venda/manter
- Gráficos de candlestick com SMA/EMA via ApexCharts
- Watchlist e alertas de preço
- Análise detalhada: saúde da carteira, diversificação, taxa de acerto, CAGR, volatilidade
- Notícias do mercado e por ação via Finnhub
- Dados persistidos por utilizador no MongoDB

## Tecnologias

| Camada | Stack |
|---|---|
| Frontend | Angular 17, Tailwind CSS, Bootstrap Icons, ApexCharts |
| Backend | Node.js, Express |
| Base de dados | MongoDB via Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Cotações | Finnhub API + Yahoo Finance (candles) |

## Pré-requisitos

- Node.js 18+
- MongoDB local ou conta MongoDB Atlas
- Chave API gratuita do [Finnhub](https://finnhub.io)

## Instalação

```bash
npm install
```

## Configuração

### 1. Variáveis de ambiente do servidor

Crie o ficheiro `server/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/portfolio-dashboard
MONGODB_DB=portfolio-dashboard
FINNHUB_API_KEY=a_sua_chave_finnhub
JWT_SECRET=uma_string_secreta_longa
```

### 2. API Key no frontend

Edite [src/environments/environment.ts](src/environments/environment.ts) e substitua `YOUR_API_KEY` pela sua chave Finnhub:

```ts
export const environment = {
  finnhubApiKey: 'a_sua_chave_finnhub',
  ...
};
```

## Correr o projeto

```bash
npm start
```

Inicia o servidor Express (porta 3000) e o frontend Angular (porta 4200) em simultâneo.

Abra `http://localhost:4200/`

## Build

```bash
npm run build
```

## Estrutura de pastas

```
server/
  index.js           — API Express: auth, portfolio, cotações, notícias
  .env               — variáveis de ambiente (não incluído no repositório)

src/
  app/
    core/
      api/           — serviços HTTP (auth, portfolio, stock, market)
      finance/       — matemática financeira (PnL, risco, indicadores, trading)
      guards/        — authGuard, guestGuard
      interceptors/  — authInterceptor (JWT nos pedidos)
      layout/        — MainLayout, Sidebar, Topbar
      models/        — interfaces e tipos
      services/      — alertas, notificações, tema, gráficos
      store/         — AuthStore, PortfolioStore (signals)
    features/
      auth/          — login, registo
      dashboard/     — KPIs, movers, watchlist, setor, notícias
      portfolio/     — posições, modal de adicionar
      trading/       — ordens de mercado, limite, stop
      screener/      — filtros + AI Insights
      stocks/        — detalhe de ação com gráfico
      analytics/     — análise detalhada da carteira
      watchlist/     — lista de acompanhamento
      alerts/        — alertas de preço
      market/        — visão geral do mercado
      news/          — notícias gerais
      transactions/  — histórico de operações
    shared/
      charts/        — AllocationDonut, PerfChart
      components/    — design system (cards, badges, skeleton, toast, trade-modal)
      pipes/         — formatação de moeda e variação
  environments/
    environment.ts
```

## Notas

- Cada utilizador tem o seu portfólio isolado no MongoDB — não existe partilha de dados entre contas.
- O plano gratuito do Finnhub tem limite de 60 pedidos/minuto; cotações são cacheadas no servidor para minimizar o impacto.
- Todos os dados são geridos exclusivamente pelo MongoDB — não é usado localStorage para dados de portfólio.
