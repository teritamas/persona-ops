output "runtime_service_account" {
  description = "Least-privilege identity used by the application."
  value       = google_service_account.application.email
}

output "service_url" {
  description = "URL of the PersonaOps Cloud Run service."
  value       = google_cloud_run_v2_service.application.uri
}
