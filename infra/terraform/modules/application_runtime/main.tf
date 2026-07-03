resource "google_service_account" "application" {
  project      = var.project_id
  account_id   = var.application_name
  display_name = "PersonaOps Cloud Run runtime"
}

resource "google_project_iam_member" "vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.application.email}"
}

resource "google_project_iam_member" "firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.application.email}"
}

resource "google_storage_bucket_iam_member" "uploads" {
  bucket = var.uploads_bucket
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.application.email}"
}

resource "google_cloud_run_v2_service" "application" {
  project  = var.project_id
  name     = var.application_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  deletion_protection = false

  scaling {
    min_instance_count = 0
    max_instance_count = var.max_instances
  }

  template {
    service_account                  = google_service_account.application.email
    timeout                          = "300s"
    max_instance_request_concurrency = 40

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      resources {
        cpu_idle = true
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }

      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "true"
      }

      env {
        name  = "UPLOADS_BUCKET"
        value = var.uploads_bucket
      }

      env {
        name  = "VERTEX_AI_MODEL"
        value = var.vertex_ai_model
      }
    }
  }

  depends_on = [
    google_project_iam_member.firestore,
    google_project_iam_member.vertex_ai,
    google_storage_bucket_iam_member.uploads,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = google_cloud_run_v2_service.application.project
  location = google_cloud_run_v2_service.application.location
  name     = google_cloud_run_v2_service.application.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
