# API Workspace Rules

## ドキュメント参照

- 開発前に必ず [./README.md](./README.md) の構成や開発コマンドなどを参照してください。

## テストの記述規則

- テストファイル (`tests/**/*.ts`) 内の タイトル（説明文）は、必ず**日本語**で記述し、仕様書として機能させてください。

## バックエンド API (Node.js/TypeScript) のベストプラクティス

- **技術選定**: Fastify と Google Agent Development Kit (ADK) を標準とする。
- **品質・テスト**: ESLint、Prettierによるフォーマットを徹底し、Vitestによる単体テスト（`tests/**/*.ts`）を必ず実装し、必要に応じて既存のものを更新すること。

## CI/CDパイプライン (API)

- **CI (継続的インテグレーション)**: GitHub Actions で `pnpm test` 等を実行し品質を担保する。
- **CD (継続的デプロイメント)**: Cloud Build 経由で Artifact Registry へのPushとCloud Runへのデプロイを自動で行う。
- **実装後の検証ルール**: CIでの頻繁な失敗を防ぐため、実装や処理を修正した後は**必ずCIと同じチェック（`pnpm lint`, `pnpm typecheck`, `pnpm test`）を手元で実行**し、全てパスすることを確認してからコミットすること。

## コーディング・設計指針

- ルートディレクトリの `AGENTS.md` に記載されている基本指針とMVPスコープを意識して開発してください。
- SOLID原則、YAGNI、DRY、KISS などのベストプラクティスを遵守し、クリーンな設計を維持してください。

## アーキテクチャ: DDD + Ports & Adapters（Hexagonal Architecture）

本プロジェクトの API は **DDD（Domain-Driven Design）** をベースに **Ports & Adapters（Hexagonal Architecture）** の考え方を採用する。

```
routes/        ← HTTP / Fastify 固有の責務（コントローラー層）
    ↓ DTO
application/   ← ユースケースのオーケストレーション（Fastify・GCP 非依存）
    ↓ Ports（Interface）
domain/        ← ビジネスルールのみ（外部技術への依存ゼロ）
    ↑ Adapters（実装）
infra/         ← Port の具象実装（Firestore, ADK/VertexAI など）
```

### 各層の責務

| 層             | ディレクトリ       | 責務                                                                               |
| -------------- | ------------------ | ---------------------------------------------------------------------------------- |
| コントローラー | `src/routes/`      | リクエスト受付・Zodバリデーション・DTOへの変換・application への委譲               |
| ユースケース   | `src/application/` | ユースケースのオーケストレーション。Port（Interface）経由で外部システムを操作      |
| ドメイン       | `src/domain/`      | エンティティ・値オブジェクト・リポジトリインターフェースの定義。ビジネスルールのみ |
| インフラ       | `src/infra/`       | Port の具象実装。Firestore (`firestore/`)・ADK/VertexAI (`ai/`) などに分類         |

### 依存関係ルール（必ず守ること）

1. **Fastify の型・API は `src/routes/` のみが使用する。** `application/`・`domain/` 層は `FastifyRequest` 等を import してはならない。
2. **`application/` 層は `domain/` のリポジトリインターフェースと `application/ports/` のポートインターフェースのみに依存する。** `infra/` の具象クラスを直接 import してはならない。
3. **`domain/` 層は外部パッケージに依存しない。** `@google-cloud/*`・`@google/adk`・`fastify` 等は import 禁止。純粋なビジネスモデルのみを持つ。
4. **`infra/` の具象クラスはドメインまたは application ポートのインターフェースを実装する（依存性逆転の原則）。** GCP固有コードは `infra/` に閉じる。
5. **DI の構築は `src/infra/container.ts` の `buildContainer()` 関数に集約する。** `app.ts` はこの関数を呼ぶだけにする。
6. **AI・DBが別の実装に置き換わっても `application/` 以上のコードを変更しなくて済む設計を維持する。**

### DTO の方針

- DTOはそれを使うユースケースと同じドメインディレクトリ配下の `dto/` サブディレクトリに配置する。
  - 例: `application/project/dto/create-project-request.ts`
  - 例: `application/chat/dto/send-message-request.ts`
- `routes/` 層はリクエストをDTOに変換して `application/` に渡す。`application/` はDTOをDomainオブジェクトに変換して処理する。
- これによりAPIの変更とDomainの変更を互いに独立させられる。

### ポート（Port）の配置方針

- **リポジトリインターフェース**（DBアクセス）は `domain/<aggregate>/xxx-repository.ts` に配置する。
- **外部サービス接続ポート**（AI・通知など、ドメイン概念ではないもの）は `application/ports/` に配置する。
  - 例: `LanguageModelPort` は AI プロバイダーへの接続ポートであるため `application/ports/language-model-port.ts` に置く。

### 命名規則

| 対象                   | 規則                             | 例                                               |
| ---------------------- | -------------------------------- | ------------------------------------------------ |
| インターフェース       | `I` プレフィックス**なし**       | `ProjectRepository`, `LanguageModelPort`         |
| インフラ具象クラス     | `<技術名><役割>`                 | `FirestoreProjectRepository`, `AdkLanguageModel` |
| リポジトリ実装ファイル | `<domain>-repository.<store>.ts` | `project-repository.firestore.ts`                |
| ユースケースクラス     | `<ドメイン名>Service`            | `ProjectService`, `ChatService`                  |
| ドメインエンティティ   | そのまま                         | `Project`, `ChatSession`, `Message`              |
| DTO                    | `<動詞><対象><Request            | Response>`                                       | `CreateProjectRequest`, `SendMessageResponse` |
