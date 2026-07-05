module "google_apis" {
  source = "../../modules/google_apis"

  project_id = var.project_id
  services   = local.google_apis
}

module "application_data" {
  source = "../../modules/application_data"

  project_id       = var.project_id
  region           = var.region
  application_name = "persona-ops"

  depends_on = [module.google_apis]
}

module "frontend_runtime" {
  source = "../../modules/frontend_runtime"

  project_id       = var.project_id
  region           = var.region
  application_name = local.frontend_service_name
  container_image  = var.frontend_container_image
  api_base_url     = module.private_api_runtime.service_url
  max_instances    = var.frontend_max_instances

  depends_on = [module.google_apis]
}

module "private_api_runtime" {
  source = "../../modules/private_api_runtime"

  project_id            = var.project_id
  region                = var.region
  application_name      = local.private_api_service_name
  container_image       = var.api_container_image
  uploads_bucket        = module.application_data.uploads_bucket
  vertex_ai_model       = var.vertex_ai_model
  simulation_queue_name = local.simulation_queue_name
  invoker_members = toset([
    "serviceAccount:${module.frontend_runtime.runtime_service_account}",
  ])
  max_instances = var.api_max_instances

  depends_on = [
    module.application_data,
    module.google_apis,
  ]
}

module "simulation_tasks" {
  source = "../../modules/simulation_tasks"

  project_id               = var.project_id
  region                   = var.region
  queue_name               = local.simulation_queue_name
  target_service_name      = local.private_api_service_name
  target_service_url       = module.private_api_runtime.service_url
  enqueuer_service_account = module.private_api_runtime.runtime_service_account

  depends_on = [
    module.google_apis,
    module.private_api_runtime,
  ]
}

module "mcp_server_runtime" {
  source = "../../modules/mcp_server_runtime"

  project_id       = var.project_id
  region           = var.region
  application_name = local.mcp_server_name
  container_image  = var.mcp_container_image
  private_api_url  = module.private_api_runtime.service_url
  max_instances    = var.mcp_max_instances

  depends_on = [module.google_apis]
}

resource "google_cloud_run_v2_service_iam_member" "mcp_private_api_invoker" {
  project  = var.project_id
  location = var.region
  name     = local.private_api_service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${module.mcp_server_runtime.runtime_service_account}"
}
