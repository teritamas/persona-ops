import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import type { RequirementService } from '../../../application/requirement-service.js';

export function createApproveRequirementTool(
  projectId: string,
  requirementService: RequirementService,
) {
  const parameters = z.object({
    requirementId: z.string().min(1),
  });

  return new FunctionTool({
    name: 'approve_requirement_tool',
    description:
      'ユーザーが明示的に承認を指示した新機能要件を承認（ステータスをapprovedに）します。',
    parameters,
    execute: async ({ requirementId }) => {
      const requirement = await requirementService.approveDraft(
        projectId,
        requirementId,
      );
      return {
        status: requirement.status,
        requirementId: requirement.id,
      };
    },
  });
}
