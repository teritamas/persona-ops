# PersonaOps インフラストラクチャ

## アーキテクチャ

アイドル時の費用を抑えるため、サーバーレスかつ従量課金のGoogle Cloudサービスで構成する。

- Cloud Run：`persona-ops-web` と `persona-ops-private-api` の実行基盤。最小インスタンス数0、上限instanceあり
- Vertex AI：事前確保されたキャパシティを持たないGemini・Embedding推論
- Firestore Native：プロジェクト、会話、ペルソナオントロジー、
  シミュレーション履歴、ベクトルを保存
- Cloud Storage：アップロード原本を非公開で保存し、30日後にNearlineへ移行
- Artifact Registry：コンテナイメージを保存し、古いイメージを自動削除
- Cloud Build：`main`へのpush後にアプリケーションとインフラをデプロイ
- GitHub Actions：デプロイ前に認証情報なしでTerraformの書式と構文を検証

Terraformリソースは`modules/`配下で責務ごとに分割する。`bootstrap`と
`environments/stg`のroot moduleは、各moduleの呼び出しと接続だけを行う。

> 将来的に商用環境を用意する時は、新規でプロジェクトを作成し`environments/prod`を作成する

## 実行手順

### 1. Google CloudとGitHubの準備

課金が有効なGoogle Cloudプロジェクトを作成または選択する。作業者には、APIの有効化、サービスアカウント作成、プロジェクトIAM更新、Storage bucket作成、Cloud Build trigger作成の権限が必要になる。

本ドキュメントで使用する環境変数を設定する。

```sh
export PROJECT_ID="persona-ops"
export USER_EMAIL="sayako.o21@gmail.com"
```

Google Cloudへログインし、対象プロジェクトを選択する。

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project ${PROJECT_ID}
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com
```

triggerを作成する前に、`persona-ops`リポジトリへCloud Build GitHub Appをインストールする。GitHubの認可操作は対話的に行う必要があり、Terraformでは完結できない。

### 2. stg環境の初期化（bootstrap）

bootstrapは、stg環境をデプロイするために必要な以下のリソースを作成する。

- Terraform state用Cloud Storage bucket
- Artifact Registry repository
- Cloud Build用サービスアカウントとIAM
- GitHub `main` branch trigger

ローカル変数ファイルを作成する。

```sh
cp infra/terraform/bootstrap/terraform.tfvars.example \
  infra/terraform/bootstrap/terraform.tfvars
```

`terraform.tfvars`の`project_id`、`github_owner`、`github_repository`、
`region`を設定し、planを確認してからapplyする。

```sh
terraform -chdir=infra/terraform/bootstrap init
terraform -chdir=infra/terraform/bootstrap fmt -check
terraform -chdir=infra/terraform/bootstrap validate
terraform -chdir=infra/terraform/bootstrap plan -out=bootstrap.tfplan
terraform -chdir=infra/terraform/bootstrap apply bootstrap.tfplan
terraform -chdir=infra/terraform/bootstrap output
```

bootstrap自身がremote state用bucketを作成するため、bootstrapのstateはローカルで管理する。`terraform.tfstate`、`terraform.tfvars`、保存したplanをGitへcommitしてはならない。
初回apply後、bootstrapのstateは暗号化されたチーム共有ストレージへ保管する。bootstrapに変更がある場合も、同じplan・apply手順を手動で実行する。

### 3. stg環境のデプロイ

通常のstgデプロイは以下の流れで実行される。

1. feature branchをpushし、pull requestを作成する
2. GitHub ActionsがTerraformの書式と構文を検証する
3. pull requestを`main`へmergeする
4. `api/Dockerfile` と `frontend/Dockerfile` を使ってCloud Buildが両イメージをbuildする
5. Cloud Buildがstg用GCS backendを初期化する
6. Cloud Buildが`environments/stg`をapplyする

merge前にGitHub Actionsの`Terraform CI`が成功していることを確認する。
merge後はGoogle Cloud Buildの`persona-ops-main`を確認する。

Cloud Runのデプロイ先URLは以下で確認できる。

```sh
gcloud run services describe persona-ops-web \
  --region=asia-northeast1 \
  --format="value(status.url)"

gcloud run services describe persona-ops-private-api \
  --region=asia-northeast1 \
  --format="value(status.url)"
```

## 開発/運用者向け

### stg環境の手動実行する

初回確認または障害復旧時に限定する。bootstrapで作成したstate bucketを指定する。

```sh
STATE_BUCKET="$(terraform -chdir=infra/terraform/bootstrap output -raw state_bucket)"

terraform -chdir=infra/terraform/environments/stg init \
  -backend-config="bucket=${STATE_BUCKET}"
terraform -chdir=infra/terraform/environments/stg fmt -check
terraform -chdir=infra/terraform/environments/stg validate
terraform -chdir=infra/terraform/environments/stg plan \
  -var="api_container_image=asia-northeast1-docker.pkg.dev/${PROJECT_ID}/persona-ops/private-api:manual" \
  -var="frontend_container_image=asia-northeast1-docker.pkg.dev/${PROJECT_ID}/persona-ops/frontend:manual" \
  -var="project_id=${PROJECT_ID}" \
  -var="region=asia-northeast1" \
  -out=stg.tfplan
terraform -chdir=infra/terraform/environments/stg apply stg.tfplan
terraform -chdir=infra/terraform/environments/stg output frontend_service_url
terraform -chdir=infra/terraform/environments/stg output api_service_url
```

どちらも同じGCS backendとTerraform state lockを使用するため、Cloud Buildの実行中に手動applyを実行してはならない。

### ローカル開発用ADCを作成する

stg apply後に作成されたprivate API用Cloud Runサービスアカウントを、ローカルでもimpersonateする。これによりサービスアカウントキーを発行せず、Cloud Runと同じIAM権限でVertex AI、Firestore、Cloud Storageへ接続できる。

管理者が開発者へToken Creator権限を付与する。

```sh
gcloud iam service-accounts add-iam-policy-binding \
  persona-ops-private-api@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="user:${USER_EMAIL}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

開発者はimpersonationを利用するADCを作成する。

```sh
gcloud auth application-default login \
  --impersonate-service-account=persona-ops-private-api@${PROJECT_ID}.iam.gserviceaccount.com
```

Terraform適用前はサービスアカウントやデータリソースが存在しないため、この手順と実GCP疎通確認は実行できない。APIのunit testはGCPをmock化しているため、Terraform適用前でも実行できる。

その後下記のコマンドで接続ができていることを確認する。

```
cd api
pnpm verify:gcp
```

## セキュリティとコスト

- アップロードファイルとTerraform stateにはpublic access preventionとuniform bucket-level accessを設定する
- Cloud RunとCloud Buildでサービスアカウントを分離し、鍵を発行しない
- Firestoreの削除保護を有効化し、Terraformからstgデータを削除しない
- `persona-ops-web` は未認証公開、`persona-ops-private-api` はIAM認証を必須とする
- frontendサービスアカウントにだけprivate APIの `roles/run.invoker` を付与し、Vertex AI / Firestore / Storage 権限は付与しない
- 常時稼働するDB、VM、NAT gateway、load balancer、VPC connectorは作成しない
- billing accountと通知先の決定後、予算アラートを設定する
