# Infrastructure (Terraform) Workspace Rules

## ドキュメント参照

- 開発前に必ず [./README.md](./README.md) の手順やアーキテクチャ方針を参照してください。

## インフラストラクチャ実装のベストプラクティス

- **モジュール化**: リソースは責務ごとに `modules/` 配下に分割し、`environments/` から呼び出す。
- **状態管理**: Terraform StateはGCSバックエンドで管理する（`bootstrap`で構築済み）。
- **サーバーレス＆最小権限**: Cloud Run（最小インスタンス0、CPU idle有効）を利用し、IAMは専用サービスアカウントで最小限の権限を付与する。

## CI/CDパイプライン (Terraform)

- **CI (継続的インテグレーション)**: GitHub Actions で `terraform validate/fmt` を実行し品質を担保する。
- **CD (継続的デプロイメント)**: `main` ブランチへのマージをトリガーとし、Cloud Build 経由でインフラを自動適用する。
