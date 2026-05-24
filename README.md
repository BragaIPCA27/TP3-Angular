# Portfolio Pulse

Aplicação Angular 17 standalone para monitorização de carteira de ações com carregamento de JSON, cotações em tempo real via Finnhub, total automático, gráfico live, trading fictício e persistência em MongoDB com fallback local.

## Instalação

```bash
npm install
```

Se estiver a montar o projeto manualmente a partir de um diretório vazio, os pacotes relevantes são:

```bash
npm install bootstrap bootstrap-icons express mongoose cors dotenv concurrently
```

## Configurar a API Key

Edite [src/environments/environment.ts](src/environments/environment.ts) e substitua `YOUR_API_KEY` pela sua chave Finnhub.

Endpoint usado:

```text
https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_API_KEY
```

## Configurar MongoDB

1. Crie o ficheiro [server/.env](server/.env) a partir de [server/.env.example](server/.env.example) se quiser alterar os valores.
2. Ajuste `MONGODB_URI` para a sua instância MongoDB local ou Atlas.
3. O servidor usa por defeito `mongodb://127.0.0.1:27017/portfolio-dashboard`.

## Correr o projeto

```bash
npm start
```

Este comando arranca o frontend Angular e a API Express/MongoDB em simultâneo.

Depois abra `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Estrutura de pastas

```text
server/
  .env
  .env.example
  index.js
src/
	app/
		components/
			buy-stock-modal/
			navbar/
			portfolio-summary/
			portfolio-table/
			summary-cards/
			stock-chart/
			trading-panel/
			transaction-history/
			toast-notifications/
			sell-stock-modal/
			upload-json/
			watchlist/
		models/
			chart-data.model.ts
			portfolio-position.model.ts
			stock.model.ts
			toast.model.ts
		services/
			chart.service.ts
			portfolio-api.service.ts
			notification.service.ts
			portfolio.service.ts
			storage.service.ts
			trading.service.ts
			stock-api.service.ts
		app.component.*
		app.config.ts
		app.routes.ts
	assets/
		example-portfolio.json
	environments/
		environment.development.ts
		environment.ts
```

## JSON de exemplo

O ficheiro [src/assets/example-portfolio.json](src/assets/example-portfolio.json) inclui um exemplo pronto a importar.

## Notas

- O dashboard usa Bootstrap 5, Bootstrap Icons e ApexCharts.
- Os totais são recalculados automaticamente após importação e atualização das cotações.
- As posições são guardadas em `localStorage` e sincronizadas com MongoDB quando a API está disponível.
