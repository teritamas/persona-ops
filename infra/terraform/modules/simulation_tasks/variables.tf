variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Region for the Cloud Tasks queue and Cloud Run service."
  type        = string
}

variable "queue_name" {
  description = "Cloud Tasks queue name used for persona simulations."
  type        = string
}

variable "target_service_name" {
  description = "Private API Cloud Run service name."
  type        = string
}

variable "target_service_url" {
  description = "Private API Cloud Run service URL."
  type        = string
}

variable "enqueuer_service_account" {
  description = "Private API service account email that creates tasks."
  type        = string
}
