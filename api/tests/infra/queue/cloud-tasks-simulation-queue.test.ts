import { describe, expect, it, vi } from 'vitest';

import {
  CloudTasksSimulationQueue,
  type CloudTasksClientPort,
} from '../../../src/infra/queue/cloud-tasks-simulation-queue.js';

function createClient() {
  return {
    queuePath: vi.fn(() => 'queues/persona-simulations'),
    taskPath: vi.fn(() => 'tasks/simulation-1'),
    createTask: vi.fn(() => Promise.resolve()),
  } as unknown as CloudTasksClientPort;
}

describe('CloudTasksSimulationQueue', () => {
  it('Simulation IDをTask名と内部APIパスへ設定する', async () => {
    const client = createClient();
    const queue = new CloudTasksSimulationQueue(client, {
      projectId: 'project-1',
      location: 'asia-northeast1',
      queue: 'persona-simulations',
    });

    await queue.enqueue({
      projectId: 'project-1',
      simulationId: 'simulation-1',
    });

    const request = vi.mocked(client.createTask).mock.calls[0]?.[0];
    expect(request?.task?.name).toBe('tasks/simulation-1');
    expect(request?.task?.httpRequest?.url).toContain(
      '/api/v1/internal/projects/project-1/simulations/simulation-1/run',
    );
    expect(request?.task?.httpRequest?.body).toBeUndefined();
  });

  it('同じTask名が登録済みの場合は冪等に成功する', async () => {
    const client = createClient();
    vi.mocked(client.createTask).mockRejectedValue({ code: 6 });
    const queue = new CloudTasksSimulationQueue(client, {
      projectId: 'project-1',
      location: 'asia-northeast1',
      queue: 'persona-simulations',
    });

    await expect(
      queue.enqueue({
        projectId: 'project-1',
        simulationId: 'simulation-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('Task登録の予期しないエラーを呼び出し元へ返す', async () => {
    const client = createClient();
    vi.mocked(client.createTask).mockRejectedValue(new Error('unavailable'));
    const queue = new CloudTasksSimulationQueue(client, {
      projectId: 'project-1',
      location: 'asia-northeast1',
      queue: 'persona-simulations',
    });

    await expect(
      queue.enqueue({
        projectId: 'project-1',
        simulationId: 'simulation-1',
      }),
    ).rejects.toThrow('unavailable');
  });
});
