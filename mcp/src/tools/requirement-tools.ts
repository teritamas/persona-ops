import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { RequirementApiClient } from '../api/requirement-api-clients.js';

function log(message: string, ...args: unknown[]) {
  console.error(`[MCP Log] ${message}`, ...args);
}

export function requirementTools(
  mcpServer: McpServer,
  options: { requirementApiClient: RequirementApiClient },
): void {
  const { requirementApiClient } = options;

  mcpServer.registerTool(
    'list_requirements',
    {
      description: 'List requirements for a specific project',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
        includeDraft: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'If true, include unapproved draft requirements. Otherwise, return only approved ones.',
          ),
      }),
    },
    async ({ projectId, includeDraft }) => {
      log('Calling list_requirements', { projectId, includeDraft });
      try {
        const requirements =
          await requirementApiClient.listRequirements(projectId);
        const filteredRequirements = includeDraft
          ? requirements
          : requirements.filter((r) => r.status === 'approved');
        log('list_requirements returned count:', filteredRequirements.length);
        const text = filteredRequirements
          .map((r) => `- ${r.title} (ID: ${r.id}, Status: ${r.status})`)
          .join('\n');
        return {
          content: [
            {
              type: 'text',
              text:
                text ||
                (includeDraft
                  ? 'No requirements found.'
                  : 'No approved requirements found.'),
            },
          ],
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
          requirementApiClient.getRequirement(projectId, requirementId),
          requirementApiClient.getRequirementSimulations(
            projectId,
            requirementId,
          ),
        ]);
        if (req.status !== 'approved') {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Access denied. Only approved requirements can be retrieved.',
              },
            ],
            isError: true,
          };
        }
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

  mcpServer.registerTool(
    'save_requirement_draft',
    {
      description:
        'Create a new requirement draft, or update an existing requirement draft with modified title, description, or acceptance criteria. If requirementId is provided, the tool will OVERWRITE the existing requirement with the new values. Always fetch the current requirement first using get_requirement_with_simulations to ensure you have the full original text for any fields you do not wish to modify.',
      inputSchema: z.object({
        projectId: z.string().describe('The ID of the project'),
        requirementId: z
          .string()
          .optional()
          .describe(
            'The ID of the requirement to update. Do not provide this argument if creating a brand new requirement.',
          ),
        title: z
          .string()
          .describe(
            'The title of the requirement. Provide the full or updated title.',
          ),
        description: z
          .string()
          .describe(
            'The description of the requirement. Provide the full or updated description. If editing, pass the original description if it is unchanged.',
          ),
        acceptanceCriteria: z
          .array(z.string())
          .describe(
            'List of acceptance criteria. If editing, pass the original list with any additions/modifications. Unspecified criteria will be lost.',
          ),
      }),
    },
    async ({
      projectId,
      requirementId,
      title,
      description,
      acceptanceCriteria,
    }) => {
      log('Calling save_requirement_draft', { projectId, requirementId });
      try {
        const requirement = await requirementApiClient.saveRequirementDraft(
          projectId,
          {
            id: requirementId,
            title,
            description,
            acceptanceCriteria,
          },
        );
        log(
          'save_requirement_draft completed, requirement ID:',
          requirement.id,
        );
        return {
          content: [
            {
              type: 'text',
              text: `Requirement draft saved successfully.\n- ID: ${requirement.id}\n- Title: ${requirement.title}\n- Status: ${requirement.status}`,
            },
          ],
        };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        log('Error in save_requirement_draft:', errorMessage);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
