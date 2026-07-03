variable "project_id" {
  description = "Google Cloud project ID where APIs are enabled."
  type        = string
}

variable "services" {
  description = "Google Cloud service API names to enable."
  type        = set(string)

  validation {
    condition     = length(var.services) > 0
    error_message = "At least one Google Cloud service API must be provided."
  }
}

