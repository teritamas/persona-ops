output "frontend_service_url" {
  description = "URL of the PersonaOps frontend Cloud Run service."
  value       = module.frontend_runtime.service_url
}

output "api_service_url" {
  description = "URL of the PersonaOps private API Cloud Run service."
  value       = module.private_api_runtime.service_url
}

output "frontend_runtime_service_account" {
  description = "Least-privilege identity used by the frontend."
  value       = module.frontend_runtime.runtime_service_account
}

output "api_runtime_service_account" {
  description = "Least-privilege identity used by the private API."
  value       = module.private_api_runtime.runtime_service_account
}

output "uploads_bucket" {
  description = "Private bucket used for user-provided source material."
  value       = module.application_data.uploads_bucket
}
