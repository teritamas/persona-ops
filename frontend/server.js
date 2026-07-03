const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable Live Reload in Development
if (process.env.NODE_ENV !== 'production') {
  const livereload = require("livereload");
  const connectLiveReload = require("connect-livereload");

  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, 'views'));
  liveReloadServer.watch(path.join(__dirname, 'public'));
  liveReloadServer.watch(__dirname); // for server.js changes

  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });

  app.use(connectLiveReload());
}

// Serve static files from the "public" directory, but disable automatic index.html so our dynamic route can handle /
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve htmx locally
app.use('/js/htmx.min.js', express.static(path.join(__dirname, 'node_modules/htmx.org/dist/htmx.min.js')));


const { state, mockProjects, getActiveProject } = require('./src/data/store');
const routes = require('./src/routes/index');

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
