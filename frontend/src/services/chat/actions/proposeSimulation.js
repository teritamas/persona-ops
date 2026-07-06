module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_SIMULATION]',
  execute: (activeProject) => {
    const draft = activeProject?.requirements?.find(r => r.status === 'draft');
    const requirementTitle = draft ? `「${draft.title}」の` : '新機能要件の';
    return {
      role: 'proposal',
      proposal: {
        buttonText: `${requirementTitle}シミュレーションを実行する`,
        inputText: `${requirementTitle}ペルソナシミュレーションを開始してください。`,
        style: 'green'
      }
    };
  }
};
