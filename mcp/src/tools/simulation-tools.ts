import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SimulationApiClient } from '../api/simulation-api-client.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

export function simulationTools(
  mcpServer: McpServer,
  options: { simulationApiClient: SimulationApiClient },
): void {
  const { simulationApiClient } = options;

  mcpServer.registerTool(
    'request_persona_simulation',
    {
      description:
        'Request persona simulation for a specific requirement to check how personas react to it.',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
        requirementId: z.string().describe('The ID of the requirement'),
      }),
    },
    async ({ projectId, requirementId }) => {
      log('Calling request_persona_simulation', { projectId, requirementId });
      try {
        const simulation = await simulationApiClient.requestSimulation(
          projectId,
          requirementId,
        );
        log('request_persona_simulation created simulation ID:', simulation.id);
        return {
          content: [
            {
              type: 'text',
              text: `Simulation requested successfully.\n- Simulation ID: ${simulation.id}\n- Status: ${simulation.status}`,
            },
          ],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in request_persona_simulation:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  mcpServer.registerTool(
    'get_simulation_result',
    {
      description:
        'Get details and persona reactions of a specific simulation by simulation ID.',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
        simulationId: z.string().describe('The ID of the simulation'),
      }),
    },
    async ({ projectId, simulationId }) => {
      log('Calling get_simulation_result', { projectId, simulationId });
      try {
        const simulation = await simulationApiClient.getSimulation(
          projectId,
          simulationId,
        );
        log('get_simulation_result status:', simulation.status);

        if (simulation.status === 'queued' || simulation.status === 'running') {
          return {
            content: [
              {
                type: 'text',
                text: `Simulation is still in progress.\n- Status: ${simulation.status}\nPlease wait for it to complete. Check again in a few seconds using get_simulation_result.`,
              },
            ],
          };
        }

        let markdown = `# シミュレーション結果 (ID: ${simulation.id})\n\n`;
        markdown += `- **ステータス**: ${simulation.status}\n`;
        if (simulation.summary) {
          markdown += `- **サマリー**: ${simulation.summary}\n`;
        }
        markdown += `\n## ペルソナの反応\n`;

        if (!simulation.reactions || simulation.reactions.length === 0) {
          markdown += `ペルソナの反応はありません。\n`;
        } else {
          simulation.reactions.forEach((reaction) => {
            const personaName =
              reaction.personaSnapshot?.name || 'Unknown Persona';
            markdown += `### ${personaName} の反応\n`;
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
            markdown += `\n`;
          });
        }

        return {
          content: [{ type: 'text', text: markdown }],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in get_simulation_result:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
