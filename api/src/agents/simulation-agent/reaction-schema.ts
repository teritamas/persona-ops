import { z } from 'zod';

export const simulationReactionSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  shortFeedback: z.string().min(1),
  detailedFeedback: z.string().min(1),
  workImage: z.string().min(1),
  concerns: z.array(z.string()),
});
