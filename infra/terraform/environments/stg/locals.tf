locals {
  frontend_service_name    = "persona-ops-web"
  private_api_service_name = "persona-ops-private-api"
  simulation_queue_name    = "persona-simulations"

  labels = {
    application = "persona-ops"
    environment = var.environment
    managed-by  = "terraform"
  }

  google_apis = toset([
    "aiplatform.googleapis.com",
    "cloudtasks.googleapis.com",
    "firestore.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
  ])
}
