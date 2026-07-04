import { CloudTasksClient, protos } from '@google-cloud/tasks';

import type { SimulationQueuePort } from '../../application/ports/infra/queue/simulation-queue-port.js';

const ALREADY_EXISTS_GRPC_CODE = 6;

export interface CloudTasksClientPort {
  queuePath(projectId: string, location: string, queue: string): string;
  taskPath(
    projectId: string,
    location: string,
    queue: string,
    task: string,
  ): string;
  createTask(
    request: protos.google.cloud.tasks.v2.ICreateTaskRequest,
  ): Promise<unknown>;
}

export class CloudTasksSimulationQueue implements SimulationQueuePort {
  constructor(
    private readonly client: CloudTasksClientPort,
    private readonly config: {
      projectId: string;
      location: string;
      queue: string;
    },
  ) {}

  async enqueue(input: {
    projectId: string;
    simulationId: string;
  }): Promise<void> {
    const parent = this.client.queuePath(
      this.config.projectId,
      this.config.location,
      this.config.queue,
    );
    const name = this.client.taskPath(
      this.config.projectId,
      this.config.location,
      this.config.queue,
      input.simulationId,
    );
    // Queue-level URI override replaces this placeholder host with the
    // authenticated private API URL while preserving the per-task path.
    const url =
      'https://simulation-task.invalid/api/v1/internal/projects/' +
      `${encodeURIComponent(input.projectId)}/simulations/` +
      `${encodeURIComponent(input.simulationId)}/run`;

    try {
      await this.client.createTask({
        parent,
        task: {
          name,
          dispatchDeadline: { seconds: 300 },
          httpRequest: {
            httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
            url,
          },
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === ALREADY_EXISTS_GRPC_CODE
      ) {
        return;
      }
      throw error;
    }
  }
}

export function createCloudTasksSimulationQueue(config: {
  projectId: string;
  location: string;
  queue: string;
}): CloudTasksSimulationQueue {
  return new CloudTasksSimulationQueue(new CloudTasksClient(), config);
}
