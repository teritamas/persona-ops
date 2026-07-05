import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ProjectApiClient } from './api/project-api-client.js';
import type { RequirementApiClient } from './api/requirement-api-clients.js';
import type { SimulationApiClient } from './api/simulation-api-client.js';
import type { PersonaApiClient } from './api/persona-api-client.js';
import type { HealthApiClient } from './api/health-api-client.js';
import { projectTools } from './tools/project-tools.js';
import { requirementTools } from './tools/requirement-tools.js';
import { simulationTools } from './tools/simulation-tools.js';
import { personaTools } from './tools/persona-tools.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

function createMcpServer(
  projectApiClient: ProjectApiClient,
  requirementApiClient: RequirementApiClient,
  simulationApiClient: SimulationApiClient,
  personaApiClient: PersonaApiClient,
) {
  const mcpServer = new McpServer({
    name: 'PersonaOps MCP Server',
    version: '1.0.0',
  });

  projectTools(mcpServer, { projectApiClient });
  requirementTools(mcpServer, { requirementApiClient });
  simulationTools(mcpServer, { simulationApiClient });
  personaTools(mcpServer, { personaApiClient });

  return mcpServer;
}

export function createServer(
  projectApiClient: ProjectApiClient,
  requirementApiClient: RequirementApiClient,
  simulationApiClient: SimulationApiClient,
  personaApiClient: PersonaApiClient,
  healthApiClient: HealthApiClient,
) {
  interface Session {
    transport: StreamableHTTPServerTransport;
    mcpServer: McpServer;
    lastActive: number;
  }

  const sessions = new Map<string, Session>();

  // Idle session timeout: 1 hour. Clean up check: every 5 minutes.
  const IDLE_TIMEOUT = 60 * 60 * 1000;
  const CLEANUP_INTERVAL = 5 * 60 * 1000;

  const gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastActive > IDLE_TIMEOUT) {
        log(`Session ${sessionId} has been idle for too long. Cleaning up...`);
        sessions.delete(sessionId);
        session.transport.close().catch((err) => {
          console.error(
            `Failed to close transport for idle session ${sessionId}:`,
            err,
          );
        });
        session.mcpServer.close().catch((err) => {
          console.error(
            `Failed to close MCP server for idle session ${sessionId}:`,
            err,
          );
        });
      }
    }
  }, CLEANUP_INTERVAL);

  // Unref the interval to avoid keeping the process alive when all work is done.
  gcInterval.unref();

  const server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      log(`HTTP ${req.method} ${req.url} request received`);

      if (req.url === '/health') {
        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'text/plain' });
          res.end('Method Not Allowed');
          return;
        }
        healthApiClient
          .checkHealth()
          .then((isHealthy) => {
            if (isHealthy) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'ok' }));
            } else {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'error',
                  details: 'Private API unhealthy',
                }),
              );
            }
          })
          .catch((err: unknown) => {
            log('Health check error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'error',
                details: err instanceof Error ? err.message : String(err),
              }),
            );
          });
        return;
      }

      if (!req.url?.startsWith('/mcp')) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          session.lastActive = Date.now();
          session.transport.handleRequest(req, res).catch((err) => {
            console.error(
              `Error handling MCP request for session ${sessionId}:`,
              err,
            );
          });
        } else {
          log(`Session not found: ${sessionId}`);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: 'Session not found',
              },
              id: null,
            }),
          );
        }
      } else {
        // No session ID provided. Only POST (initialization) is allowed here.
        if (req.method === 'POST') {
          const newSessionId = randomUUID();
          log(`Creating new session: ${newSessionId}`);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });
          const mcpServer = createMcpServer(
            projectApiClient,
            requirementApiClient,
            simulationApiClient,
            personaApiClient,
          );

          mcpServer.connect(transport).catch((err) => {
            console.error(
              `Failed to connect to transport for session ${newSessionId}:`,
              err,
            );
          });

          sessions.set(newSessionId, {
            transport,
            mcpServer,
            lastActive: Date.now(),
          });

          transport.onclose = () => {
            log(`Cleaning up closed session ${newSessionId}`);
            sessions.delete(newSessionId);
            mcpServer.close().catch((err) => {
              console.error(
                `Failed to close MCP server for session ${newSessionId}:`,
                err,
              );
            });
          };

          transport.handleRequest(req, res).catch((err) => {
            console.error(
              `Error handling initialization request for session ${newSessionId}:`,
              err,
            );
          });
        } else {
          log(
            'Bad Request: Session ID is required for non-initialization requests',
          );
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: Session ID is required',
              },
              id: null,
            }),
          );
        }
      }
    },
  );

  return server;
}
