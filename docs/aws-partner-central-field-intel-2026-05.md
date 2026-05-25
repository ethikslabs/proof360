# AWS Partner Central Field Intel - May 2026

**Account:** Ethiks360 Pty Ltd  
**AWS login context:** `ethikslabs-admin`  
**AWS account ID:** `905418067035`  
**Captured:** May 2026  
**Sensitivity:** Confidential - authenticated AWS Partner Central and AWS Marketplace account view. Do not publish without review.

## Source Note

This is an operator field-intel document from an authenticated AWS Partner Central mapping session. It records what was visible in the account and what that implies for proof360, Ethiks360, and the reseller/channel flywheel.

This is not an AWS policy source of truth. If a program rule, deadline, funding amount, or eligibility requirement becomes decision-critical, verify it against current AWS Partner Central guidance or the relevant AWS Partner Development Manager. A Partner Development Manager (PDM) is the AWS-side relationship manager for partner strategy, co-sell, and program navigation.

Related proof360 docs:

- `proof360/docs/aws-funding-program-mapping.md`
- `proof360/docs/aws-motion-inventory.md`
- `proof360/docs/partner-register.md`

## Quick Glossary

| Term | Plain-English meaning |
|---|---|
| AWS Partner Central | AWS portal for partner account management, opportunities, funding, listings, and program applications. |
| Legacy Partner Central | Older Partner Central console still required for some AWS partner workflows during migration. |
| AWS Marketplace | AWS procurement marketplace where customers buy software, services, and private offers through AWS billing. |
| SSO | Single Sign-On: one login session used to access multiple systems. |
| PRM | Partner Revenue Measurement: AWS partner reporting requirements used to measure eligible partner revenue. |
| MDF | Marketing Development Funds: AWS marketing funding for eligible partners. |
| GTM | Go to Market: the commercial path for finding, selling to, and supporting customers. |
| ACE | APN Customer Engagements: AWS co-sell and lead/opportunity management workflow. |
| APN | AWS Partner Network: the umbrella partner program. |
| KYC | Know Your Customer: identity and compliance checks before AWS can pay or transact with a seller. |
| PMA | Program Management Account: account used as a billing and relationship hub for channel/resell motions. |
| ISV | Independent Software Vendor: a company selling software products. |
| FTR | Foundational Technical Review: AWS technical validation used to unlock co-sell and other benefits. |

## Critical Alerts

### Deadline: July 31, 2026

AWS has issued a mandatory compliance update. By **July 31, 2026**, partners must:

1. Review the 2026 Partner Funding Benefits Guide.
2. Comply with the new Funding Policy.
3. Complete Partner Revenue Measurement requirements.

Failure to complete these requirements risks loss of AWS funding eligibility.

### Platform in transition

AWS is migrating from Legacy Partner Central to the newer unified console. Some sections still require a separate SSO sign-in to Legacy Partner Central:

- Partner Scorecard
- Programs
- Business Plans
- Some support and application flows

This is a known friction point and should be raised with the AWS PDM when it blocks work.

## Account Snapshot

| Area | Status | Notes |
|---|---|---|
| Partner account | Active | Ethiks360 Pty Ltd partner account is live. |
| Marketplace account | Active | Marketplace seller account exists. |
| Partner profile | Published / public | Visible to other partners and AWS. |
| Alliance lead contact | Set | John Coates, Founder and CEO, `john@ethiks360.com`. |
| Solutions | 1 limited solution | `ethiks360 - MERN`; needs validation and likely repositioning. |
| Opportunities | 1 rejected opportunity | `O6657441`, Prospect stage, company `ethiks labs`. |
| Leads | 0 | ACE lead sharing is not flowing yet. |
| Fund requests | 0 | No AWS funding claimed yet. |
| Wallets | 0 | No AWS budget allocated yet. |
| Channel PMAs | 0 | Billing Transfer / resell pathway is not configured. |
| Co-sell checklist | 6 incomplete steps | Blocks full ACE lead flow. |
| Marketplace checklist | 5 incomplete steps | Blocks transact-ready status. |

## Navigation Map

### Top-level console

| Section | Subsections | Status |
|---|---|---|
| Dashboard | Account summary, co-sell checklist, Marketplace checklist, announcements | Accessible |
| Partner Scorecard | - | Requires Legacy Partner Central SSO |
| News and Events | - | Requires Legacy Partner Central SSO |
| Guides | - | Requires Legacy Partner Central SSO |

### Build

| Section | URL or route | Notes |
|---|---|---|
| Solutions | `/partnercentral/solutions` | 1 solution exists: `ethiks360 - MERN`, Limited status. |
| AI Agents and Tools | `marketplace/products/aiagents` | Marketplace product listing type. |
| SaaS Products | `marketplace/products/saas` | Marketplace product listing type. |
| Server Products | `marketplace/products/server` | Marketplace product listing type. |
| Machine-Learning Products | `marketplace/products/machinelearning` | Marketplace product listing type. |
| Data Products | `marketplace/products/data` | Marketplace product listing type. |
| Professional Services | `marketplace/products/professionalservices` | Marketplace product listing type. |
| Requests | `marketplace/management/requests` | Pending listing requests. |
| File Upload | `marketplace/product-load-v2/landing` | Bulk product upload. |
| Device Listings | Legacy Partner Central redirect | IoT/device listings. |

### Go to market

| Section | Route | Notes |
|---|---|---|
| Marketing Central | External redirect | MDF campaign management. |
| Case Studies | Legacy Partner Central redirect | Partner case study submissions. |
| Badge Manager | Legacy Partner Central redirect | AWS Partner badges and co-branding. |

### Sell

| Section | Route | Notes |
|---|---|---|
| Leads | `/partnercentral/leads` | 0 leads; ACE program. |
| Opportunities | `/partnercentral/opportunities` | 1 opportunity: `O6657441`; rejected, Prospect, `ethiks labs`. |
| Offers | `marketplace/management/offers` | Private offer management. |
| Free Trials | `marketplace/management/offers/publicFreeTrials` | Public free trial offers. |
| Agreements | `marketplace/management/agreements` | Contract management. |
| Partners (Channel) | `marketplace/management/partners` | Channel partner relationships. |

### Funding benefits

| Section | Route | Notes |
|---|---|---|
| Funding Dashboard | `/partnercentral/funding` | 0 fund requests. Account is active and ready to use. |
| My Wallet | `/partnercentral/funding/wallets` | 0 wallets. No budget allocated yet. |

### Channel management

| Section | Route | Notes |
|---|---|---|
| Channel Partner Management | `/partnercentral/channel` | 0 Program Management Accounts. New Billing Transfer system. |
| Channel Programs | Legacy Partner Central redirect | Program enrollment. |
| Distributor Applications | Legacy Partner Central redirect | Distributor applications, including Ingram pathway. |
| Deal Registration | Legacy Partner Central redirect | Deal registration portal. |

### Account connections

| Section | Route | Notes |
|---|---|---|
| Partner Discovery | `/partnercentral/discovery` | Searchable partner directory; 0 connections made. |
| Partner Connections | `/partnercentral/account-connections/partner-connections` | Partner-to-partner account links. |
| Subsidiary Connections | `/partnercentral/account-connections/subsidiary-connections` | Organization hierarchy. |

### Partner analytics

| Section | Meaning |
|---|---|
| At a Glance | Business performance overview. |
| Opportunity Pipeline Analysis | Sales pipeline. |
| Lead Pipeline Analysis | Lead funnel. |
| Funding and Investments | Funding utilization. |
| Resell Revenue and Discounts | Channel revenue tracking. |
| Marketing Campaign Analysis | MDF return on investment. |
| Training and Certifications | Staff credential tracking. |
| Attributed Revenue | Revenue AWS attributes to partner activity. |

### Marketplace insights

| Section |
|---|
| Agreements and Renewals |
| Usage |
| Billed Revenue |
| Collections and Disbursement |
| Tax |
| Understanding Buy with AWS |

### Partner admin

| Section | Route | Notes |
|---|---|---|
| Program Applications | Legacy Partner Central redirect | Apply for AWS Partner Network programs. |
| Business Plans | Legacy Partner Central redirect | Joint business plans with AWS. |
| Manage Profiles | `/partnercentral/manage-profiles` | Published and public. |
| IAM Users | `/iam/home#/users` | User management. |

### Settings

| Section | Notes |
|---|---|
| Partner Central Settings | Alliance lead is John Coates, Founder and CEO, `john@ethiks360.com`. |
| Marketplace Settings | Separate seller configuration. |
| Tax Details | Tax invoice management. |
| Partner Central Support | Legacy Partner Central redirect. |
| Marketplace Support | Direct marketplace support. |
| Marketplace Refund Support | Refund requests. |

## Funding Programs

### Build: Innovation Sandbox Credits

| Field | Detail |
|---|---|
| What it is | AWS Promotional Credits to offset AWS usage during development. |
| Who it is for | Partners building or offering services or solutions on AWS. |
| How to access | Submit AWS monthly calculator and development plan. |
| Current account status | Not claimed. |
| proof360 relevance | High. This maps to a "get your development environment funded" card for startups building products on AWS. |

### Market: Marketing Development Funds

| Field | Detail |
|---|---|
| What it is | Cash funding for demand generation: events, campaigns, content, advertising, and similar GTM work. |
| Eligibility trigger | One qualifying AWS designation or program, such as Competency, Well-Architected Partner, MSP, Service Ready, Service Delivery, or Device Qualification. |
| Current account status | Not eligible yet. No qualifying designation is visible. |
| Key unlock | Achieve a designation. Service Ready or Well-Architected Partner appears to be the most accessible first path. |
| proof360 relevance | Medium now, high after designation. MDF becomes a benefit to surface once designation is achieved. |

### Sell: Migration Acceleration Program

| Field | Detail |
|---|---|
| What it is | AWS-funded migration program covering Assess, Mobilize, Migrate, and Modernize phases. |
| Eligibility | Eligible AWS Services path and migration services. |
| Current account status | Not active. |
| proof360 relevance | High for scaleups moving from legacy infrastructure to AWS. This is a co-funded migration play. |

### Sell: Proof of Concept Funding

| Field | Detail |
|---|---|
| What it is | Credits or funding for customers evaluating AWS through a proof of concept. |
| New customer use | Demonstrate AWS feasibility for a business project. |
| Existing customer use | Grow AWS utilization or introduce new AWS products. |
| How to access | Submit an eligible POC opportunity in ACE Partner Central. |
| Constraint | Cannot be combined with other funding programs. |
| Current account status | Not active. |
| proof360 relevance | Extremely high. This maps directly to startups and scaleups evaluating AWS, with Ethiks360 as the delivery and partner route. |

### Sell: ISV Workload Migration

| Field | Detail |
|---|---|
| What it is | Program helping software partners develop repeatable migration capabilities and joint GTM strategies. |
| Eligibility | SaaS product on AWS, Validated or Differentiated Software Partner Path status, and completed FTR for the workload. |
| Benefit | Prescriptive technical guidance and funding to offset migration costs. |
| Current account status | Not active. |
| proof360 relevance | High for ISV startups with SaaS products on AWS Marketplace. |

### Sell: Partner Initiative Funding

| Field | Detail |
|---|---|
| What it is | Incentive funding for specific partner categories or use cases. |
| How to access | Review Partner Central funding guidelines or speak to AWS Partner Manager. |
| Nature | Discretionary and relationship-led. |
| Current account status | Not active. |
| proof360 relevance | Potentially high for agentic AI and trust governance positioning, but this is a PDM conversation, not just a form. |

## Co-sell Pathway

ACE is the AWS co-sell and opportunity workflow. It is the mechanism for AWS sharing leads, tracking opportunities, and giving partner-attributed credit to AWS sellers.

### Six incomplete co-sell onboarding steps

1. Create the partner profile. The profile is published, but AWS may still consider parts incomplete.
2. Complete Partner Central Settings.
3. Complete Marketplace Settings.
4. Create and validate a solution aligned to the route to market.
5. Create a new product listing on AWS Marketplace.
6. Create the first Partner Originated opportunity.

### Current opportunity state

| Field | Value |
|---|---|
| Opportunity ID | `O6657441` |
| Status | Rejected |
| Stage | Prospect |
| Company | `ethiks labs` |
| Leads flowing from AWS | 0 |

The rejection likely means AWS did not accept the opportunity as a co-sell opportunity. Possible causes include incomplete ACE qualification, insufficient opportunity detail, missing validation, or onboarding gaps. This is fixable and should be reviewed with the PDM.

### What unlocks ACE lead sharing

Complete all six co-sell onboarding steps and validate the solution. Once this is done, AWS field sellers can start sending leads directly.

## AWS Marketplace Status

The Marketplace account exists, but the seller pathway is not transact-ready yet.

### Five incomplete Marketplace steps

1. Create seller profile.
2. Provide tax information.
3. Provide bank account and disbursement preferences.
4. Complete KYC.
5. Create or manage offers.

Until tax, bank, and KYC are completed, the account may list products but should not be treated as fully ready to receive payments.

### Product types available

| Listing type | Relevance |
|---|---|
| AI Agents and Tools | High relevance for proof360, VECTOR, and governed agent positioning. |
| SaaS Products | High relevance for subscription or contract SaaS. |
| Server Products | AMI-based listings. |
| Machine-Learning Products | SageMaker-based listings. |
| Data Products | AWS Data Exchange. |
| Professional Services | Potential route for proof360 or Ethiks360 advisory/delivery packages. |
| Device Listings | IoT pathway via legacy redirect. |

### Commercial mechanics

| Mechanic | Meaning |
|---|---|
| Private Offers | Custom pricing or terms for a specific buyer. Main enterprise sales motion on AWS Marketplace. |
| Free Trials | Public free trial offers. |
| Agreements | Contract management for signed deals. |
| Disbursement | AWS collects from the customer and disburses to the seller bank account, minus AWS fees. |

## Channel Management and Ingram Flywheel

Channel Partner Management with Billing Transfer is the mechanism by which Ethiks360 can resell AWS services to customers through a Program Management Account, with Ingram or direct channel routes layered around it.

### How the model works

1. Ethiks360 sets up one or more Program Management Accounts.
2. Customer AWS accounts are connected as relationships.
3. Customer AWS usage flows through the billing entity.
4. Channel program discounts apply to that usage.
5. Ethiks360 bills the customer at a margin.

### Current state

| Area | Status |
|---|---|
| Program Management Accounts | 0 |
| Channel billing transfer | Not configured |
| Customer relationships | Not configured |

### Activation path

1. Set up PMA or PMAs under Channel Partner Management.
2. Enroll in relevant Channel Programs through the legacy portal.
3. Add customer relationships.
4. Use Billing Transfer for the commercial flow.

### Ingram pathway

The Distributor Applications section in Legacy Partner Central is the likely formal route for the Ingram relationship:

```text
AWS -> Ingram -> Ethiks360 -> Customer
```

Each layer has its own pricing structure and margin. This is the recurring revenue engine: every startup or scaleup that signs with Ethiks360 as billing entity can become recurring revenue on their AWS spend.

## Partner Programs Visible or Relevant

### Partner paths

| Path | For whom | Benefits unlocked |
|---|---|---|
| Software Path | ISVs with SaaS or software products | Marketplace listing, ISV Accelerate, workload migration eligibility. |
| Services Path | Consulting or systems integration partners | Competency eligibility, MDF, MSP eligibility. |
| Hardware Path | Device or hardware makers | Device Qualification Program. |
| Distribution Path | Distributors | Channel program discounts. |
| Training Path | Training providers | Training Partner designation. |

### Designations and competencies

| Designation | Qualification level | Requirement shape |
|---|---|---|
| AWS Competency | Validated / Differentiated | Deep technical and customer evidence in a domain, such as GenAI, machine learning, or security. |
| AWS Service Ready | Validated | Technical review against a specific AWS service, such as Bedrock Ready if available/applicable. |
| AWS Service Delivery | Differentiated | Customer evidence and technical depth for delivering a specific AWS service. |
| Well-Architected Partner | Validated | Ability to deliver AWS Well-Architected Reviews. |
| Managed Service Provider | Advanced | Comprehensive managed services capability and audit. |
| AWS Device Qualification | Validated | Hardware or IoT device testing. |

Fastest likely MDF unlock: pursue an accessible designation, with AWS Service Ready or Well-Architected Partner appearing to be the most realistic first candidates. For the current narrative, Bedrock alignment should be tested with the PDM.

### ISV Accelerate

| Field | Detail |
|---|---|
| What it is | AWS co-sell program for ISVs with products on AWS Marketplace. |
| Benefit | Co-sell support from AWS field sellers, referrals, and AWS seller incentives. |
| Eligibility | Active paid Marketplace listing and Software Partner Path. |
| proof360 relevance | Critical if proof360 becomes the qualified-funnel product AWS sellers can route through. |

### AWS Activate

| Tier | Target | Benefit |
|---|---|---|
| Activate Founders | Startups getting started | USD 1,000 AWS credits. |
| Activate Portfolio | Startups backed by qualifying investors, incubators, or accelerators | Up to USD 100,000 AWS credits. |

The strategic route is Activate Provider status. If Ethiks360 is approved as an Activate provider, it can issue activate codes for eligible startups. This becomes the proof360 card: founder qualifies, receives code, lands on AWS, and the billing/channel flywheel can begin.

Current status is not confirmed. Check Legacy Partner Central Program Applications.

## Partner Analytics

Once activity exists, the account can track:

- Business health at a glance.
- Opportunity pipeline performance.
- AWS lead funnel quality and conversion.
- Funding and investment ROI.
- Channel billing revenue and discounts.
- Marketing campaign MDF performance.
- Staff AWS training and certifications.
- AWS-attributed revenue.

Current dashboards are likely empty or minimal because account activity is low.

## Account Connections

Partner Discovery can be used to find and connect with:

- Other APN partners for co-delivery, referral, or white-label routes.
- ISV partners whose products can be sold via Marketplace.
- Systems integrators that can deliver projects sourced by Ethiks360.

Current partner connections: 0.

## proof360 Product Mapping

| proof360 card | AWS program | Qualification surfaced | Ethiks360 commercial position |
|---|---|---|---|
| Get USD 1K in AWS credits | AWS Activate Founders | Startup stage, not yet VC-backed | Billing entity via Ingram / AWS channel. |
| Get USD 100K in AWS credits | AWS Activate Portfolio | Backed by qualifying investor, accelerator, or incubator | Billing entity and provider code issuance if approved. |
| Get AWS migration funding | Migration Acceleration Program | Moving workloads to AWS | Delivery partner and billing entity. |
| Fund your AWS POC | POC Funding | New or existing AWS customer evaluating AWS | Submit via ACE; Ethiks360 is partner. |
| List on AWS Marketplace | Marketplace listing | Has SaaS, services, data, AI agent/tool, or other listable product | Facilitate listing and co-sell pathway. |
| Get AWS co-sell support | ISV Accelerate | Active Marketplace listing and Software Path readiness | Referral, co-sell, and partner attribution. |
| Build with AWS credits | Innovation Sandbox | Building product or solution on AWS | Billing entity and partner route. |
| Access AWS marketing funds | MDF | Holds eligible AWS designation | Manage fund request and campaign route. |
| Migrate your workload to AWS | ISV Workload Migration | SaaS on AWS, validation status, FTR complete | Technical delivery partner. |

### Automation readiness

| Level | Examples |
|---|---|
| Programmatic once approved | Activate code issuance, Marketplace offer creation. |
| Semi-programmatic | ACE opportunity submission, fund requests requiring AWS approval. |
| Human-led | MDF strategy, PIF, MAP, MSP designation, Competency applications. |

## Open Questions

### For the AWS PDM

1. Is Ethiks360 / ethikslabs approved as an AWS Activate Provider? If not, what is the path and timeline?
2. Why was ACE opportunity `O6657441` rejected? Is it fixable?
3. What is the fastest path to MDF eligibility from the current account state?
4. Is an AWS Service Ready path around Bedrock achievable in the next 90 days?
5. Is there any Partner Initiative Funding aligned to Ethiks360's AI governance, agent, or trust posture work?
6. Of the six co-sell onboarding steps, which one should be prioritized first?

### For AWS Marketplace

1. What is the fastest path through tax, bank, and KYC to transact-ready status?
2. What are the specific requirements for the AI Agents and Tools category?
3. Can proof360 or Ethiks360 advisory work be listed as a Professional Services product?

### For Ingram

1. What is the current Distributor Application status via Legacy Partner Central?
2. How does Billing Transfer integrate with Ingram's current billing infrastructure?
3. What discount tiers are available across the Ingram -> Ethiks360 -> Customer stack?

### For AWS agentic AI team

1. Is there a co-build or co-market program for partners building agentic systems on AWS?
2. Are there GTM incentives for early movers in the AI Agents and Tools Marketplace category?

## Priority Action List

### This week

- [ ] Complete tax information, bank account, and KYC in Marketplace Settings.
- [ ] Complete Partner Central Settings beyond the already-set alliance lead contact.
- [ ] Check Program Applications in Legacy Partner Central and confirm Activate Provider status.

### This month

- [ ] Create and validate an ACE solution aligned to agentic AI / proof360, not only the existing MERN solution.
- [ ] Create an AWS Marketplace product listing, even if the first listing is Professional Services.
- [ ] Submit a new Partner Originated ACE opportunity with proper customer context.
- [ ] Set up the first Channel PMA so the commercial infrastructure exists before customers arrive.

### Next 60 to 90 days

- [ ] Test the AWS Service Ready / Bedrock pathway with the PDM.
- [ ] Apply to ISV Accelerate after a Marketplace listing exists.
- [ ] Complete PRM requirements before the July 31, 2026 deadline.
- [ ] Design the proof360 Activate integration around provider status, code issuance, and billing route.

## Strategic Readout

This account is active but under-configured. The commercial shape is strong because the portal already contains the rails proof360 needs: Marketplace, ACE, funding, Partner Discovery, Channel Management, and analytics. The current gap is operational activation, not conceptual alignment.

The highest-leverage sequence is:

1. Finish Marketplace transaction setup.
2. Validate the proof360-aligned solution.
3. Fix the rejected ACE opportunity pattern.
4. Confirm Activate Provider status.
5. Configure PMA / Billing Transfer.
6. Use proof360 as the front door that pre-qualifies founders for AWS credits, POC funding, Marketplace, migration, and co-sell.

The key product insight: proof360 should not merely tell a startup it has AWS gaps. It should show the funded route, the AWS program, the evidence needed, who must approve it, and the next ask.
