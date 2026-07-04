import { describe, expect, it } from 'vitest';

import {
  hasUsableSimulationResult,
  isTerminalSimulationStatus,
  type SimulationStatus,
} from '../../src/domain/simulation.js';

describe('Simulationのステータス判定', () => {
  it.each<SimulationStatus>(['completed', 'partially_completed', 'failed'])(
    '%sは終端状態として扱う',
    (status) => {
      expect(isTerminalSimulationStatus(status)).toBe(true);
    },
  );

  it.each<SimulationStatus>(['queued', 'running'])(
    '%sは終端状態として扱わない',
    (status) => {
      expect(isTerminalSimulationStatus(status)).toBe(false);
    },
  );

  it.each<SimulationStatus>(['completed', 'partially_completed'])(
    '%sは後続要件に利用可能な結果として扱う',
    (status) => {
      expect(hasUsableSimulationResult(status)).toBe(true);
    },
  );

  it.each<SimulationStatus>(['queued', 'running', 'failed'])(
    '%sは後続要件に利用可能な結果として扱わない',
    (status) => {
      expect(hasUsableSimulationResult(status)).toBe(false);
    },
  );
});
