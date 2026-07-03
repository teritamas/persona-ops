output "artifact_repository" {
  description = "Docker repository used by the application pipeline."
  value       = module.cicd.artifact_repository
}

output "cloud_build_service_account" {
  description = "Service account used by the main branch deployment trigger."
  value       = module.cicd.deployer_service_account
}

output "state_bucket" {
  description = "GCS bucket that stores the application environment Terraform state."
  value       = module.terraform_state.bucket_name
}

output "trigger_id" {
  description = "Cloud Build trigger ID."
  value       = module.cicd.trigger_id
}
