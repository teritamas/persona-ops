locals {
  application_name = "persona-ops"

  labels = {
    application = local.application_name
    environment = var.environment
    managed-by  = "terraform"
  }

  google_apis = toset([
    "aiplatform.googleapis.com",
    "firestore.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
  ])
}
