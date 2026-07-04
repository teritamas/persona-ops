import { FunctionTool } from '@google/adk';
import { z } from 'zod';

import type { PersonaService } from '../../../application/persona-service.js';

export function createSavePersonasTool(
  projectId: string,
  personaService: PersonaService,
) {
  const parameters = z.object({
    personas: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          role: z.string().min(1),
          traits: z.array(z.string()),
          background: z.string(),
          avatarSeed: z
            .string()
            .describe(
              'DiceBear URLのseedとなる英数字。ペルソナの特徴（性別、髪型、表情などのキーワード）をカンマなしの英数字で自由に指定して、最適なアイコンを生成してください。',
            )
            .optional(),
        }),
      )
      .min(1),
  });

  return new FunctionTool({
    name: 'save_personas_tool',
    description:
      '確定したペルソナ群を現在のプロジェクトへ保存または更新します。',
    parameters,
    execute: async ({ personas }) => {
      const result = await personaService.savePersonas(projectId, personas);
      return {
        status: 'saved',
        ...result,
      };
    },
  });
}
