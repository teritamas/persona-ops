/**
 * AI エージェントに対する汎用的なリクエストを行うためのポート
 *
 * Why: application 層や routes 層が特定のクラウドベンダーや AI モデルに依存しないよう、
 * 単一の実行単位として抽象化する。今後はチャットやペルソナ生成などでも利用される。
 */
export interface AiAgentPort {
  /**
   * AI エージェントに対してプロンプトを送信し、応答を取得する
   */
  invoke(prompt: string, options?: { timeoutMs?: number }): Promise<string>;
}
