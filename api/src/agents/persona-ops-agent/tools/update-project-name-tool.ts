import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import type { ProjectService } from '../../../application/project-service.js';

export function createUpdateProjectNameTool(
  projectId: string,
  projectService: ProjectService,
) {
  return new FunctionTool({
    name: 'update_project_name_tool',
    description:
      'プロジェクトの目的を推測し、新しいプロジェクト名を保存します。',
    parameters: z.object({
      projectName: z
        .string()
        .describe('新しく設定するプロジェクト名（最大20文字程度）'),
    }),
    execute: async (input: { projectName: string }) => {
      try {
        await projectService.updateProjectName(projectId, input.projectName);
        return JSON.stringify({
          updatedProjectName: input.projectName,
          status: 'success',
        });
      } catch (error) {
        return JSON.stringify({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'プロジェクト名の更新に失敗しました',
        });
      }
    },
  });
}
