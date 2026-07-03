import { z } from 'zod';

const environmentSchema = z.object({
  GOOGLE_CLOUD_LOCATION: z.string().trim().min(1),
  GOOGLE_CLOUD_PROJECT: z.string().trim().min(1),
  GOOGLE_GENAI_USE_VERTEXAI: z.literal('true'),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  UPLOADS_BUCKET: z.string().trim().min(1),
  VERTEX_AI_MODEL: z.string().trim().min(1).default('gemini-2.5-flash'),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return environmentSchema.parse(environment);
}
