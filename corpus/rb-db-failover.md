---
id: rb-db-failover
title: Database Failover Runbook
type: runbook
version: 1
effective_date: 2025-08-01
supersedes: null
status: current
roles_allowed: [employee, manager, hr_admin]
---

# Database Failover Runbook

## When to fail over

Fail over when the primary Relay database has been unreachable for more than 2 minutes.

## Steps

Promote the replica with `relayctl db promote --replica eu-west-2b`, then point the application at it with `relayctl db switch`. Tell the incident commander when the switch is complete.

## Targets

The recovery point objective is 5 minutes of data. The recovery time objective is 30 minutes.
