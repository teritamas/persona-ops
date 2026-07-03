output "artifact_repository" {
  description = "Docker repository used by the application pipeline."
  value       = google_artifact_registry_repository.application.name
}

output "deployer_service_account" {
  description = "Service account used by the main branch deployment trigger."
  value       = google_service_account.deployer.email
}

output "trigger_id" {
  description = "Cloud Build trigger ID."
  value       = google_cloudbuild_trigger.main.trigger_id
}

