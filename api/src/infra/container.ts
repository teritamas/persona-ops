import { type AppConfig } from '../config.js';
import { type AiAgentPort } from '../application/ports/ai-agent-port.js';
import { AdkAiAgent } from './ai/adk-ai-agent.js';
import { Firestore } from '@google-cloud/firestore';
import { ProjectService } from '../application/project-service.js';
import { FirestoreProjectRepository } from './database/firestore-project-repository.js';
import { PersonaService } from '../application/persona-service.js';
import { FirestorePersonaRepository } from './database/firestore-persona-repository.js';
import { createSavePersonasTool } from '../agents/persona-ops-agent/tools/save-personas-tool.js';
import { createFetchDocumentTool } from '../agents/persona-ops-agent/tools/fetch-document-tool.js';
import { createPersonaOpsAgent } from '../agents/persona-ops-agent/agent.js';
import type { InMemoryRunner } from '@google/adk';
import { FirestoreSourceDocumentRepository } from './database/firestore-source-document-repository.js';
import { HttpDocumentFetcher } from './document/http-document-fetcher.js';
import { SourceDocumentService } from '../application/source-document/source-document-service.js';

/**
 * アプリケーション全体の依存オブジェクトをまとめた型
 *
 * Why: app.ts が個々の具象クラスを知らなくて済むよう、
 * ポートインターフェースに依存するコンテナ型として定義する。
 */
export type Container = {
  aiAgent: AiAgentPort;
  projectService: ProjectService;
  personaService: PersonaService;
  personaOpsAgent: InMemoryRunner;
  sourceDocumentService: SourceDocumentService;
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
  const personaRepository = new FirestorePersonaRepository(firestore);
  const sourceDocumentRepository = new FirestoreSourceDocumentRepository(
    firestore,
  );
  const documentFetcher = new HttpDocumentFetcher();

  const aiAgent = new AdkAiAgent({
    model: config.VERTEX_AI_MODEL,
  });

  const sourceDocumentService = new SourceDocumentService(
    sourceDocumentRepository,
    documentFetcher,
  );

  const savePersonasTool = createSavePersonasTool(personaRepository);
  const fetchDocumentTool = createFetchDocumentTool(sourceDocumentService);

  const personaOpsAgent = createPersonaOpsAgent({
    model: config.VERTEX_AI_MODEL,
    tools: [savePersonasTool, fetchDocumentTool],
  });

  return {
    aiAgent,
    projectService: new ProjectService(projectRepository),
    personaService: new PersonaService(personaRepository, aiAgent),
    personaOpsAgent,
    sourceDocumentService,
  };
}
