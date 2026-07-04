const { requestPrivateApi } = require('../clients/private-api');

const STATUS_PRESENTATION = {
  queued: {
    label: '実行待ち',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  running: {
    label: '実行中',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  completed: {
    label: '完了',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  partially_completed: {
    label: '一部完了',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  failed: {
    label: '失敗',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
};

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

function presentSimulation(simulation) {
  const presentation =
    STATUS_PRESENTATION[simulation.status] ?? {
      label: simulation.status,
      badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    };

  return {
    ...simulation,
    ...presentation,
    displayCreatedAt: formatDateTime(simulation.createdAt),
    displayCompletedAt: formatDateTime(simulation.completedAt),
  };
}

class SimulationService {
  constructor(options = {}) {
    this.requestPrivateApi =
      options.requestPrivateApiImplementation ?? requestPrivateApi;
  }

  async getDashboard(activeProject, selectedSimulationId) {
    if (!activeProject || !activeProject.id) {
      return {
        activeProject,
        followLatest: true,
        selectedSimulation: null,
        simulations: [],
      };
    }

    const listResponse = await this.requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(activeProject.id)}/simulations`,
    );
    if (!listResponse.ok || !Array.isArray(listResponse.data)) {
      throw new Error('シミュレーション履歴を取得できませんでした。');
    }

    const simulations = listResponse.data.map(presentSimulation);
    const selectedSummary = selectedSimulationId
      ? simulations.find(
          (simulation) => simulation.id === selectedSimulationId,
        )
      : simulations[0];

    if (selectedSimulationId && !selectedSummary) {
      const error = new Error('指定されたシミュレーションが見つかりません。');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!selectedSummary) {
      return {
        activeProject,
        followLatest: !selectedSimulationId,
        selectedSimulation: null,
        simulations,
      };
    }

    const detailResponse = await this.requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(activeProject.id)}/simulations/${encodeURIComponent(selectedSummary.id)}`,
    );
    if (!detailResponse.ok || !detailResponse.data) {
      throw new Error('シミュレーション結果を取得できませんでした。');
    }

    return {
      activeProject,
      followLatest: !selectedSimulationId,
      selectedSimulation: presentSimulation(detailResponse.data),
      simulations,
    };
  }

  async deleteSimulation(projectId, simulationId) {
    try {
      const response = await this.requestPrivateApi(
        `/api/v1/projects/${encodeURIComponent(projectId)}/simulations/${encodeURIComponent(simulationId)}`,
        {
          method: 'DELETE',
        },
      );
      return response.ok;
    } catch (err) {
      console.error(`Failed to delete simulation ${simulationId} for project ${projectId}`, err);
      return false;
    }
  }

  async runSimulation(projectId, requirementId) {
    const response = await this.requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(projectId)}/simulations`,
      {
        method: 'POST',
        body: { requirementId }
      }
    );
    if (!response.ok || !response.data) {
      throw new Error(response.message || 'Failed to start simulation');
    }
    return presentSimulation(response.data);
  }

  async getSandboxContext(activeProject, simulationId) {
    const dashboard = await this.getDashboard(activeProject, simulationId);
    const requirementService = require('./requirementService');
    const requirements = await requirementService.fetchRequirements(activeProject.id);
    return {
      selectedSimulation: dashboard.selectedSimulation,
      simulations: dashboard.simulations,
      requirements
    };
  }
}

module.exports = {
  SimulationService,
  formatDateTime,
  simulationService: new SimulationService(),
};
