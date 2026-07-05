import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { ProjectApiClient } from './api/project-api-client.js';
import type { HealthApiClient } from './api/health-api-client.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

function createMcpServer(projectApiClient: ProjectApiClient) {
  const mcpServer = new McpServer({
    name: 'PersonaOps MCP Server',
    version: '1.0.0',
  });

  mcpServer.registerTool(
    'list_projects',
    {
      description: 'List available projects',
    },
    async () => {
      log('Calling list_projects');
      try {
        const projects = await projectApiClient.listProjects();
        log('list_projects returned count:', projects.length);
        const text = projects
          .map((p) => `- ${p.name} (ID: ${p.id})`)
          .join('\n');
        return {
          content: [{ type: 'text', text: text || 'No projects found.' }],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in list_projects:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  mcpServer.registerTool(
    'list_requirements',
    {
      description: 'List requirements for a specific project',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
      }),
    },
    async ({ projectId }) => {
      log('Calling list_requirements', { projectId });
      try {
        const requirements = await projectApiClient.listRequirements(projectId);
        log('list_requirements returned count:', requirements.length);
        const text = requirements
          .map((r) => `- ${r.title} (ID: ${r.id}, Status: ${r.status})`)
          .join('\n');
        return {
          content: [{ type: 'text', text: text || 'No requirements found.' }],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in list_requirements:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  mcpServer.registerTool(
    'get_requirement_with_simulations',
    {
      description:
        'Get requirement details and persona simulations to generate USM or Elevator Pitch',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
        requirementId: z.string().describe('The ID of the requirement'),
      }),
    },
    async ({ projectId, requirementId }) => {
      log('Calling get_requirement_with_simulations', {
        projectId,
        requirementId,
      });
      try {
        const [req, evaluations] = await Promise.all([
          projectApiClient.getRequirement(projectId, requirementId),
          projectApiClient.getRequirementSimulations(projectId, requirementId),
        ]);
        log(
          'get_requirement_with_simulations fetched requirement:',
          req.title,
          'and evaluations count:',
          evaluations.length,
        );

        let markdown = `# 要件: ${req.title}\n\n`;
        markdown += `## 概要\n${req.description}\n\n`;
        markdown += `## 受け入れ基準\n`;
        req.acceptanceCriteria.forEach((ac: string) => {
          markdown += `- ${ac}\n`;
        });

        markdown += `\n## ペルソナの評価・懸念事項\n`;
        if (!evaluations || evaluations.length === 0) {
          markdown += `シミュレーション結果（評価）はありません。\n`;
        } else {
          evaluations.forEach((evalData, i) => {
            markdown += `### シミュレーション #${i + 1}\n`;
            evalData.reactions.forEach((reaction) => {
              const personaName =
                reaction.personaSnapshot?.name || 'Unknown Persona';
              markdown += `#### ${personaName} の反応\n`;
              if (reaction.status === 'completed') {
                markdown += `- **評価 (Sentiment)**: ${reaction.sentiment ?? 'unknown'}\n`;
                markdown += `- **短いフィードバック**: ${reaction.shortFeedback ?? ''}\n`;
                markdown += `- **詳細なフィードバック**: ${reaction.detailedFeedback ?? ''}\n`;
                if (reaction.concerns && reaction.concerns.length > 0) {
                  markdown += `- **懸念事項**:\n`;
                  reaction.concerns.forEach((c: string) => {
                    markdown += `  - ${c}\n`;
                  });
                }
              } else {
                markdown += `- **エラーステータス**: ${reaction.status}\n`;
                markdown += `- **エラーメッセージ**: ${reaction.errorMessage || reaction.errorCode || ''}\n`;
              }
            });
          });
        }

        log(
          'get_requirement_with_simulations output markdown length:',
          markdown.length,
        );
        return {
          content: [{ type: 'text', text: markdown }],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in get_requirement_with_simulations:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  return mcpServer;
}

export function createServer(
  projectApiClient: ProjectApiClient,
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
          const mcpServer = createMcpServer(projectApiClient);

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
