---
id: rb-incident-response
title: Incident Response Runbook
type: runbook
version: 1
effective_date: 2025-09-15
supersedes: null
status: current
roles_allowed: [employee, manager, hr_admin]
---

# Incident Response Runbook

## Severity levels

SEV1 means Halvicor Relay is down or losing customer data for more than one customer. SEV2 means a major feature is degraded for many customers. SEV3 means a minor issue that has a workaround.

## Paging

For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.

## Communication

The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.

## After the incident

A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner.
