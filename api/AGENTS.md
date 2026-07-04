# API Workspace Rules

## ドキュメント参照

- 実装に関する全体方針は[AGENTS.md](../AGENTS.md)を参照する
- 動作確認手順などは [README.md](./README.md) の構成や開発コマンドなどを参照する
- 設計ドキュメントは`docs/`フォルダ内を参照する

## テスト/静的解析

- テストファイル (`tests/**/*.ts`) 内の タイトル（説明文）は、必ず**日本語**で記述し、仕様書として機能させる
- ソースコードの修正作業が完了したら、**必ずCIと同じチェック（`pnpm lint`, `pnpm typecheck`, `pnpm test`）を手元で実行**し成功させる。失敗した場合は修正した上で成功するまで改善を繰り返す
- ESLint、Prettierによるフォーマットを徹底し、Vitestによる単体テスト（`tests/**/*.ts`）を必ず実装し、必要に応じて既存のものを更新する

## バックエンド API (Node.js/TypeScript) の開発方針

- **技術選定**: Fastify と Google Agent Development Kit (ADK) を標準とする。

## アーキテクチャ: DDD + Ports & Adapters（Hexagonal Architecture）

本プロジェクトの API は **DDD（Domain-Driven Design）** をベースに **Ports & Adapters（Hexagonal Architecture）** の考え方を採用する。

```
routes/        ← HTTP / Fastify 固有の責務（コントローラー層）
    ↓ DTO
application/   ← ユースケースのオーケストレーション（Fastify・GCP 非依存）
    ↓ Ports（`application/ports/agents`, `application/ports/infra`）
domain/        ← ビジネスルールのみ（外部技術への依存ゼロ）
    ↑ Adapters（実装）
agents/        ← ADK Agent・Tool の実装（application の Port を実装・利用）
infra/         ← Port の具象実装（Firestore, ADK/VertexAI など）
```

### 各層の責務

| 層             | ディレクトリ       | 責務                                                                           |
| -------------- | ------------------ | ------------------------------------------------------------------------------ |
| コントローラー | `src/routes/`      | リクエスト受付・Zodバリデーション・DTOへの変換・application への委譲           |
| ユースケース   | `src/application/` | ユースケースのオーケストレーション。Port（Interface）経由で外部システムを操作  |
| ドメイン       | `src/domain/`      | エンティティ・値オブジェクト・純粋なビジネスルール                             |
| Agent          | `src/agents/`      | ADK Agent・Tool・instruction。application Service/Port経由でユースケースを実行 |
| インフラ       | `src/infra/`       | Port の具象実装。Firestore、Cloud Tasks、汎用Vertex AI接続などに分類           |

### 依存関係ルール（必ず守ること）

1. **Fastify の型・API は `src/routes/` のみが使用する。** `application/`・`domain/` 層は `FastifyRequest` 等を import してはならない。
2. **`application/` 層は `domain/` のモデルと `application/ports/` のポートインターフェースのみに依存する。** `infra/` の具象クラスを直接 import してはならない。
3. **`domain/` 層は外部パッケージに依存しない。** `@google-cloud/*`・`@google/adk`・`fastify` 等は import 禁止。純粋なビジネスモデルのみを持つ。
4. **`infra/` の具象クラスは application ポートのインターフェースを実装する（依存性逆転の原則）。** GCP固有コードは `infra/` に閉じる。
5. **DI の構築は `src/infra/container.ts` の `buildContainer()` 関数に集約する。** `app.ts` はこの関数を呼ぶだけにする。
6. **AI・DBが別の実装に置き換わっても `application/` 以上のコードを変更しなくて済む設計を維持する。**
7. **`agents/` はRepositoryを直接操作せず、application ServiceまたはPortを利用する。** Agent固有型をapplication/domainへ漏らさない。
8. **Cloud Tasksなど内部サービス専用のRouteは`src/routes/internal/`へ配置する。** 公開APIと同じRouteファイルへ混在させず、`/api/v1/internal/` prefixを使用する。

### DTO の方針

- DTOはそれを使うユースケースと同じドメインディレクトリ配下の `dto/` サブディレクトリに配置する。
  - 例: `application/project/dto/create-project-request.ts`
  - 例: `application/chat/dto/send-message-request.ts`
- `routes/` 層はリクエストをDTOに変換して `application/` に渡す。`application/` はDTOをDomainオブジェクトに変換して処理する。
- これによりAPIの変更とDomainの変更を互いに独立させられる。

### ポート（Port）の配置方針

- **Agentポート**は `application/ports/agents/` に配置する。
  - 例: `PersonaSimulationAgentPort` は `application/ports/agents/persona-simulation-agent-port.ts` に置く。
- **インフラポート**は `src/infra/` の分類と対応するサブディレクトリへ配置する。
  - AI: `application/ports/infra/ai/`
  - DB: `application/ports/infra/database/`
  - Queue: `application/ports/infra/queue/`
  - Storage: `application/ports/infra/storage/`
  - 例: `PersonaStorePort` は `application/ports/infra/database/persona-store-port.ts` に置く。

### 命名規則

| 対象                   | 規則                               | 例                                               |
| ---------------------- | ---------------------------------- | ------------------------------------------------ |
| インターフェース       | `I` プレフィックス**なし**         | `ProjectStorePort`, `LanguageModelPort`          |
| インフラ具象クラス     | `<技術名><役割>`                   | `FirestoreProjectRepository`, `AdkLanguageModel` |
| リポジトリ実装ファイル | `firestore-<domain>-repository.ts` | `firestore-project-repository.ts`                |
| ユースケースクラス     | `<ドメイン名>Service`              | `ProjectService`, `ChatService`                  |
| ドメインエンティティ   | そのまま                           | `Project`, `ChatSession`, `Message`              |
| DTO                    | `<動詞><対象><Request              | Response>`                                       | `CreateProjectRequest`, `SendMessageResponse` |
