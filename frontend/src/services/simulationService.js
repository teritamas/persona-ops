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

  async getDashboard(activeProject, selectedSimulationId, hiddenSimulations = []) {
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

    let simulations = listResponse.data.map(presentSimulation);
    // 隠しシミュレーションを除外
    simulations = simulations.filter(sim => !hiddenSimulations.includes(sim.id));

    // 現在プロジェクト内で実行中/キュー待ちのシミュレーションがあれば、強制的にそれを優先表示
    const runningSim = simulations.find(s => ['running', 'queued'].includes(s.status));
    let targetSimId = selectedSimulationId;
    if (runningSim) {
      targetSimId = runningSim.id;
    } else if (
      !targetSimId ||
      targetSimId === 'dummy' ||
      targetSimId === 'undefined' ||
      targetSimId === 'null'
    ) {
      targetSimId = null;
    }

    const selectedSummary = targetSimId
      ? simulations.find(
          (simulation) => simulation.id === targetSimId,
        )
      : simulations[0];

    if (targetSimId && !selectedSummary) {
      const error = new Error('指定されたシミュレーションが見つかりません。');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (!selectedSummary) {
      return {
        activeProject,
        followLatest: !targetSimId,
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
      followLatest: !targetSimId,
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

  async getSandboxContext(activeProject, simulationId, hiddenSimulations = [], hiddenRequirements = [], targetRequirementId = null, targetVersion = null) {
    const dashboard = await this.getDashboard(activeProject, simulationId, hiddenSimulations);
    const requirementService = require('./requirementService');
    let requirements = await requirementService.fetchRequirements(activeProject.id);
    if (hiddenRequirements && hiddenRequirements.length > 0) {
      requirements = requirements.filter(req => !hiddenRequirements.includes(req.id));
    }

    let selectedRequirementId = null;
    let selectedRequirementVersion = null;

    // 明示的なターゲット指定がある場合、それを最優先する
    if (targetRequirementId && targetVersion) {
      selectedRequirementId = targetRequirementId;
      selectedRequirementVersion = Number(targetVersion);

      // 指定された要件・バージョンに合致するシミュレーションがあるか探索
      const matchingSimSummary = dashboard.simulations.find(s =>
        s.requirementId === selectedRequirementId &&
        (s.requirementSnapshot?.version === selectedRequirementVersion || s.requirementVersion === selectedRequirementVersion)
      );

      if (matchingSimSummary) {
        // 合致するシミュレーションがあれば詳細を読み込んで割り当てる
        const detailResponse = await this.requestPrivateApi(
          `/api/v1/projects/${encodeURIComponent(activeProject.id)}/simulations/${encodeURIComponent(matchingSimSummary.id)}`,
        );
        if (detailResponse.ok && detailResponse.data) {
          dashboard.selectedSimulation = presentSimulation(detailResponse.data);
        } else {
          dashboard.selectedSimulation = null;
        }
      } else {
        // 合致するシミュレーションがなければシミュレーション未実行とする
        dashboard.selectedSimulation = null;
      }
    } else if (dashboard.selectedSimulation) {
      selectedRequirementId = dashboard.selectedSimulation.requirementId;
      selectedRequirementVersion = dashboard.selectedSimulation.requirementSnapshot?.version || dashboard.selectedSimulation.requirementVersion;
    }

    requirements = await Promise.all(
      requirements.map(async (req) => {
        const versions = await requirementService.fetchVersions(activeProject.id, req.id);
        let targetReq = req;

        if (req.id === selectedRequirementId && selectedRequirementVersion) {
          const found = versions.find((v) => v.version === selectedRequirementVersion);
          if (found) {
            targetReq = found;
          }
        }

        return {
          ...targetReq,
          versions: versions || [],
        };
      })
    );
    return {
      selectedSimulation: dashboard.selectedSimulation,
      simulations: dashboard.simulations,
      requirements,
      selectedRequirementId,
      selectedRequirementVersion,
    };
  }

  async getSimulationForRequirementVersion(projectId, requirementId, version) {
    const listResponse = await this.requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(projectId)}/simulations`,
    );
    if (!listResponse.ok || !Array.isArray(listResponse.data)) {
      return null;
    }
    const sims = listResponse.data.filter(
      (s) => s.requirementId === requirementId && s.requirementVersion === Number(version),
    );
    if (sims.length === 0) {
      return null;
    }
    sims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const targetSim = sims[0];

    const detailResponse = await this.requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(projectId)}/simulations/${encodeURIComponent(targetSim.id)}`,
    );
    if (!detailResponse.ok || !detailResponse.data) {
      return null;
    }
    return presentSimulation(detailResponse.data);
  }
}

module.exports = {
  SimulationService,
  formatDateTime,
  simulationService: new SimulationService(),
};
