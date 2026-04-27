# Claude Code Brief — AWS Cost Instrumentation Sweep

**For:** Claude Code (Verifier role)
**From:** Claude.ai (Operator)
**Authority:** John Coates (Final)
**Date:** 2026-04-26
**Scope:** Read-only diagnostic sweep + analysis. Propose changes. Do NOT execute changes until John signs off.

---

## 0. Why this exists

AWS Free Tier KMS alert fired today (~17,000 of 20,000 monthly Decrypt requests by 25 April). Steady-state polling pattern, not a spike. The deeper problem: AWS infrastructure is the third PULSUS ledger that doesn't exist yet. Stack is flying blind on infra cost. Credits hide the bill but don't hide the consumption shape that becomes the bill at scale.

This brief is the diagnostic pass. Output feeds: (a) immediate fixes for waste, (b) PULSUS Ledger 3 spec for AWS infra, (c) tagging discipline across the 360 stack.

---

## 1. Hard rules

1. **Read-only.** No SSM writes. No resource changes. No deletions. No tag changes. Report findings, propose changes, wait for sign-off.
2. **All four AWS accounts in scope** if multiple exist (905418067035 confirmed; check for others).
3. **Use AWS CLI configured in the EC2 environment or local profile.** Don't create new IAM credentials.
4. **Cite every finding with the exact CLI command + output snippet.** This is verifier work, not narrative.
5. **No agent validates own work.** Output goes to John for review.

---

## 2. Diagnostic sequence

### Phase A — KMS alert root cause (priority 1)

Find what's burning KMS Decrypt requests at ~28/hour steady state.

```bash
# Query CloudTrail for KMS Decrypt events over the last 7 days
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=kms.amazonaws.com \
  --start-time "$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)" \
  --max-results 100 \
  --region ap-southeast-2

# If CloudTrail Lake is enabled, run aggregation directly:
aws cloudtrail-data start-query \
  --query-statement "SELECT userIdentity.principalId, eventName, COUNT(*) as n FROM <event-data-store-id> WHERE eventSource = 'kms.amazonaws.com' AND eventTime > timestamp '2026-04-01' GROUP BY userIdentity.principalId, eventName ORDER BY n DESC"
```

**Report:** top 10 callers of KMS by principal + event name + frequency. Identify whether the burn is SSM SecureString reads, EBS encryption, S3 SSE-KMS, Secrets Manager, or CloudWatch Logs encryption.

**Likely culprits in priority order:**
1. SSM SecureString reads on every API request (instead of cached at startup)
2. PM2 crash loops re-reading SSM on each restart
3. ARGUS health-check cycles touching encrypted parameters
4. Secrets Manager rotation hooks

### Phase B — Service inventory and waste sweep

For the 16 services on the bill, identify what's running, what's actually used, what's waste.

```bash
# EC2 — list all instances, state, tags
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,State.Name,InstanceType,Tags]' \
  --region ap-southeast-2

# Lightsail — confirm what's there (suspicious if EC2 also running)
aws lightsail get-instances --region ap-southeast-2

# Glue — investigate why this is active
aws glue get-jobs --region ap-southeast-2
aws glue get-crawlers --region ap-southeast-2
aws glue get-databases --region ap-southeast-2

# RDS
aws rds describe-db-instances --region ap-southeast-2

# SQS — what queues exist, are they consumed
aws sqs list-queues --region ap-southeast-2
# For each queue, check ApproximateNumberOfMessages

# S3 — bucket inventory + size
aws s3 ls
# For each: aws s3api list-objects-v2 --bucket <name> --query 'sum(Contents[].Size)'

# CloudWatch Logs — log groups + retention + size
aws logs describe-log-groups --region ap-southeast-2 \
  --query 'logGroups[].[logGroupName,retentionInDays,storedBytes]'

# CloudFront distributions
aws cloudfront list-distributions

# Route 53 hosted zones
aws route53 list-hosted-zones

# Amazon Q usage — confirm if actively used
aws q get-* (check service availability)

# Security Hub + GuardDuty + CloudTrail
aws securityhub describe-hub --region ap-southeast-2
aws guardduty list-detectors --region ap-southeast-2
aws cloudtrail describe-trails --region ap-southeast-2
```

**Report per service:**
- Resource inventory
- Tags (Project / Component / Environment if present, missing if not)
- Estimated monthly cost without credits (use Cost Explorer API)
- Waste flag: orphaned, duplicated, untagged, suspicious

**Three flags from the bill that need explicit answers:**
1. **Glue** — why is it active? Was it spun up for an experiment? Can it be paused?
2. **Lightsail vs EC2** — both running. Which is legacy, which is current? Consolidate?
3. **Amazon Q** — actively used or just enabled?

### Phase C — Tagging coverage audit

For every resource found in Phase B, check tag presence:

```bash
# Resource Groups Tagging API — comprehensive view
aws resourcegroupstaggingapi get-resources \
  --region ap-southeast-2 \
  --query 'ResourceTagMappingList[].[ResourceARN,Tags]'
```

**Report:**
- Resources WITH tags (`Project`, `Component`, `Environment`)
- Resources WITHOUT any of the three required tags
- Tag value inconsistencies (e.g. "proof360" vs "Proof360" vs "proof_360")

**Required tag schema (proposed, awaiting John sign-off):**

| Tag | Values | Required |
|---|---|---|
| Project | proof360 \| veritas \| imperium \| argus \| vector \| pulsus \| signum \| platform | yes |
| Component | api \| db \| static \| cache \| queue \| monitoring \| dns \| storage | yes |
| Environment | prod \| staging \| dev | yes |
| Owner | john-coates | yes |
| CostCenter | ethiks360 \| ethikslabs | yes |

### Phase D — Cost Explorer baseline

Pull current and projected costs by service and (where tagged) by Project.

```bash
# Last 30 days by service, no credits
aws ce get-cost-and-usage \
  --time-period Start=2026-03-27,End=2026-04-26 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-1

# Same window grouped by Project tag (will only return tagged resources)
aws ce get-cost-and-usage \
  --time-period Start=2026-03-27,End=2026-04-26 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Project \
  --region us-east-1

# Forecast next 30 days
aws ce get-cost-forecast \
  --time-period Start=2026-04-27,End=2026-05-27 \
  --metric UNBLENDED_COST \
  --granularity MONTHLY \
  --region us-east-1
```

**Report:**
- Top 5 cost lines by service (without credits)
- Per-Project cost breakdown (where tagged)
- Untagged spend (the gap that the tagging sweep would close)
- 30-day forward projection

### Phase E — SSM SecureString reading patterns (the KMS root cause hypothesis)

Grep the codebase for SSM read patterns:

```bash
# In Projects/ directory
grep -rn "getParameter\|get_parameter\|SSM.*decrypt\|--with-decryption" \
  --include="*.js" --include="*.ts" --include="*.sh" --include="*.cjs" \
  /Users/johncoates/Library/CloudStorage/Dropbox/Projects/

# Check if SSM reads happen in hot paths (handlers vs startup)
# A read inside an HTTP handler = high KMS burn
# A read at app boot = single KMS hit per restart
```

**Report:**
- Files reading SSM SecureString
- Whether read is at startup (good) or per-request (bad)
- Recommended fix: cache at startup, refresh on TTL or signal

---

## 3. Output format

Single markdown report at:
`Projects/proof360/docs/aws-cost-diagnostic-2026-04-26.md`

Structure:

```
1. Executive Summary (≤300 words: KMS root cause, top 3 waste items, top 3 unmonitored cost vectors)
2. KMS Burn Root Cause (Phase A findings + recommendation)
3. Service Inventory + Waste Sweep (Phase B per-service)
4. Tagging Coverage (Phase C, gap list)
5. Cost Baseline (Phase D, current + projected)
6. SSM Read Pattern Audit (Phase E)
7. Proposed Fixes (ranked by impact, each with: action, command, risk, time)
8. PULSUS Ledger 3 Input (what shape the AWS cost data should take in NDJSON)
9. Tagging Migration Plan (per-resource action list)
10. Open Questions for John
```

---

## 4. PULSUS Ledger 3 — input for the spec John will write

After the diagnostic, propose the NDJSON shape for daily AWS cost ingestion into PULSUS:

```json
{
  "date": "2026-04-26",
  "project": "proof360",
  "component": "api",
  "environment": "prod",
  "service": "ec2",
  "resource_id": "i-010dc648d4676168e",
  "cost_usd": 0.42,
  "credits_applied": 0.42,
  "net_cost_usd": 0.00,
  "usage_quantity": 24,
  "usage_unit": "hours",
  "region": "ap-southeast-2"
}
```

PULSUS reads daily Cost and Usage Report (CUR) export from S3, transforms to this shape, appends to `data/aws-cost.ndjson`. Cross-references with `metering.ndjson` (LLM tokens) and `consumption.ndjson` (external API) by `project` + `date`.

**Recommend:** enable Cost and Usage Reports (CUR) to S3 in `ap-southeast-2`. Format: Parquet. Daily delivery. Then PULSUS reads via Athena or direct Parquet. Report whether CUR is already enabled. If not, propose the enablement (do not execute without John sign-off).

---

## 5. Boundaries

- Don't touch IAM policies
- Don't change instance states
- Don't delete log groups or buckets
- Don't modify SSM parameters
- Don't enable CUR or any new service without sign-off
- Don't write to `proof360/api/*` or any application code

This is verifier scope. Diagnostic + report only.

---

## 6. Reporting

Single report file. Apple Notes session note via standard convention:

`HANDOFF — [DD Mon YYYY] (HH:MM) AWS cost diagnostic complete - <findings summary>`

Authority: john-coates
