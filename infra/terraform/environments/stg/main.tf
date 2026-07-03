module "google_apis" {
  source = "../../modules/google_apis"

  project_id = var.project_id
  services   = local.google_apis
}

module "application_data" {
  source = "../../modules/application_data"

  project_id       = var.project_id
  region           = var.region
  application_name = local.application_name

  depends_on = [module.google_apis]
}

module "application_runtime" {
  source = "../../modules/application_runtime"

  project_id            = var.project_id
  region                = var.region
  application_name      = local.application_name
  container_image       = var.container_image
  uploads_bucket        = module.application_data.uploads_bucket
  vertex_ai_model       = var.vertex_ai_model
  allow_unauthenticated = var.allow_unauthenticated
  max_instances         = var.max_instances

  depends_on = [
    module.application_data,
    module.google_apis,
  ]
}
