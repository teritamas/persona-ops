import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectApiClient } from '../api/project-api-client.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

export function projectTools(
  mcpServer: McpServer,
  options: { projectApiClient: ProjectApiClient },
): void {
  const { projectApiClient } = options;

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
}
