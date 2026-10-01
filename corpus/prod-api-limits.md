---
id: prod-api-limits
title: Relay API Limits
type: product
version: 1
effective_date: 2026-02-01
supersedes: null
status: current
roles_allowed: [employee, manager, hr_admin]
---

# Relay API Limits

## Rate limits

The Relay API v2 allows 600 requests per minute per account, with bursts of up to 100 requests per second. Requests over the limit get HTTP 429 with a Retry-After header.

## Webhooks

Failed webhook deliveries are retried 5 times over 24 hours.
