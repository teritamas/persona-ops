resource "google_service_account" "application" {
  project      = var.project_id
  account_id   = var.application_name
  display_name = "PersonaOps MCP server runtime"
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
    timeout                          = "60s"
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
        name  = "PRIVATE_API_URL"
        value = var.private_api_url
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
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.application.project
  location = google_cloud_run_v2_service.application.location
  name     = google_cloud_run_v2_service.application.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
