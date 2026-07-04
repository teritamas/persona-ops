export interface SimulationQueuePort {
  enqueue(input: { projectId: string; simulationId: string }): Promise<void>;
}
