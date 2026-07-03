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

## コーディング・設計指針

- ルートディレクトリの `AGENTS.md` に記載されている基本指針とMVPスコープを意識して開発してください。
- SOLID原則、YAGNI、DRY、KISS などのベストプラクティスを遵守し、クリーンな設計を維持してください。
