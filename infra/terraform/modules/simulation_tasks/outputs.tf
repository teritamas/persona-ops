output "queue_name" {
  description = "Persona simulation queue name."
  value       = google_cloud_tasks_queue.simulation.name
}

output "dispatcher_service_account" {
  description = "Identity used by Cloud Tasks to invoke the private API."
  value       = google_service_account.dispatcher.email
}
