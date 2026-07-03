resource "google_artifact_registry_repository" "application" {
  project       = var.project_id
  location      = var.region
  repository_id = "persona-ops"
  description   = "PersonaOps application container images"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-recent-releases"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      older_than = "604800s"
    }
  }
}

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "persona-ops-cloud-build"
  display_name = "PersonaOps Cloud Build deployer"
}

resource "google_project_iam_member" "deployer" {
  for_each = var.deployer_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_cloudbuild_trigger" "main" {
  project     = var.project_id
  name        = "persona-ops-main"
  description = "Deploy PersonaOps after changes are merged into main."
  location    = "global"
  filename    = "infra/gcp/cloudbuild.yaml"

  service_account = google_service_account.deployer.id

  github {
    owner = var.github_owner
    name  = var.github_repository

    push {
      branch = "^main$"
    }
  }

  substitutions = {
    _REGION       = var.region
    _STATE_BUCKET = var.state_bucket
  }

  depends_on = [google_project_iam_member.deployer]
}
