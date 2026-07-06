module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_APPROVAL]',
  execute: (activeProject) => {
    const draft = activeProject?.requirements?.find(r => r.status === 'draft');
    return {
      role: 'proposal',
      proposal: {
        buttonText: `この内容で要件を承認する`,
        inputText: `「${draft?.title || ''}」の要件を承認する`,
        buttonText2: 'ドラフトを修正する',
        inputText2: 'ドラフトを修正します。',
        style: 'blue'
      }
    };
  }
};
