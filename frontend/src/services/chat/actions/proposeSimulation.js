module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_SIMULATION]',
  execute: (activeProject) => {
    const draft = activeProject?.requirements?.find(r => r.status === 'draft');
    const requirementTitle = draft ? `「${draft.title}」` : '新機能';
    return {
      role: 'proposal',
      proposal: {
        buttonText: `${requirementTitle}の機能のシミュレーションを行う`,
        inputText: `${requirementTitle}の機能のシミュレーションを実行してください。`,
        style: 'green'
      }
    };
  }
};
