output "bucket_name" {
  description = "GCS bucket that stores Terraform state."
  value       = google_storage_bucket.state.name
}

