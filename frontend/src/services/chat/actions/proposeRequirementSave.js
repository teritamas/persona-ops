module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_SAVE]',
  execute: () => ({
    role: 'proposal',
    proposal: {
      buttonText: 'この内容で要件をドラフトとして保存する',
      inputText: '提示された要件の定義（ドラフト）を保存してください。',
      style: 'indigo'
    }
  })
};
