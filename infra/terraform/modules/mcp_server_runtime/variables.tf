variable "project_id" {
  description = "Google Cloud project ID that runs the frontend."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by Cloud Run."
  type        = string
}

variable "application_name" {
  description = "MCP Server Cloud Run service name."
  type        = string
}

variable "container_image" {
  description = "Container image URI deployed to the MCP server."
  type        = string
}

variable "private_api_url" {
  description = "Base URL of the private API service that the MCP server calls."
  type        = string
}

variable "max_instances" {
  description = "Maximum Cloud Run instance count used as a cost guardrail."
  type        = number

  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 10
    error_message = "max_instances must be between 1 and 10."
  }
}
