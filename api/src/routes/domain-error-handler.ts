import type { FastifyError, FastifyInstance } from 'fastify';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../domain/errors.js';

export function registerDomainErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof ConflictError) {
      return reply.status(409).send({ error: error.message });
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    request.log.error({ err: error }, 'Request failed');
    return reply.status(500).send({ error: 'Internal Server Error' });
  });
}
