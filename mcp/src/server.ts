import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { ApiClient } from './api-client.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

function createMcpServer(apiClient: ApiClient) {
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
        const projects = await apiClient.listProjects();
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
        const requirements = await apiClient.listRequirements(projectId);
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
          apiClient.getRequirement(projectId, requirementId),
          apiClient.getRequirementSimulations(projectId, requirementId),
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

export function createServer(apiClient: ApiClient) {
  const mcpServer = createMcpServer(apiClient);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  mcpServer.connect(transport).catch((err) => {
    console.error('Failed to connect to Streamable HTTP transport:', err);
  });

  const server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      log(`HTTP ${req.method} ${req.url} request received`);

      if (req.url?.startsWith('/mcp')) {
        transport.handleRequest(req, res).catch((err) => {
          console.error('Error handling MCP request:', err);
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    },
  );

  return server;
}
