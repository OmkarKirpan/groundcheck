---
id: rb-deploy
title: Deployment Runbook
type: runbook
version: 1
effective_date: 2025-10-01
supersedes: null
status: current
roles_allowed: [employee, manager, hr_admin]
---

# Deployment Runbook

## Deploy windows

Production deploys run Monday to Friday between 09:00 and 16:00. There is a deploy freeze from Friday 14:00 until Monday 09:00.

## Approvals

Every production deploy needs approval from two engineers. Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander.

## Rollback

To roll back, run `relayctl rollback --to previous` and post in the #deploys channel.
