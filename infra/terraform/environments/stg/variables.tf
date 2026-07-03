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

variable "api_container_image" {
  description = "Private API image URI."
  type        = string
}

variable "frontend_container_image" {
  description = "Frontend image URI."
  type        = string
}

variable "vertex_ai_model" {
  description = "Vertex AI Gemini model used by the application."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "api_max_instances" {
  description = "Maximum private API Cloud Run instance count used as a cost guardrail."
  type        = number
  default     = 3

  validation {
    condition     = var.api_max_instances >= 1 && var.api_max_instances <= 10
    error_message = "api_max_instances must be between 1 and 10."
  }
}

variable "frontend_max_instances" {
  description = "Maximum frontend Cloud Run instance count used as a cost guardrail."
  type        = number
  default     = 2

  validation {
    condition     = var.frontend_max_instances >= 1 && var.frontend_max_instances <= 10
    error_message = "frontend_max_instances must be between 1 and 10."
  }
}
