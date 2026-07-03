# PersonaOps インフラ・データ設計

## 採用構成

```mermaid
flowchart LR
    User["PdM / 開発チーム"] --> Run["Cloud Run<br/>Web / API / Agent"]
    Run --> Vertex["Vertex AI<br/>Gemini / Embeddings"]
    Run --> Firestore["Firestore<br/>会話・オントロジー・ベクトル"]
    Run --> Storage["Cloud Storage<br/>アップロード原本"]
    GitHub["GitHub main"] --> Build["Cloud Build"]
    Build --> Registry["Artifact Registry"]
    Build --> Terraform["Terraform"]
    Registry --> Run
    Terraform --> Run
```

## オントロジーの実装境界

Terraformはオントロジーそのものを実装せず、保存先のFirestoreと実行主体のIAMを構築する。オントロジーの型、検証、生成、更新、探索はアプリケーション層の責務とする。

PH1では、次のproperty graph相当のモデルをFirestoreに保存する。

- `projects/{projectId}`: 会話単位のプロジェクト
- `projects/{projectId}/sources/{sourceId}`: URL、ファイル、抽出テキストの来歴
- `projects/{projectId}/entities/{entityId}`: Persona、Role、Goal、Pain、Workflow、Requirementなどの型付きnode
- `projects/{projectId}/relations/{relationId}`: node間の有向edge。関係型、source、確信度、生成日時を保持
- `projects/{projectId}/conversations/{messageId}`: 構造化した会話の長期記憶
- `projects/{projectId}/simulations/{simulationId}`: 要件、対象persona、応答、根拠、判定のスナップショット
- `projects/{projectId}/chunks/{chunkId}`: sourceのchunk、embedding、source位置。Firestore vector searchの対象

nodeとedgeには必ず`schemaVersion`と`evidenceSourceIds`を持たせる。LLMの出力をそのまま保存せず、アプリケーションでJSON Schema等による型検証を行ってから永続化する。これにより、生成結果の変更に追従しながら根拠を遡れる。

## GCPのマネージド選択肢

Google Cloudに、OWL/RDF、推論エンジン、SPARQL endpointを一体で提供する専用の「マネージド・オントロジーサービス」はない。

ネイティブなグラフ機能としてSpanner Graphがあり、property graph、GQL、GraphRAGをサポートする。ただしEnterprise以上のSpannerが必要で、ハッカソンMVPのデータ量に対して常時コストと運用上の複雑さが過大なため採用しない。

MVPではFirestoreのnode/edgeコレクションを採用する。深い多段探索、複雑なGraphRAG、同時更新量が明確に必要になった時点で、同じnode/edgeモデルをSpanner Graphへ移行する。これは将来のための事前実装ではなく、移行判断の境界を明示するものとする。

Vertex AI RAG EngineはRAGパイプラインのマネージドサービスであり、オントロジーサービスではない。現状は小規模・低コストを優先し、Firestore vector searchとVertex AI Embeddingsを組み合わせる。

## ハッカソン要件対応

| 規約                                    | 対応                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Google Cloud実行プロダクトを1つ以上利用 | Cloud Run                                                                 |
| Google Cloud AI技術を1つ以上利用        | Vertex AI上のGemini API / Embeddings                                      |
| GitHub連携・CI/CD                       | mainへのpushをCloud Build triggerが検知                                   |
| デプロイ済みURL                         | Terraform output `cloud_run_service_url`                                  |
| 実運用を見据えたDevOps                  | GitHub Actions CI、remote state、権限分離、immutable image、IaC、validate |
| システム構成図                          | 本文のMermaidを提出用画像へ書き出す                                       |
| 公開GitHubリポジトリ                    | リポジトリ公開設定は提出前に手動確認                                      |
| ProtoPedia動画・タグ・ストーリー        | インフラ外。提出前チェックが必要                                          |

## コスト方針

- Cloud Runはrequest-based、最小0台、最大3台、CPU idleを有効化する。
- Firestoreは無料枠対象の`(default)` databaseを利用する。
- Artifact Registryは直近5イメージを保持し、古いイメージを削除する。
- Cloud Storageのアップロード原本は30日後にNearlineへ移行する。
- Spanner、Cloud SQL、GKE、常時稼働VM、NAT、ロードバランサは作成しない。
- Vertex AIのトークンとembedding生成が主な従量課金になるため、アプリ側で入力上限、chunk重複排除、embedding再利用、利用量計測を実装する。
