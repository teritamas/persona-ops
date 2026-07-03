variable "project_id" {
  description = "Google Cloud project ID that hosts PersonaOps."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by regional resources."
  type        = string
  default     = "asia-northeast1"
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository connected through the Cloud Build GitHub App."
  type        = string
  default     = "persona-ops"
}

