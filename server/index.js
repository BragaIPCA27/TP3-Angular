const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const mongoose = require('mongoose');
const path     = require('path');
const https    = require('https');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });

const app       = express();
const port      = Number(process.env.PORT || 3000);
const mongoUri  = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET || 'ptv2-fallback-secret-change-in-prod';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ── Mongoose schemas ──────────────────────────────────────────────────────── */

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    avatar:   { type: String, default: null },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', userSchema);

const portfolioSchema = new mongoose.Schema(
  {
    key:            { type: String, required: true, unique: true, default: 'default' },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username:       { type: String, default: null },
    email:          { type: String, default: null },
    balance:        { type: Number, required: true, default: 100000 },
    positions:      { type: Array, default: [] },
    transactions:   { type: Array, default: [] },
    watchlist:      { type: Array, default: [] },
    orders:         { type: Array, default: [] },
    selectedTicker: { type: String, default: null },
    chartRange:     { type: String, default: '1M' },
  },
  { timestamps: true }
);
const PortfolioState = mongoose.models.PortfolioState || mongoose.model('PortfolioState', portfolioSchema);

/* ── DB connection ─────────────────────────────────────────────────────────── */

async function ensureConnection(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  if (!mongoUri) return res.status(500).json({ message: 'MONGODB_URI não configurada.' });
  try {
    if (mongoose.connection.readyState === 0)
      await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB || 'portfolio-dashboard' });
    return next();
  } catch (err) {
    return res.status(500).json({ message: 'Não foi possível ligar ao MongoDB.', error: String(err.message || err) });
  }
}

/* ── JWT middleware ────────────────────────────────────────────────────────── */

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Token não fornecido.' });
  try {
    req.user = jwt.verify(header.slice(7), jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), jwtSecret); } catch { /* ignore */ }
  }
  next();
}

/* ── Auth routes ───────────────────────────────────────────────────────────── */

app.post('/auth/register', ensureConnection, async (req, res) => {
  const { name, username, email, password } = req.body || {};

  if (!name?.trim() || !username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

  if (password.length < 8)
    return res.status(400).json({ message: 'A password deve ter pelo menos 8 caracteres.' });

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email))
    return res.status(400).json({ message: 'Email inválido.' });

  try {
    const existingEmail    = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail)     return res.status(409).json({ message: 'Este email já está em uso.' });
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername)  return res.status(409).json({ message: 'Este username já está em uso.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), password: hashedPassword });

    const token = jwt.sign({ userId: user._id.toString(), email: user.email, username: user.username }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar conta.', error: String(err.message || err) });
  }
});

app.post('/auth/login', ensureConnection, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password)
    return res.status(400).json({ message: 'Email e password são obrigatórios.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = jwt.sign({ userId: user._id.toString(), email: user.email, username: user.username }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao autenticar.', error: String(err.message || err) });
  }
});

app.get('/auth/me', ensureConnection, verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado.' });
    res.json({ id: user._id, name: user.name, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao obter perfil.', error: String(err.message || err) });
  }
});

app.post('/auth/logout', (_, res) => {
  res.json({ message: 'Sessão terminada.' });
});

/* ── HTTP helpers ──────────────────────────────────────────────────────────── */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function finnhubQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`;
  const q = await httpsGet(url);
  /* Finnhub returns {error:...} when rate-limited — treat as failure */
  if (q.error || (!q.c && !q.pc)) throw new Error(q.error || 'no data');
  return q;
}

/* ── Candle proxy ──────────────────────────────────────────────────────────── */
const candleCache = new Map();
const cacheTtlMs  = { '5': 5 * 60_000, '15': 15 * 60_000, 'D': 60 * 60_000 };

function yahooParams(resolution, from, to) {
  const diffDays = Math.ceil((to - from) / 86400);
  if (resolution === '5')  return { interval: '5m',  range: '1d'  };
  if (resolution === '15') return { interval: '15m', range: '5d'  };
  if (diffDays <= 7)       return { interval: '1d',  range: '5d'  };
  if (diffDays <= 35)      return { interval: '1d',  range: '1mo' };
  if (diffDays <= 95)      return { interval: '1d',  range: '3mo' };
  if (diffDays <= 200)     return { interval: '1d',  range: '6mo' };
  return                          { interval: '1d',  range: '1y'  };
}

/* ── Market News ───────────────────────────────────────────────────────────── */
const marketNewsCache = { data: null, expiresAt: 0 };

app.get('/api/market-news', async (req, res) => {
  if (marketNewsCache.data && Date.now() < marketNewsCache.expiresAt) return res.json(marketNewsCache.data);
  try {
    const raw = await httpsGet(`https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`);
    const articles = Array.isArray(raw) ? raw.slice(0, 20) : [];
    marketNewsCache.data = articles;
    marketNewsCache.expiresAt = Date.now() + 15 * 60_000;
    res.json(articles);
  } catch (err) { res.status(502).json({ message: String(err.message || err) }); }
});

app.get('/api/candles', async (req, res) => {
  const { symbol, resolution, from, to } = req.query;
  if (!symbol || !resolution || !from || !to)
    return res.status(400).json({ s: 'error', message: 'Missing parameters' });
  const key = `${symbol}:${resolution}:${from}:${to}`;
  const cached = candleCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return res.json(cached.data);
  try {
    const yahooSym = symbol.replace(/\./g, '-');
    const { interval, range } = yahooParams(resolution, Number(from), Number(to));
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;
    const raw = await httpsGet(url);
    const result = raw?.chart?.result?.[0];
    if (!result?.timestamp?.length) return res.json({ s: 'no_data', c: [], h: [], l: [], o: [], t: [], v: [] });
    const q = result.indicators.quote[0];
    const data = { s: 'ok', t: result.timestamp, o: q.open.map(v => v ?? 0), h: q.high.map(v => v ?? 0), l: q.low.map(v => v ?? 0), c: q.close.map(v => v ?? 0), v: (q.volume || []).map(v => v ?? 0) };
    candleCache.set(key, { data, expiresAt: Date.now() + (cacheTtlMs[resolution] ?? 5 * 60_000) });
    res.json(data);
  } catch (err) { res.status(502).json({ s: 'no_data', message: String(err.message || err) }); }
});

app.get('/api/quote', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ message: 'Missing symbol' });
  try {
    const data = await finnhubQuote(symbol);
    res.json(data);
  } catch (err) { res.status(502).json({ message: String(err.message || err) }); }
});

/* ── Market Movers ─────────────────────────────────────────────────────────── */
const MOVER_TICKERS = ['AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','NFLX','AMD','INTC','JPM','GS','BAC','XOM','CVX','JNJ','PFE','V','MA','DIS'];
const moversCache = { data: null, expiresAt: 0 };

app.get('/api/movers', async (req, res) => {
  if (moversCache.data && Date.now() < moversCache.expiresAt) return res.json(moversCache.data);
  try {
    const results = await Promise.all(MOVER_TICKERS.map(t =>
      finnhubQuote(t)
        .then(q => ({ ticker: t, price: Number(q.c) || 0, change: Number(q.d) || 0, changePercent: Number(q.dp) || 0 }))
        .catch(() => null)
    ));
    const valid = results.filter(r => r && r.price > 0);
    valid.sort((a, b) => b.changePercent - a.changePercent);
    const data = { gainers: valid.slice(0, 5), losers: [...valid].reverse().slice(0, 5) };
    if (valid.length > 0) { moversCache.data = data; moversCache.expiresAt = Date.now() + 5 * 60_000; }
    res.json(data);
  } catch (err) { res.status(502).json({ message: String(err.message || err) }); }
});

/* ── Sector Performance ────────────────────────────────────────────────────── */
const SECTOR_ETFS = [
  { ticker: 'XLK', name: 'Tecnologia' },   { ticker: 'XLF', name: 'Financeiro' },
  { ticker: 'XLV', name: 'Saúde' },        { ticker: 'XLE', name: 'Energia' },
  { ticker: 'XLY', name: 'Consumo Disc.' }, { ticker: 'XLI', name: 'Industrial' },
  { ticker: 'XLC', name: 'Comunicações' }, { ticker: 'XLRE', name: 'Imobiliário' },
  { ticker: 'XLP', name: 'Cons. Básico' }, { ticker: 'XLU', name: 'Utilidades' },
];
const sectorCache = { data: null, expiresAt: 0 };

app.get('/api/sector-perf', async (req, res) => {
  if (sectorCache.data && Date.now() < sectorCache.expiresAt) return res.json(sectorCache.data);
  try {
    const results = await Promise.all(SECTOR_ETFS.map(s =>
      finnhubQuote(s.ticker)
        .then(q => ({ ticker: s.ticker, name: s.name, price: Number(q.c) || 0, changePercent: Number(q.dp) || 0 }))
        .catch(() => ({ ticker: s.ticker, name: s.name, price: 0, changePercent: 0 }))
    ));
    if (results.some(r => r.price > 0)) { sectorCache.data = results; sectorCache.expiresAt = Date.now() + 5 * 60_000; }
    res.json(results);
  } catch (err) { res.status(502).json({ message: String(err.message || err) }); }
});

/* ── Company News ──────────────────────────────────────────────────────────── */
const newsCache = new Map();

app.get('/api/news/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const cached = newsCache.get(ticker);
  if (cached && Date.now() < cached.expiresAt) return res.json(cached.data);
  try {
    const to   = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 3600_000).toISOString().split('T')[0];
    const raw  = await httpsGet(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`);
    const articles = Array.isArray(raw) ? raw.slice(0, 8) : [];
    newsCache.set(ticker, { data: articles, expiresAt: Date.now() + 15 * 60_000 });
    res.json(articles);
  } catch (err) { res.status(502).json({ message: String(err.message || err) }); }
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, mongo: mongoose.connection.readyState === 1 });
});

/* ── Portfolio routes (per-user via optionalAuth) ──────────────────────────── */

app.get('/api/portfolio', ensureConnection, optionalAuth, async (req, res) => {
  const key = req.user?.userId || 'default';
  try {
    const state = await PortfolioState.findOne({ key }).lean();
    res.json(state || { key, balance: 100000, positions: [], transactions: [], watchlist: [], orders: [], selectedTicker: null, chartRange: '1M' });
  } catch (err) { res.status(500).json({ message: 'Falha ao ler portfolio.', error: String(err.message || err) }); }
});

app.put('/api/portfolio', ensureConnection, optionalAuth, async (req, res) => {
  const key = req.user?.userId || 'default';
  try {
    const p = req.body || {};
    const next = {
      key,
      userId:         req.user?.userId  || null,
      username:       req.user?.username || null,
      email:          req.user?.email    || null,
      balance:        Number(p.balance ?? 100000),
      positions:      Array.isArray(p.positions)    ? p.positions    : [],
      transactions:   Array.isArray(p.transactions) ? p.transactions : [],
      watchlist:      Array.isArray(p.watchlist)    ? p.watchlist    : [],
      orders:         Array.isArray(p.orders)       ? p.orders       : [],
      selectedTicker: p.selectedTicker ?? null,
      chartRange:     p.chartRange ?? '1M',
    };
    const saved = await PortfolioState.findOneAndUpdate({ key }, next, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
    res.json(saved);
  } catch (err) { res.status(500).json({ message: 'Falha ao guardar portfolio.', error: String(err.message || err) }); }
});

app.post('/api/portfolio/reset', ensureConnection, optionalAuth, async (req, res) => {
  const key = req.user?.userId || 'default';
  try {
    const saved = await PortfolioState.findOneAndUpdate(
      { key },
      { key, userId: req.user?.userId || null, username: req.user?.username || null, email: req.user?.email || null, balance: 100000, positions: [], transactions: [], watchlist: [], orders: [], selectedTicker: null, chartRange: '1M' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    res.json(saved);
  } catch (err) { res.status(500).json({ message: 'Falha ao reiniciar portfolio.', error: String(err.message || err) }); }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
