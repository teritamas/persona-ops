import type { SimulationQueuePort } from '../../application/ports/infra/queue/simulation-queue-port.js';

export class LocalSimulationQueue implements SimulationQueuePort {
  constructor(private readonly baseUrl: string) {}

  enqueue(input: { projectId: string; simulationId: string }): Promise<void> {
    setImmediate(() => {
      void this.dispatch(input);
    });
    return Promise.resolve();
  }

  private async dispatch(input: {
    projectId: string;
    simulationId: string;
  }): Promise<void> {
    try {
      const response = await fetch(
        new URL(
          `/api/v1/internal/projects/${encodeURIComponent(input.projectId)}` +
            `/simulations/${encodeURIComponent(input.simulationId)}/run`,
          this.baseUrl,
        ),
        {
          method: 'POST',
        },
      );
      if (!response.ok) {
        throw new Error(`Local task returned HTTP ${response.status}.`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown local task error';
      process.stderr.write(`[local-simulation-queue] ${message}\n`);
    }
  }
}
