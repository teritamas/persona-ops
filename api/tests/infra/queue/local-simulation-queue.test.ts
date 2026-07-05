import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalSimulationQueue } from '../../../src/infra/queue/local-simulation-queue.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ローカルシミュレーションQueue', () => {
  it('同じローカルAPIの内部Taskルートを非同期で呼び出す', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const queue = new LocalSimulationQueue('http://127.0.0.1:8080');

    await queue.enqueue({
      projectId: 'project-1',
      simulationId: 'simulation-1',
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'http://127.0.0.1:8080/api/v1/internal/projects/project-1/simulations/simulation-1/run',
      ),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
