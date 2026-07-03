output "cloud_run_service_url" {
  description = "URL of the PersonaOps Cloud Run service."
  value       = module.application_runtime.service_url
}

output "runtime_service_account" {
  description = "Least-privilege identity used by the application."
  value       = module.application_runtime.runtime_service_account
}

output "uploads_bucket" {
  description = "Private bucket used for user-provided source material."
  value       = module.application_data.uploads_bucket
}
