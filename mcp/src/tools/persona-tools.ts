import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PersonaApiClient } from '../api/persona-api-client.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

export function personaTools(
  mcpServer: McpServer,
  options: { personaApiClient: PersonaApiClient },
): void {
  const { personaApiClient } = options;

  mcpServer.registerTool(
    'list_personas',
    {
      description: 'List all personas associated with a specific project',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
      }),
    },
    async ({ projectId }) => {
      log('Calling list_personas', { projectId });
      try {
        const personas = await personaApiClient.listPersonas(projectId);
        log('list_personas returned count:', personas.length);

        if (personas.length === 0) {
          return {
            content: [
              { type: 'text', text: 'No personas found for this project.' },
            ],
          };
        }

        let markdown = `# ペルソナ一覧\n\n`;
        personas.forEach((p) => {
          markdown += `## ${p.name} (年齢: ${p.age})\n`;
          markdown += `- **役割 (Role)**: ${p.role}\n`;
          markdown += `- **特徴 (Traits)**: ${p.traits.join(', ')}\n`;
          markdown += `- **背景 (Background)**: ${p.background}\n\n`;
        });

        return {
          content: [{ type: 'text', text: markdown }],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in list_personas:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
