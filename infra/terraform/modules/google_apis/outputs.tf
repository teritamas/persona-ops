output "enabled_services" {
  description = "Google Cloud service API names managed by this module."
  value       = keys(google_project_service.enabled)
}

