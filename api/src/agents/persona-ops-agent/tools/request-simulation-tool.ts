import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import type { SimulationService } from '../../../application/simulation-service.js';

export function createRequestSimulationTool(
  projectId: string,
  simulationService: SimulationService,
) {
  const parameters = z.object({
    requirementId: z.string().min(1),
  });

  return new FunctionTool({
    name: 'request_simulation_tool',
    description:
      '新機能要件（draft状態）のペルソナシミュレーションを開始します。要件の承認（approvedへの変更）は行いません。',
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
