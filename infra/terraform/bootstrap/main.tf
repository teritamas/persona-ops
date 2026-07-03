module "google_apis" {
  source = "../modules/google_apis"

  project_id = var.project_id
  services   = local.google_apis
}

module "terraform_state" {
  source = "../modules/terraform_state"

  project_id = var.project_id
  region     = var.region

  depends_on = [module.google_apis]
}

module "cicd" {
  source = "../modules/cicd"

  project_id        = var.project_id
  region            = var.region
  github_owner      = var.github_owner
  github_repository = var.github_repository
  state_bucket      = module.terraform_state.bucket_name
  deployer_roles    = local.cloud_build_roles

  depends_on = [module.google_apis]
}

