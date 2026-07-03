output "firestore_database_name" {
  description = "Firestore database name used by the application."
  value       = google_firestore_database.application.name
}

output "uploads_bucket" {
  description = "Private bucket used for user-provided source material."
  value       = google_storage_bucket.uploads.name
}

