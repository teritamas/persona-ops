import { type AppConfig } from '../config.js';
import { type AiAgentPort } from '../application/ports/ai-agent-port.js';
import { AdkAiAgent } from './ai/adk-ai-agent.js';
import { Firestore } from '@google-cloud/firestore';
import { ProjectService } from '../application/project-service.js';
import { FirestoreProjectRepository } from './database/firestore-project-repository.js';

/**
 * アプリケーション全体の依存オブジェクトをまとめた型
 *
 * Why: app.ts が個々の具象クラスを知らなくて済むよう、
 * ポートインターフェースに依存するコンテナ型として定義する。
 */
export type Container = {
  aiAgent: AiAgentPort;
  projectService: ProjectService;
};

/**
 * インフラ層の具象クラスをインスタンス化して DI コンテナを構築する
 *
 * Why: DI 構築ロジックを app.ts から分離することで、
 * テスト時にコンテナをモックに差し替えやすくする。
 */
export function buildContainer(config: AppConfig): Container {
  const firestore = new Firestore({ projectId: config.GOOGLE_CLOUD_PROJECT });
  const projectRepository = new FirestoreProjectRepository(firestore);

  return {
    aiAgent: new AdkAiAgent({
      model: config.VERTEX_AI_MODEL,
    }),
    projectService: new ProjectService(projectRepository),
  };
}
