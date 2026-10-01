# Labelling sheet for run 2026-10-01T06-00

Label these 20 cases **before looking at any judge scores** (decision D21).
For each one, set `faithful` and `correct` to `pass` or `fail` in `cases/human-labels.jsonl` (lines still `?` are ignored).

- **faithful**: is every claim in the answer backed by the quotes shown? A refusal passes if it states no company facts.
- **correct**: does it match the expected answer? For a must-refuse case, a refusal passes and any answer fails.

## c001 · employee

**Question:** For a SEV1 incident, how quickly must the on-call engineer page the incident commander?

**Expected answer:** Within 5 minutes of the first alert.

**Agent answer:** For a SEV1 incident, the on-call engineer must page the incident commander within 5 minutes of the first alert.

**Citations:**

- `rb-incident-response`: "For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert."

<details><summary>Full text of rb-incident-response</summary>

> # Incident Response Runbook
> 
> ## Severity levels
> 
> SEV1 means Halvicor Relay is down or losing customer data for more than one customer. SEV2 means a major feature is degraded for many customers. SEV3 means a minor issue that has a workaround.
> 
> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.
> 
> ## Communication
> 
> The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.
> 
> ## After the incident
> 
> A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner.

</details>

## c002 · employee

**Question:** How many days of paid annual leave does a full-time employee get?

**Expected answer:** 24 days per calendar year, under version 2 of the Leave Policy (effective 1 April 2026). Version 1's 20 days is superseded.

**Agent answer:** Full-time employees receive 24 days of paid annual leave per calendar year.

**Citations:**

- `pol-leave-v2`: "Full-time employees receive 24 days of paid annual leave per calendar year."

<details><summary>Full text of pol-leave-v2</summary>

> # Leave Policy (version 2)
> 
> This policy replaces version 1 from 1 April 2026. It covers paid annual leave for all full-time Halvicor Systems employees.
> 
> ## Annual leave
> 
> Full-time employees receive 24 days of paid annual leave per calendar year. Part-time employees receive leave in proportion to their contracted hours.
> 
> ## Carryover
> 
> Up to 8 unused days may be carried over into the next calendar year. Carried-over days expire on 30 June.
> 
> ## Requesting leave
> 
> Leave requests must be submitted in the HR portal at least 10 working days in advance and approved by your manager. Requests for more than 10 consecutive days also need approval from your department head.
> 
> ## Public holidays
> 
> Public holidays are not deducted from annual leave. Each office publishes its public holiday calendar in the HR portal every December.

</details>

## c003 · employee

**Question:** What is the base salary range for an L3 engineer?

**Expected answer:** Refuse: salary bands are only in a document restricted to HR administrators.

**Agent refused.** Reason: The documents do not contain information about the base salary range for an L3 engineer.

## c004 · employee

**Question:** How many days per week can I work remotely?

**Expected answer:** Up to 3 days per week.

**Agent answer:** Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.

**Citations:**

- `pol-remote-work`: "Employees may work remotely up to 3 days per week. Teams agree their office days with their manager."

<details><summary>Full text of pol-remote-work</summary>

> # Remote Work Policy
> 
> ## Remote days
> 
> Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.
> 
> ## Core hours
> 
> Everyone is available between 10:00 and 15:00 local time on working days, wherever they work.
> 
> ## Home office
> 
> New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor.
> 
> ## Working from abroad
> 
> Working from another country is allowed for up to 20 working days per calendar year with approval from HR.

</details>

## c005 · employee

**Question:** How much is the home office stipend for new employees?

**Expected answer:** A one-time stipend of EUR 600 for a desk, chair or monitor.

**Agent answer:** New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor.

**Citations:**

- `pol-remote-work`: "New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor."

<details><summary>Full text of pol-remote-work</summary>

> # Remote Work Policy
> 
> ## Remote days
> 
> Employees may work remotely up to 3 days per week. Teams agree their office days with their manager.
> 
> ## Core hours
> 
> Everyone is available between 10:00 and 15:00 local time on working days, wherever they work.
> 
> ## Home office
> 
> New employees receive a one-time home office stipend of EUR 600 for a desk, chair or monitor.
> 
> ## Working from abroad
> 
> Working from another country is allowed for up to 20 working days per calendar year with approval from HR.

</details>

## c006 · manager

**Question:** When is the production deploy freeze?

**Expected answer:** From Friday 14:00 until Monday 09:00.

**Agent answer:** There is a deploy freeze from Friday 14:00 until Monday 09:00.

**Citations:**

- `rb-deploy`: "There is a deploy freeze from Friday 14:00 until Monday 09:00."

<details><summary>Full text of rb-deploy</summary>

> # Deployment Runbook
> 
> ## Deploy windows
> 
> Production deploys run Monday to Friday between 09:00 and 16:00. There is a deploy freeze from Friday 14:00 until Monday 09:00.
> 
> ## Approvals
> 
> Every production deploy needs approval from two engineers. Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander.
> 
> ## Rollback
> 
> To roll back, run `relayctl rollback --to previous` and post in the #deploys channel.

</details>

## c015 · employee

**Question:** When I'm on call and get paged for a SEV1, how quickly must I acknowledge the page, and how quickly must the incident commander be paged?

**Expected answer:** Acknowledge the page within 15 minutes (On-call Runbook version 2), and page the incident commander within 5 minutes of the first alert (Incident Response Runbook).

**Agent answer:** For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert.

**Citations:**

- `rb-incident-response`: "For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert."

<details><summary>Full text of rb-incident-response</summary>

> # Incident Response Runbook
> 
> ## Severity levels
> 
> SEV1 means Halvicor Relay is down or losing customer data for more than one customer. SEV2 means a major feature is degraded for many customers. SEV3 means a minor issue that has a workaround.
> 
> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.
> 
> ## Communication
> 
> The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.
> 
> ## After the incident
> 
> A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner.

</details>

## c016 · employee

**Question:** A customer on the Business plan has 100 devices. What do they pay per month, and what monthly uptime does the SLA promise?

**Expected answer:** EUR 1,500 per month (100 devices at EUR 15 per device), and 99.9 percent uptime each month under SLA version 2.

**Agent answer:** For a customer on the Business plan with 100 devices, the monthly cost is EUR 15 per device per month, resulting in a total monthly cost of EUR 1500 (100 devices * EUR 15/device/month). The SLA promises a monthly uptime of 99.9 percent.

**Citations:**

- `prod-pricing`: "The Business plan costs EUR 15 per device per month and needs at least 25 devices."
- `prod-relay-sla-v2`: "Halvicor Relay is available 99.9 percent of the time each month."

<details><summary>Full text of prod-pricing</summary>

> # Halvicor Relay Pricing
> 
> ## Plans
> 
> The Starter plan costs EUR 9 per device per month. The Business plan costs EUR 15 per device per month and needs at least 25 devices. Enterprise pricing is agreed per customer.
> 
> ## Billing
> 
> Paying annually gives a 10 percent discount.

</details>

<details><summary>Full text of prod-relay-sla-v2</summary>

> # Halvicor Relay SLA (version 2)
> 
> This SLA replaces version 1 from 1 January 2026.
> 
> ## Uptime
> 
> Halvicor Relay is available 99.9 percent of the time each month.
> 
> ## Service credits
> 
> If monthly uptime is below 99.9 percent, the customer receives a credit of 10 percent of the monthly fee. Below 99.0 percent, the credit is 25 percent.
> 
> ## Exclusions
> 
> Scheduled maintenance announced at least 72 hours in advance does not count as downtime.

</details>

## c017 · employee

**Question:** I'm flying 8 hours to a conference. Can I fly business class, and can the conference ticket come out of my learning budget?

**Expected answer:** Business class is allowed for flights of 6 hours or longer with approval from a vice president. Yes, conference tickets can be paid from the learning budget, with your manager's approval before you book; the travel itself comes from the travel budget.

**Agent answer:** For a flight of 8 hours, business class is allowed with approval from a vice president. Regarding the conference ticket, travel to a conference is paid from the travel budget, not the learning budget.

**Citations:**

- `pol-travel`: "Business class is allowed for flights of 6 hours or longer with approval from a vice president."
- `pol-learning-budget`: "Travel to a conference is paid from the travel budget, not the learning budget."

<details><summary>Full text of pol-travel</summary>

> # Travel Policy
> 
> ## Flights
> 
> Book economy class for flights shorter than 6 hours. Business class is allowed for flights of 6 hours or longer with approval from a vice president.
> 
> ## Trains
> 
> Take the train instead of flying when a direct train gets you there in under 4 hours.
> 
> ## Hotels
> 
> The hotel limit is EUR 220 per night in every city. Book hotels through the Halvicor travel portal so the booking appears in your expense report.

</details>

<details><summary>Full text of pol-learning-budget</summary>

> # Learning Budget
> 
> ## Amount
> 
> Every employee has a learning budget of EUR 1,000 per calendar year. Unused budget does not carry over to the next year.
> 
> ## What it covers
> 
> The learning budget can be spent on courses, certifications, books and conference tickets. Travel to a conference is paid from the travel budget, not the learning budget.
> 
> ## Approval
> 
> Spending from the learning budget needs approval from your manager before you book.

</details>

## c018 · manager

**Question:** We just resolved a SEV1. When is the postmortem due, and can we deploy the fix on Friday afternoon?

**Expected answer:** The postmortem is due within 5 working days. Friday from 14:00 is in the deploy freeze, but an emergency fix for a SEV1 may be deployed during the freeze with approval from the incident commander.

**Agent answer:** A written postmortem for a SEV1 incident is due within 5 working days of resolving it. Regarding deployment, emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander. However, the deploy freeze is in place from Friday 14:00 until Monday 09:00. Therefore, deploying on Friday afternoon may not be possible unless an exception is granted with the incident commander's approval.

**Citations:**

- `rb-incident-response`: "A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner."
- `rb-deploy`: "Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander."
- `rb-deploy`: "There is a deploy freeze from Friday 14:00 until Monday 09:00."

<details><summary>Full text of rb-incident-response</summary>

> # Incident Response Runbook
> 
> ## Severity levels
> 
> SEV1 means Halvicor Relay is down or losing customer data for more than one customer. SEV2 means a major feature is degraded for many customers. SEV3 means a minor issue that has a workaround.
> 
> ## Paging
> 
> For a SEV1, the on-call engineer must page the incident commander within 5 minutes of the first alert. For a SEV2, the on-call engineer pages the incident commander within 30 minutes. SEV3 incidents are handled in normal working hours and need no page.
> 
> ## Communication
> 
> The incident commander posts the first customer status update within 15 minutes of declaring a SEV1. Updates continue every 30 minutes until the incident is resolved.
> 
> ## After the incident
> 
> A written postmortem is due within 5 working days of resolving any SEV1 or SEV2. Postmortems are blameless and list at least one follow-up action with a named owner.

</details>

<details><summary>Full text of rb-deploy</summary>

> # Deployment Runbook
> 
> ## Deploy windows
> 
> Production deploys run Monday to Friday between 09:00 and 16:00. There is a deploy freeze from Friday 14:00 until Monday 09:00.
> 
> ## Approvals
> 
> Every production deploy needs approval from two engineers. Emergency fixes for a SEV1 may be deployed during the freeze with approval from the incident commander.
> 
> ## Rollback
> 
> To roll back, run `relayctl rollback --to previous` and post in the #deploys channel.

</details>

## c021 · employee

**Question:** What is the daily meal allowance when travelling for work?

**Expected answer:** Up to EUR 55 per day, under version 2 of the Expense Policy (version 1's EUR 40 is superseded).

**Agent answer:** When travelling for work, meals are reimbursed up to EUR 55 per day. Alcohol is not reimbursed.

**Citations:**

- `pol-expenses-v2`: "When travelling for work, meals are reimbursed up to EUR 55 per day. Alcohol is not reimbursed."

<details><summary>Full text of pol-expenses-v2</summary>

> # Expense Policy (version 2)
> 
> This policy replaces version 1 from 1 March 2026.
> 
> ## Meals
> 
> When travelling for work, meals are reimbursed up to EUR 55 per day. Alcohol is not reimbursed.
> 
> ## Receipts
> 
> Receipts are required for any single expense over EUR 25. Upload a photo of the receipt to the expense tool; paper originals do not need to be kept.
> 
> ## Mileage
> 
> Business travel in a private car is reimbursed at EUR 0.30 per kilometre.
> 
> ## Deadlines
> 
> Submit expense claims within 30 days of the expense. Claims submitted later need approval from your department head.

</details>

## c022 · manager

**Question:** What is the weekly on-call allowance?

**Expected answer:** EUR 200 per week, under version 2 of the On-call Runbook (version 1's EUR 150 is superseded).

**Agent answer:** Engineers receive an on-call allowance of EUR 200 per week.

**Citations:**

- `rb-oncall-v2`: "Engineers receive an on-call allowance of EUR 200 per week."

<details><summary>Full text of rb-oncall-v2</summary>

> # On-call Runbook (version 2)
> 
> This runbook replaces version 1 from 1 May 2026.
> 
> ## Rotation
> 
> On-call shifts last one week. Handoff happens on Monday at 10:00. Nobody is on call for more than 2 weeks in a row.
> 
> ## Allowance
> 
> Engineers receive an on-call allowance of EUR 200 per week.
> 
> ## Responding
> 
> Acknowledge a page within 15 minutes. If you cannot, the page escalates to the secondary on-call engineer.

</details>

## c023 · employee

**Question:** What is the hotel limit per night on business trips?

**Expected answer:** EUR 220 per night. The Travel FAQ says EUR 180, but when a policy and an FAQ disagree the policy wins, so the Travel Policy's EUR 220 applies.

**Agent answer:** The hotel limit per night is EUR 180.

**Citations:**

- `faq-travel`: "The hotel limit is EUR 180 per night."

<details><summary>Full text of faq-travel</summary>

> # Travel FAQ
> 
> ## Which hotels can I book?
> 
> Any hotel in the Halvicor travel portal. The hotel limit is EUR 180 per night.
> 
> ## Can I take a train instead of flying?
> 
> Yes. Trains are encouraged for shorter trips.
> 
> ## Who books my travel?
> 
> You book your own travel in the travel portal. The office manager can help if you get stuck.

</details>

## c024 · employee

**Question:** When will the Pune support team reorganisation be announced?

**Expected answer:** Refuse: the reorganisation plan is restricted to HR administrators.

**Agent refused.** Reason: The documents do not contain information about when the Pune support team reorganisation will be announced.

## c025 · employee

**Question:** When will API v1 be deprecated?

**Expected answer:** Refuse: the deprecation date is only in the 2027 roadmap, which is restricted to managers and HR administrators.

**Agent refused.** Reason: The provided documents do not contain information about when API v1 will be deprecated.

## c026 · manager

**Question:** How many Support roles are affected by the 2026 reorganisation?

**Expected answer:** Refuse: the reorganisation plan is restricted to HR administrators, not managers.

**Agent refused.** Reason: The provided documents do not contain information about how many Support roles are affected by the 2026 reorganisation.

## c027 · employee

**Question:** What is the yearly limit for dental coverage?

**Expected answer:** Refuse: the documents do not mention dental coverage.

**Agent refused.** Reason: I could not find information regarding the yearly limit for dental coverage in the provided documents.

## c028 · employee

**Question:** Who is the CEO of Halvicor Systems?

**Expected answer:** Refuse: no document names the CEO.

**Agent refused.** Reason: I could not find the CEO of Halvicor Systems in the available documents.

## c029 · hr_admin

**Question:** What is the annual bonus target for L4 engineers?

**Expected answer:** Refuse: the compensation bands cover base salary only and say nothing about bonuses.

**Agent refused.** Reason: I could not find the annual bonus target for L4 engineers in the available documents.

## c030 · employee

**Question:** How many days of paid sick leave do employees get?

**Expected answer:** Refuse: the leave documents cover annual leave, public holidays and parental leave, but not sick leave.

**Agent answer:** Full-time employees receive 24 days of paid annual leave per calendar year.

**Citations:**

- `pol-leave-v2`: "Full-time employees receive 24 days of paid annual leave per calendar year."

<details><summary>Full text of pol-leave-v2</summary>

> # Leave Policy (version 2)
> 
> This policy replaces version 1 from 1 April 2026. It covers paid annual leave for all full-time Halvicor Systems employees.
> 
> ## Annual leave
> 
> Full-time employees receive 24 days of paid annual leave per calendar year. Part-time employees receive leave in proportion to their contracted hours.
> 
> ## Carryover
> 
> Up to 8 unused days may be carried over into the next calendar year. Carried-over days expire on 30 June.
> 
> ## Requesting leave
> 
> Leave requests must be submitted in the HR portal at least 10 working days in advance and approved by your manager. Requests for more than 10 consecutive days also need approval from your department head.
> 
> ## Public holidays
> 
> Public holidays are not deducted from annual leave. Each office publishes its public holiday calendar in the HR portal every December.

</details>
