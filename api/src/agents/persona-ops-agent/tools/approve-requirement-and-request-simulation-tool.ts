import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import type { SimulationService } from '../../../application/simulation-service.js';

export function createApproveRequirementAndRequestSimulationTool(
  projectId: string,
  simulationService: SimulationService,
) {
  const parameters = z.object({
    requirementId: z.string().min(1),
  });

  return new FunctionTool({
    name: 'approve_requirement_and_request_simulation_tool',
    description:
      'ユーザーが明示承認したdraft要件を承認し、ペルソナシミュレーションを開始します。承認前には絶対に使用しません。',
    parameters,
    execute: async ({ requirementId }) => {
      const simulation = await simulationService.request(
        projectId,
        requirementId,
      );
      return {
        status: simulation.status,
        simulationId: simulation.id,
      };
    },
  });
}
