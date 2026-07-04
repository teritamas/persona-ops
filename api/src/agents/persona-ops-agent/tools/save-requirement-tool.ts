import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import type { RequirementService } from '../../../application/requirement-service.js';

export function createSaveRequirementTool(
  projectId: string,
  requirementService: RequirementService,
) {
  const parameters = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    description: z.string().min(1),
    acceptanceCriteria: z.array(z.string().min(1)),
    sourceSimulationIds: z.array(z.string()).default([]),
  });

  return new FunctionTool({
    name: 'save_requirement_tool',
    description:
      '新機能要件をdraftとして保存します。既存draftの修正時はidを指定します。',
    parameters,
    execute: async (input) => {
      const requirement = await requirementService.saveDraft(projectId, input);
      return {
        status: requirement.status,
        requirementId: requirement.id,
        version: requirement.version,
      };
    },
  });
}
