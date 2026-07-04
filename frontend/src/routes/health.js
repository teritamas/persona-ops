const express = require('express');
const {
  requestPrivateApi: defaultRequestPrivateApi,
} = require('../clients/private-api');

const PUBLIC_HEALTH_PROXY_PATH = '/api/v1/healthz';
const PRIVATE_API_HEALTH_PATH = '/api/v1/healthz';

function isHtmxRequest(req) {
  return req.get('HX-Request') === 'true';
}

const healthService = require('../services/healthService');

function buildHealthViewModel(result) {
  if (result.ok) {
    return {
      apiUrl: result.apiUrl,
      checkedAt: result.checkedAt,
      details:
        'frontend の server-side proxy 経由で private API の /api/v1/healthz を確認しました。',
      latencyMs: result.latencyMs,
      payload: result.payload,
      statusCode: result.statusCode,
      statusLabel: 'Healthy',
      tone: 'success',
    };
  }

  return {
    apiUrl: result.apiUrl,
    checkedAt: result.checkedAt,
    details: 'private API には到達しましたが、200 OK ではありませんでした。',
    latencyMs: result.latencyMs,
    payload: result.payload,
    statusCode: result.statusCode,
    statusLabel: 'Unhealthy',
    tone: 'error',
  };
}

function buildErrorViewModel(error) {
  const message =
    error instanceof Error ? error.message : 'Unknown error while checking private API.';

  return {
    checkedAt: new Date().toISOString(),
    details: message,
    tone: 'error',
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderHealthStatus(viewModel) {
  const toneClasses = {
    error: {
      badge: 'bg-red-100 text-red-700',
      border: 'border-red-200',
      panel: 'bg-red-50',
    },
    success: {
      badge: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-200',
      panel: 'bg-emerald-50',
    },
  };
  const tone = toneClasses[viewModel.tone] ?? toneClasses.error;
  const payload = escapeHtml(JSON.stringify(viewModel.payload ?? null, null, 2));

  return `
    <div class="rounded-2xl border ${tone.border} ${tone.panel} p-6">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-slate-800">${escapeHtml(viewModel.statusLabel ?? 'Unavailable')}</p>
          <p class="mt-1 text-sm text-slate-600">${escapeHtml(viewModel.details)}</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-bold ${tone.badge}">
          ${escapeHtml(viewModel.statusCode ?? 'N/A')}
        </span>
      </div>

      <dl class="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
        <div class="rounded-xl border border-white/70 bg-white/80 p-4">
          <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Checked At</dt>
          <dd class="mt-2 break-all font-medium text-slate-700">${escapeHtml(viewModel.checkedAt)}</dd>
        </div>
        <div class="rounded-xl border border-white/70 bg-white/80 p-4">
          <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Latency</dt>
          <dd class="mt-2 font-medium text-slate-700">${escapeHtml(viewModel.latencyMs != null ? `${viewModel.latencyMs} ms` : 'N/A')}</dd>
        </div>
        <div class="rounded-xl border border-white/70 bg-white/80 p-4 md:col-span-2">
          <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Private API URL</dt>
          <dd class="mt-2 break-all font-medium text-slate-700">${escapeHtml(viewModel.apiUrl ?? 'N/A')}</dd>
        </div>
        <div class="rounded-xl border border-white/70 bg-white/80 p-4 md:col-span-2">
          <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Payload</dt>
          <dd class="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100"><pre>${payload}</pre></dd>
        </div>
      </dl>
    </div>
  `;
}

async function handleHealthRequest(req, res, requestPrivateApi) {
  try {
    const result = await healthService.fetchPrivateApiHealth(requestPrivateApi, PRIVATE_API_HEALTH_PATH);
    const viewModel = buildHealthViewModel(result);

    if (isHtmxRequest(req)) {
      return res.status(result.ok ? 200 : 503).send(renderHealthStatus(viewModel));
    }

    return res.status(result.ok ? 200 : 503).json({
      apiUrl: result.apiUrl,
      checkedAt: result.checkedAt,
      latencyMs: result.latencyMs,
      payload: result.payload,
      proxiedBy: 'persona-ops-web',
      status: result.ok ? 'ok' : 'error',
      statusCode: result.statusCode,
    });
  } catch (error) {
    const viewModel = buildErrorViewModel(error);

    if (isHtmxRequest(req)) {
      return res.status(503).send(renderHealthStatus(viewModel));
    }

    return res.status(503).json({
      checkedAt: viewModel.checkedAt,
      details: viewModel.details,
      proxiedBy: 'persona-ops-web',
      status: 'error',
    });
  }
}

function createHealthRouter(options = {}) {
  const router = express.Router();
  const requestPrivateApi = options.requestPrivateApi ?? defaultRequestPrivateApi;

  router.get('/ops/health', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PersonaOps Health</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700;800&display=swap" rel="stylesheet">
  <link href="/dist/output.css" rel="stylesheet">
  <script src="/js/htmx.min.js"></script>
</head>
<body class="min-h-screen bg-slate-100 text-slate-800 antialiased">
  <main class="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <div class="font-['Quicksand'] text-3xl font-bold tracking-tight">
          <span class="text-slate-700">Persona</span><span class="text-orange-500">Ops</span>
        </div>
        <p class="mt-2 text-sm text-slate-500">
          公開 frontend から private API の <code>/api/v1/healthz</code> を server-side で確認します。
        </p>
      </div>
      <button
        hx-get="${PUBLIC_HEALTH_PROXY_PATH}"
        hx-target="#health-status"
        hx-swap="innerHTML"
        class="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
        type="button">
        再確認
      </button>
    </div>

    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Health Proxy</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-800">persona-ops-web → persona-ops-private-api</h1>
        </div>
        <div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          HTMX path: <code>${PUBLIC_HEALTH_PROXY_PATH}</code>
        </div>
      </div>

      <div
        id="health-status"
        hx-get="${PUBLIC_HEALTH_PROXY_PATH}"
        hx-trigger="load"
        hx-swap="innerHTML">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          private API のヘルスチェックを開始しています...
        </div>
      </div>
    </section>
  </main>
</body>
</html>`);
  });

  router.get(PUBLIC_HEALTH_PROXY_PATH, async (req, res) => {
    return handleHealthRequest(req, res, requestPrivateApi);
  });

  return router;
}

module.exports = createHealthRouter();
module.exports.createHealthRouter = createHealthRouter;
module.exports.handleHealthRequest = handleHealthRequest;
