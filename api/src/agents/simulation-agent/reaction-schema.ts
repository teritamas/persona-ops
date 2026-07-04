import { z } from 'zod';

export const simulationReactionSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  valueScore: z.number().int().min(1).max(5),
  adoptionIntentScore: z.number().int().min(1).max(5),
  workflowFitScore: z.number().int().min(1).max(5),
  feedback: z.string().min(1),
  benefits: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestedChanges: z.array(z.string()),
});
