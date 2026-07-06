module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_DEFINITION]',
  execute: () => ({
    role: 'proposal',
    proposal: {
      buttonText: '機能要件を定義する',
      inputText: 'このプロジェクトに必要な機能要件を定義してください。',
      style: 'indigo'
    }
  })
};
