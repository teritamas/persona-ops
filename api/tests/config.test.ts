import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const validEnvironment = {
  GOOGLE_CLOUD_LOCATION: 'asia-northeast1',
  GOOGLE_CLOUD_PROJECT: 'persona-ops-stg-project',
  GOOGLE_GENAI_USE_VERTEXAI: 'true',
  SIMULATION_QUEUE: 'persona-simulations',
  UPLOADS_BUCKET: 'persona-ops-stg-project-persona-ops-uploads',
  VERTEX_AI_MODEL: 'gemini-2.5-flash',
};

describe('環境設定の読み込み', () => {
  it('ローカルサーバーのデフォルト設定を読み込む', () => {
    const config = loadConfig(validEnvironment);

    expect(config).toMatchObject({
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      PORT: 8080,
    });
  });

  it('Vertex AI 以外の設定を拒否する', () => {
    expect(() =>
      loadConfig({
        ...validEnvironment,
        GOOGLE_GENAI_USE_VERTEXAI: 'false',
      }),
    ).toThrow();
  });

  it('Google Cloud プロジェクトが設定されていない場合は拒否する', () => {
    const environment: Record<string, string> = { ...validEnvironment };
    delete environment.GOOGLE_CLOUD_PROJECT;
    expect(() => loadConfig(environment)).toThrow();
  });
});
