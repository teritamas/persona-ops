const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const projectContext = require('./src/middlewares/projectContext');
const app = express();
const DEFAULT_PORT = 3000;
const MAX_PORT_RETRIES = 10;
const configuredPort = Number.parseInt(process.env.PORT ?? '', 10);
const initialPort = Number.isInteger(configuredPort) ? configuredPort : DEFAULT_PORT;
const allowPortFallback = !Number.isInteger(configuredPort);

// Enable Live Reload in Development
if (process.env.NODE_ENV !== 'production') {
  const livereload = require('livereload');
  const connectLiveReload = require('connect-livereload');

  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, 'src', 'views'));
  liveReloadServer.watch(path.join(__dirname, 'public', 'dist'));

  liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
      liveReloadServer.refresh('/');
    }, 100);
  });

  app.use(connectLiveReload());
}

// Serve static files from the "public" directory, but disable automatic index.html so our dynamic route can handle /
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Serve htmx locally
app.use('/js/htmx.min.js', express.static(path.join(__dirname, 'node_modules/htmx.org/dist/htmx.min.js')));


const healthRoutes = require('./src/routes/health');
const routes = require('./src/routes/index');

app.use('/', healthRoutes);
app.use(projectContext);
app.use('/', routes);

function startServer(port, retriesRemaining) {
  const server = app.listen(port, () => {
    const address = server.address();
    const activePort =
      typeof address === 'object' && address !== null ? address.port : port;

    console.log(`Server is running at http://localhost:${activePort}`);
  });

  server.once('error', (error) => {
    if (error.code !== 'EADDRINUSE' || !allowPortFallback || retriesRemaining <= 0) {
      throw error;
    }

    const nextPort = port + 1;

    // In development, automatically move to the next port so a stale local
    // process does not block startup.
    console.warn(
      `Port ${port} is already in use. Retrying on http://localhost:${nextPort}`,
    );

    startServer(nextPort, retriesRemaining - 1);
  });
}

startServer(initialPort, MAX_PORT_RETRIES);
