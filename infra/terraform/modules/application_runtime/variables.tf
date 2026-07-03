variable "project_id" {
  description = "Google Cloud project ID that runs the application."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by Cloud Run."
  type        = string
}

variable "application_name" {
  description = "Application and Cloud Run service name."
  type        = string
}

variable "container_image" {
  description = "Container image URI deployed to Cloud Run."
  type        = string
}

variable "uploads_bucket" {
  description = "Private bucket used for user-provided source material."
  type        = string
}

variable "vertex_ai_model" {
  description = "Vertex AI Gemini model used by the application."
  type        = string
}

variable "allow_unauthenticated" {
  description = "Whether the Cloud Run service is publicly invokable."
  type        = bool
}

variable "max_instances" {
  description = "Maximum Cloud Run instance count used as a cost guardrail."
  type        = number

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 10
    error_message = "max_instances must be between 1 and 10."
  }
}
