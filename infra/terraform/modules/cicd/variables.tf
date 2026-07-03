variable "project_id" {
  description = "Google Cloud project ID that hosts the delivery pipeline."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by regional delivery resources."
  type        = string
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository connected through the Cloud Build GitHub App."
  type        = string
}

variable "state_bucket" {
  description = "GCS bucket used by the application environment Terraform backend."
  type        = string
}

variable "deployer_roles" {
  description = "Project IAM roles granted to the Cloud Build deployer."
  type        = set(string)
}
