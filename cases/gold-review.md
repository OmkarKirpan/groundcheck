# Expected-answer review

Check every expected answer against its source before trusting any eval numbers (decision D20).
Tick the box when the expected answer is right. If one is wrong, fix `cases/cases.jsonl` and re-run.

## c001 · single-doc · employee

**Question:** For a SEV1 incident, how quickly must the on-call engineer page the incident commander?

**Expected answer:** Within 5 minutes of the first alert.

**`rb-incident-response`** (current, effective 2025-09-15)

> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.

> ## Communication
> 
> The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.


- [ ] Expected answer checked

## c002 · stale/conflict · employee

**Question:** How many days of paid annual leave does a full-time employee get?

**Expected answer:** 24 days per calendar year, under version 2 of the Leave Policy (effective 1 April 2026). Version 1's 20 days is superseded.

**`pol-leave-v2`** (current, effective 2026-04-01)

> # Leave Policy (version 2)
> 
> This policy replaces version 1 from 1 April 2026. It covers paid annual leave for all full-time Halvicor Systems employees.

> ## Annual leave
> 
> Full-time employees receive 24 days of paid annual leave per calendar year. Part-time employees receive leave in proportion to their contracted hours.


- [ ] Expected answer checked

## c003 · permission · employee

**Question:** What is the base salary range for an L3 engineer?

**Expected answer:** Refuse: salary bands are only in a document restricted to HR administrators.

**Restricted doc that holds the answer:** hr-comp-bands

**What a search as `employee` finds** (none of this should answer the question):

- `faq-benefits`: ## Pension Halvicor matches pension contributions up to 5 percent of base salary.
- `rb-oncall-v1`: ## Allowance Engineers receive an on-call allowance of EUR 150 per week.
- `rb-oncall-v2`: ## Allowance Engineers receive an on-call allowance of EUR 200 per week.

- [ ] Expected answer checked

## c004 · single-doc · employee

**Question:** How many days per week can I work remotely?

**Expected answer:** Up to 3 days per week.

**`pol-remote-work`** (current, effective 2025-06-01)

> # Remote Work Policy
> 
> ## Remote days
> 
> Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.

> ## Working from abroad
> 
> Working from another country is allowed for up to 20 working days per calendar year with approval from HR.


- [ ] Expected answer checked

## c005 · single-doc · employee

**Question:** How much is the home office stipend for new employees?

**Expected answer:** A one-time stipend of EUR 600 for a desk, chair or monitor.

**`pol-remote-work`** (current, effective 2025-06-01)

> # Remote Work Policy
> 
> ## Remote days
> 
> Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.

> ## Home office
> 
> New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor.


- [ ] Expected answer checked

## c006 · single-doc · manager

**Question:** When is the production deploy freeze?

**Expected answer:** From Friday 14:00 until Monday 09:00.

**`rb-deploy`** (current, effective 2025-10-01)

> # Deployment Runbook
> 
> ## Deploy windows
> 
> Production deploys run Monday to Friday between 09:00 and 16:00. There is a deploy freeze from Friday 14:00 until Monday 09:00.

> ## Approvals
> 
> Every production deploy needs approval from two engineers. Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander.


- [ ] Expected answer checked

## c007 · single-doc · employee

**Question:** How long does production access last before it expires?

**Expected answer:** 30 days; after that it has to be requested again.

**`rb-access-request`** (current, effective 2025-07-01)

> # Production Access Runbook
> 
> ## Requesting access
> 
> Request production access in the Access Portal. Your manager and the service owner must both approve it.

> ## Expiry
> 
> Production access expires after 30 days. Request it again if you still need it.


- [ ] Expected answer checked

## c008 · single-doc · employee

**Question:** What is the rate limit of the Relay API v2?

**Expected answer:** 600 requests per minute per account, with bursts of up to 100 requests per second.

**`prod-api-limits`** (current, effective 2026-02-01)

> # Relay API Limits
> 
> ## Rate limits
> 
> The Relay API v2 allows 600 requests per minute per account, with bursts of up to 100 requests per second. Requests over the limit get HTTP 429 with a Retry-After header.

> ## Webhooks
> 
> Failed webhook deliveries are retried 5 times over 24 hours.


- [ ] Expected answer checked

## c009 · single-doc · employee

**Question:** How often are company laptops replaced?

**Expected answer:** Every 3 years.

**`faq-it`** (current, effective 2025-09-01)

> # IT FAQ
> 
> ## When do I get a new laptop?
> 
> Laptops are replaced every 3 years. You can choose a MacBook or a ThinkPad.

> ## How do I connect to internal systems from home?
> 
> Use the Halvicor Connect VPN client. It is installed on every company laptop.


- [ ] Expected answer checked

## c010 · single-doc · manager

**Question:** How big is the yearly learning budget for each employee?

**Expected answer:** EUR 1,000 per calendar year; unused budget does not carry over.

**`pol-learning-budget`** (current, effective 2026-01-01)

> # Learning Budget
> 
> ## Amount
> 
> Every employee has a learning budget of EUR 1,000 per calendar year. Unused budget does not carry over to the next year.

> ## What it covers
> 
> The learning budget can be spent on courses, certifications, books and conference tickets. Travel to a conference is paid from the travel budget, not the learning budget.


- [ ] Expected answer checked

## c011 · single-doc · employee

**Question:** How many weeks of paid parental leave does the primary caregiver get?

**Expected answer:** 16 weeks at full pay.

**`pol-parental-leave`** (current, effective 2025-01-01)

> ## Paid leave
> 
> The primary caregiver receives 16 weeks of parental leave at full pay. The secondary caregiver receives 6 weeks of parental leave at full pay.

> ## Notice
> 
> Tell HR at least 8 weeks before the expected date of birth or adoption.


- [ ] Expected answer checked

## c012 · single-doc · hr_admin

**Question:** What is the cap on an annual salary adjustment when the employee does not change level?

**Expected answer:** 8 percent of base salary.

**`hr-comp-bands`** (current, effective 2026-01-01)

> ## Engineering bands
> 
> The L1 base salary range is EUR 48,000 to EUR 58,000. The L2 base salary range is EUR 58,000 to EUR 72,000. The L3 base salary range is EUR 72,000 to EUR 90,000. The L4 base salary range is EUR 90,000 to EUR 112,000. The L5 base salary range is EUR 112,000 to EUR 140,000.

> ## Adjustments
> 
> Annual salary adjustments are capped at 8 percent of base salary unless the employee changes level. Offers above the top of a band need approval from the Chief People Officer.


- [ ] Expected answer checked

## c013 · single-doc · manager

**Question:** By what date must performance ratings be final?

**Expected answer:** By 20 December.

**`mgr-performance-calibration`** (current, effective 2026-08-01)

> ## Calibration
> 
> Calibration meetings take place in the first two weeks of December. Performance ratings must be final by 20 December.

> ## Communication
> 
> Managers share final ratings with each employee in a one-to-one meeting in January.


- [ ] Expected answer checked

## c014 · single-doc · employee

**Question:** What is the minimum password length?

**Expected answer:** At least 14 characters.

**`pol-security`** (current, effective 2025-11-01)

> # Information Security Policy
> 
> ## Accounts
> 
> Multi-factor authentication is required on every company account. Passwords must be at least 14 characters long.


- [ ] Expected answer checked

## c015 · multi-doc · employee

**Question:** When I'm on call and get paged for a SEV1, how quickly must I acknowledge the page, and how quickly must the incident commander be paged?

**Expected answer:** Acknowledge the page within 15 minutes (On-call Runbook version 2), and page the incident commander within 5 minutes of the first alert (Incident Response Runbook).

**`rb-oncall-v2`** (current, effective 2026-05-01)

> # On-call Runbook (version 2)
> 
> This runbook replaces version 1 from 1 May 2026.

> ## Responding
> 
> Acknowledge a page within 15 minutes. If you cannot, the page escalates to the secondary on-call engineer.

**`rb-incident-response`** (current, effective 2025-09-15)

> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.

> ## Communication
> 
> The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.


- [ ] Expected answer checked

## c016 · multi-doc · employee

**Question:** A customer on the Business plan has 100 devices. What do they pay per month, and what monthly uptime does the SLA promise?

**Expected answer:** EUR 1,500 per month (100 devices at EUR 15 per device), and 99.9 percent uptime each month under SLA version 2.

**`prod-pricing`** (current, effective 2026-01-01)

> # Halvicor Relay Pricing
> 
> ## Plans
> 
> The Starter plan costs EUR 9 per device per month. The Business plan costs EUR 15 per device per month and needs at least 25 devices. Enterprise pricing is agreed per customer.

> ## Billing
> 
> Paying annually gives a 10 percent discount.

**`prod-relay-sla-v2`** (current, effective 2026-01-01)

> ## Uptime
> 
> Halvicor Relay is available 99.9 percent of the time each month.

> ## Service credits
> 
> If monthly uptime is below 99.9 percent, the customer receives a credit of 10 percent of the monthly fee. Below 99.0 percent, the credit is 25 percent.


- [ ] Expected answer checked

## c017 · multi-doc · employee

**Question:** I'm flying 8 hours to a conference. Can I fly business class, and can the conference ticket come out of my learning budget?

**Expected answer:** Business class is allowed for flights of 6 hours or longer with approval from a vice president. Yes, conference tickets can be paid from the learning budget, with your manager's approval before you book; the travel itself comes from the travel budget.

**`pol-travel`** (current, effective 2026-02-01)

> # Travel Policy
> 
> ## Flights
> 
> Book economy class for flights shorter than 6 hours. Business class is allowed for flights of 6 hours or longer with approval from a vice president.

> ## Trains
> 
> Take the train instead of flying when a direct train gets you there in under 4 hours.

**`pol-learning-budget`** (current, effective 2026-01-01)

> ## What it covers
> 
> The learning budget can be spent on courses, certifications, books and conference tickets. Travel to a conference is paid from the travel budget, not the learning budget.

> ## Approval
> 
> Spending from the learning budget needs approval from your manager before you book.


- [ ] Expected answer checked

## c018 · multi-doc · manager

**Question:** We just resolved a SEV1. When is the postmortem due, and can we deploy the fix on Friday afternoon?

**Expected answer:** The postmortem is due within 5 working days. Friday from 14:00 is in the deploy freeze, but an emergency fix for a SEV1 may be deployed during the freeze with approval from the incident commander.

**`rb-incident-response`** (current, effective 2025-09-15)

> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.

> ## After the incident
> 
> A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner.

**`rb-deploy`** (current, effective 2025-10-01)

> # Deployment Runbook
> 
> ## Deploy windows
> 
> Production deploys run Monday to Friday between 09:00 and 16:00. There is a deploy freeze from Friday 14:00 until Monday 09:00.

> ## Approvals
> 
> Every production deploy needs approval from two engineers. Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander.


- [ ] Expected answer checked

## c019 · multi-doc · employee

**Question:** I'm setting up to work from home. What home office stipend do I get, and which VPN client do I use?

**Expected answer:** A one-time home office stipend of EUR 600, and the Halvicor Connect VPN client.

**`pol-remote-work`** (current, effective 2025-06-01)

> # Remote Work Policy
> 
> ## Remote days
> 
> Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.

> ## Home office
> 
> New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor.

**`faq-it`** (current, effective 2025-09-01)

> # IT FAQ
> 
> ## When do I get a new laptop?
> 
> Laptops are replaced every 3 years. You can choose a MacBook or a ThinkPad.

> ## How do I connect to internal systems from home?
> 
> Use the Halvicor Connect VPN client. It is installed on every company laptop.


- [ ] Expected answer checked

## c020 · multi-doc · hr_admin

**Question:** What is the L2 base salary range, and how many people on a team can get the top performance rating?

**Expected answer:** EUR 58,000 to EUR 72,000, and no more than 15 percent of a team may be rated 5.

**`hr-comp-bands`** (current, effective 2026-01-01)

> ## Engineering bands
> 
> The L1 base salary range is EUR 48,000 to EUR 58,000. The L2 base salary range is EUR 58,000 to EUR 72,000. The L3 base salary range is EUR 72,000 to EUR 90,000. The L4 base salary range is EUR 90,000 to EUR 112,000. The L5 base salary range is EUR 112,000 to EUR 140,000.

> ## Adjustments
> 
> Annual salary adjustments are capped at 8 percent of base salary unless the employee changes level. Offers above the top of a band need approval from the Chief People Officer.

**`mgr-performance-calibration`** (current, effective 2026-08-01)

> # Performance Calibration Guide 2026
> 
> For people managers and HR only.

> ## Rating scale
> 
> Ratings use a scale from 1 to 5, where 5 is the highest. No more than 15 percent of a team may be rated 5.


- [ ] Expected answer checked

## c021 · stale/conflict · employee

**Question:** What is the daily meal allowance when travelling for work?

**Expected answer:** Up to EUR 55 per day, under version 2 of the Expense Policy (version 1's EUR 40 is superseded).

**`pol-expenses-v2`** (current, effective 2026-03-01)

> # Expense Policy (version 2)
> 
> This policy replaces version 1 from 1 March 2026.

> ## Meals
> 
> When travelling for work, meals are reimbursed up to EUR 55 per day. Alcohol is not reimbursed.


- [ ] Expected answer checked

## c022 · stale/conflict · manager

**Question:** What is the weekly on-call allowance?

**Expected answer:** EUR 200 per week, under version 2 of the On-call Runbook (version 1's EUR 150 is superseded).

**`rb-oncall-v2`** (current, effective 2026-05-01)

> # On-call Runbook (version 2)
> 
> This runbook replaces version 1 from 1 May 2026.

> ## Allowance
> 
> Engineers receive an on-call allowance of EUR 200 per week.


- [ ] Expected answer checked

## c023 · stale/conflict · employee

**Question:** What is the hotel limit per night on business trips?

**Expected answer:** EUR 220 per night. The Travel FAQ says EUR 180, but when a policy and an FAQ disagree the policy wins, so the Travel Policy's EUR 220 applies.

**`pol-travel`** (current, effective 2026-02-01)

> # Travel Policy
> 
> ## Flights
> 
> Book economy class for flights shorter than 6 hours. Business class is allowed for flights of 6 hours or longer with approval from a vice president.

> ## Hotels
> 
> The hotel limit is EUR 220 per night in every city. Book hotels through the Halvicor travel portal so the booking appears in your expense report.

**`pol-document-precedence`** (current, effective 2025-01-01)

> # Document Precedence
> 
> Halvicor Systems documents sometimes disagree. This page sets out which one applies.

> ## Rules
> 
> If a policy and an FAQ disagree, the policy wins. If two policies disagree, the one with the later effective date wins. A superseded document never applies when its current version exists.


- [ ] Expected answer checked

## c024 · permission · employee

**Question:** When will the Pune support team reorganisation be announced?

**Expected answer:** Refuse: the reorganisation plan is restricted to HR administrators.

**Restricted doc that holds the answer:** hr-reorg-2026

**What a search as `employee` finds** (none of this should answer the question):

- `prod-relay-overview`: ## Limits One Relay account supports up to 50,000 devices.
- `faq-offices`: # Offices FAQ ## Where are the offices? Halvicor Systems has offices in Lisbon and Pune. The head office is in Lisbon.
- `prod-relay-sla-v2`: ## Exclusions Scheduled maintenance announced at least 72 hours in advance does not count as downtime.

- [ ] Expected answer checked

## c025 · permission · employee

**Question:** When will API v1 be deprecated?

**Expected answer:** Refuse: the deprecation date is only in the 2027 roadmap, which is restricted to managers and HR administrators.

**Restricted doc that holds the answer:** prod-roadmap-2027

**What a search as `employee` finds** (none of this should answer the question):

- `prod-api-limits`: # Relay API Limits ## Rate limits The Relay API v2 allows 600 requests per minute per account, with bursts of up to 100 requests per second. Requests over the limit get HTTP 429 with a Retry-After header.
- `prod-api-limits`: ## Webhooks Failed webhook deliveries are retried 5 times over 24 hours.

- [ ] Expected answer checked

## c026 · permission · manager

**Question:** How many Support roles are affected by the 2026 reorganisation?

**Expected answer:** Refuse: the reorganisation plan is restricted to HR administrators, not managers.

**Restricted doc that holds the answer:** hr-reorg-2026

**What a search as `manager` finds** (none of this should answer the question):

- `prod-relay-overview`: ## Limits One Relay account supports up to 50,000 devices.
- `mgr-performance-calibration`: # Performance Calibration Guide 2026 For people managers and HR only.
- `rb-incident-response`: # Incident Response Runbook ## Severity levels SEV1 means Halvicor Relay is down or losing customer data for more than one customer. SEV2 means a major feature is degraded for many customers. SEV3 means a minor issue that has a workaround.

- [ ] Expected answer checked

## c027 · unanswerable · employee

**Question:** What is the yearly limit for dental coverage?

**Expected answer:** Refuse: the documents do not mention dental coverage.

**What a search as `employee` finds** (none of this should answer the question):

- `prod-api-limits`: # Relay API Limits ## Rate limits The Relay API v2 allows 600 requests per minute per account, with bursts of up to 100 requests per second. Requests over the limit get HTTP 429 with a Retry-After header.
- `prod-relay-overview`: ## Limits One Relay account supports up to 50,000 devices.
- `prod-api-limits`: ## Webhooks Failed webhook deliveries are retried 5 times over 24 hours.

- [ ] Expected answer checked

## c028 · unanswerable · employee

**Question:** Who is the CEO of Halvicor Systems?

**Expected answer:** Refuse: no document names the CEO.

**What a search as `employee` finds** (none of this should answer the question):

- `faq-offices`: # Offices FAQ ## Where are the offices? Halvicor Systems has offices in Lisbon and Pune. The head office is in Lisbon.
- `faq-it`: ## How do I connect to internal systems from home? Use the Halvicor Connect VPN client. It is installed on every company laptop.
- `pol-document-precedence`: # Document Precedence Halvicor Systems documents sometimes disagree. This page sets out which one applies.

- [ ] Expected answer checked

## c029 · unanswerable · hr_admin

**Question:** What is the annual bonus target for L4 engineers?

**Expected answer:** Refuse: the compensation bands cover base salary only and say nothing about bonuses.

**What a search as `hr_admin` finds** (none of this should answer the question):

- `rb-db-failover`: ## Targets The recovery point objective is 5 minutes of data. The recovery time objective is 30 minutes.
- `rb-oncall-v1`: ## Allowance Engineers receive an on-call allowance of EUR 150 per week.
- `rb-oncall-v2`: ## Allowance Engineers receive an on-call allowance of EUR 200 per week.

- [ ] Expected answer checked

## c030 · unanswerable · employee

**Question:** How many days of paid sick leave do employees get?

**Expected answer:** Refuse: the leave documents cover annual leave, public holidays and parental leave, but not sick leave.

**What a search as `employee` finds** (none of this should answer the question):

- `pol-leave-v1`: ## Annual leave Full-time employees receive 20 days of paid annual leave per calendar year. Part-time employees receive leave in proportion to their contracted hours.
- `pol-leave-v2`: ## Annual leave Full-time employees receive 24 days of paid annual leave per calendar year. Part-time employees receive leave in proportion to their contracted hours.
- `pol-leave-v1`: # Leave Policy (version 1) This policy covers paid annual leave for all full-time Halvicor Systems employees.

- [ ] Expected answer checked
