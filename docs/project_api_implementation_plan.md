# [feature] Project API の実装とフロントエンド結合 実装計画

本計画は、フロントエンドからプロジェクトの管理（新規作成、一覧取得、切り替え）を実際に行えるようにするため、バックエンド（`api`）での Project API 実装および、フロントエンド（`frontend`）との結合を行うものです。

## 目的

フロントエンドからプロジェクトの管理（作成・一覧取得）を行えるようにするため、バックエンド（api）にProject APIエンドポイントを実装し、フロントエンド（BFF）と結合します。

## 期待される成果
- **Project API の実装**
  - [x] POST /projects: 新規プロジェクトの作成
  - [x] GET /projects: プロジェクト一覧の取得
- **フロントエンド（BFF）との結合**
  - [x] ExpressルーターからAPIサーバーを呼び出すように修正
  - [x] プロジェクトの新規作成および切り替えが動作することを確認
- **テスト**
  - [x] 新規作成したエンドポイントに対する結合テストの実装

---

## 期待される変更点

### 1. API Backend (プロジェクト管理の永続化とエンドポイント)

#### Domain Layer
- `api/src/domain/project.ts` (新規): `Project` ドメインインターフェースの定義 (id, name, createdAt)。

#### Application Layer
- `api/src/application/ports/project-repository-port.ts` (新規): プロジェクト永続化のための抽象インターフェース `ProjectRepositoryPort`。
- `api/src/application/project-service.ts` (新規): `ProjectService` クラスの実装（プロジェクト作成、一覧取得のユースケース）。

#### Infrastructure Layer
- `api/src/infra/database/firestore-project-repository.ts` (新規): `@google-cloud/firestore` を使用し、`projects` コレクションに対して書き込み・読み込みを行う `ProjectRepositoryPort` の具象実装。
- `api/src/infra/container.ts` (修正): Firestore クライアントのインスタンス化および `projectRepository`, `projectService` を DI コンテナに登録。

#### Presentation Layer
- `api/src/routes/project-routes.ts` (新規): Fastify ルーティング定義 (`POST /api/v1/projects`, `GET /api/v1/projects`)。
- `api/src/app.ts` (修正): `projectRoutes` ルーターを Fastify インスタンスに登録。

---

### 2. Frontend BFF (API との接続)

#### Routes
- `frontend/src/routes/index.js` (修正):
  - `GET /` (メイン画面): `requestPrivateApi('/api/v1/projects')` を使って本物のプロジェクト一覧をバックエンドから取得。取得したプロジェクトに対してフロントエンドのモックデータをマージして EJS に渡す。
  - `POST /api/project/create` (新規プロジェクト作成): `requestPrivateApi('/api/v1/projects', ...)` を呼び出してバックエンド側にプロジェクトを作成。

---

### 3. Tests (結合テスト)

#### Routes Test
- `api/tests/routes/project-routes.test.ts` (新規): `GET /api/v1/projects` および `POST /api/v1/projects` に対する Fastify の結合テスト。

---

## Verification Plan

### Automated Tests
1. バックエンドのユニット・結合テストの実行。
   ```sh
   cd api
   pnpm test
   ```
2. 静的解析および型チェックの確認。
   ```sh
   cd api
   pnpm lint
   pnpm typecheck
   ```

### Manual Verification
1. バックエンドとフロントエンドの両方のサーバーを起動。
   - バックエンド: `cd api && pnpm dev`
   - フロントエンド: `cd frontend && pnpm dev`
2. ブラウザで `http://localhost:3000` を開く。
3. プロジェクト選択リストから「新しいプロジェクトを追加」を実行し、バックエンド (Firestore) を経由して新しいプロジェクトが作成されることを確認。
4. プロジェクトの切り替えが正常に行えることを検証。
