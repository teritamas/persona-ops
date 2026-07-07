module.exports = {
  tag: '[SYSTEM_ACTION: SIMULATION_REQUESTED]',
  execute: () => ({
    role: 'system',
    text: 'シミュレーションを開始しました'
  })
};
