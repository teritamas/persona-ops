resource "google_service_account" "dispatcher" {
  project      = var.project_id
  account_id   = "persona-simulation-task"
  display_name = "PersonaOps simulation task dispatcher"
}

resource "google_cloud_tasks_queue" "simulation" {
  project  = var.project_id
  location = var.region
  name     = var.queue_name

  rate_limits {
    max_concurrent_dispatches = 2
    max_dispatches_per_second = 2
  }

  retry_config {
    max_attempts  = 3
    min_backoff   = "5s"
    max_backoff   = "60s"
    max_doublings = 3
  }

  http_target {
    http_method = "POST"

    uri_override {
      scheme                    = "HTTPS"
      host                      = trimprefix(var.target_service_url, "https://")
      uri_override_enforce_mode = "ALWAYS"
    }

    oidc_token {
      service_account_email = google_service_account.dispatcher.email
      audience              = var.target_service_url
    }
  }
}

resource "google_project_iam_member" "enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${var.enqueuer_service_account}"
}

resource "google_service_account_iam_member" "dispatcher_user" {
  service_account_id = google_service_account.dispatcher.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.enqueuer_service_account}"
}

resource "google_cloud_run_v2_service_iam_member" "dispatcher_invoker" {
  project  = var.project_id
  location = var.region
  name     = var.target_service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.dispatcher.email}"
}
