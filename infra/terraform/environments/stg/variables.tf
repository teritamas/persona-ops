variable "project_id" {
  description = "Google Cloud project ID that hosts PersonaOps."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by regional resources."
  type        = string
  default     = "asia-northeast1"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "stg"
}

variable "container_image" {
  description = "Application image URI. The public hello image is used until a Dockerfile is added."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello:latest"
}

variable "allow_unauthenticated" {
  description = "Whether the Cloud Run service is publicly invokable."
  type        = bool
  default     = false
}

variable "vertex_ai_model" {
  description = "Vertex AI Gemini model used by the application."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "max_instances" {
  description = "Maximum Cloud Run instance count used as a cost guardrail."
  type        = number
  default     = 3

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 10
    error_message = "max_instances must be between 1 and 10."
  }
}
