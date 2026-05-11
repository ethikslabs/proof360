# Product opportunity for an edge monitoring system via Cloudflare and AWS Marketplace

## Executive summary

The opportunity is real, but it is narrower and more specific than a generic “observability” play. The most attractive wedge is **internet-facing edge and origin monitoring for teams that already use Cloudflare as a control point**, then want faster incident detection, simpler onboarding, and clearer accountability across CDN, ISP, DNS, WAF, origin, and API layers. That wedge is strongest for mid-market and enterprise SaaS platforms, digital businesses with revenue-critical web/API traffic, managed service providers, and a smaller number of higher-value network buyers such as ISPs and CDNs. Official product evidence from Cloudflare, AWS Marketplace, and incumbent vendors shows a crowded market for synthetic monitoring and DEM, but a weaker market for **Cloudflare-routed, inline, low-friction monitoring** that can be deployed by changing DNS or routing rather than installing agents everywhere. citeturn33view0turn33view1turn27view0turn27view2turn31view0turn32view0turn32view1

The uploaded note’s framing around a Cloudflare-routed monitoring plane, “meta-monitoring”, and attested/notarised alerts is directionally strong. The part I would keep for the initial business case is **Cloudflare-routed monitoring plus high-trust alerting**; the part I would defer is ambitious proof/notarisation machinery unless a regulated or MSP buyer explicitly pulls for it. fileciteturn0file0

My recommendation is to build an MVP around **HTTP(S) inline monitoring with Cloudflare Workers, optional private-origin connectivity via Cloudflare Tunnel, low-latency async export, and an AWS-hosted control plane**. Commercially, go **direct-to-market first**, and use AWS Marketplace as a procurement channel rather than the core engine of demand. Marketplace is valuable because AWS handles billing, supports public contracts, private offers, CPPO, and co-sell motions; however, since May 2025 AWS only grants the “deployed on AWS” designation to SaaS products whose application and control planes run entirely on AWS. A service whose core data plane depends on Cloudflare will still be listable in Marketplace, but may not qualify for that designation or for some buyer spend-commit use cases unless a fully AWS-hosted variant exists. citeturn27view9turn31view0turn27view11turn31view4turn31view5turn31view6

In base-case sizing, I would treat this as a **US$2.0 billion practical 2026 TAM** inside the overlap of synthetic monitoring and digital experience monitoring, with a **first three-year SAM of roughly US$300–400 million** and a **credible three-year SOM of US$3–9 million in exit ARR**, depending on how quickly the company lands enterprise and MSP accounts. That is large enough to support a venture-scale wedge if execution is strong, but not so large that a feature-only copycat approach will work. Differentiation has to come from deployment friction, edge-context richness, cross-layer accountability, and go-to-market focus. citeturn32view0turn32view1turn32view2turn5search2turn5search7

## Market demand, target segments and TAM

The demand thesis is strongest because outages remain expensive, internet dependencies remain opaque, and the complexity of cloud-native delivery continues to push buyers away from point tools and toward correlated experience plus network monitoring. New Relic’s 2026 observability research found average high-impact outage costs of about **US$1.8 million per hour** in financial services, with **network failures** the most commonly cited cause in that cohort. Cisco ThousandEyes continues to market heavily around visibility into ISPs, CDNs, SaaS and internet paths, and its outage map tracks incidents across ISPs, application providers, public clouds and edge-service networks. Those signals support a wedge focused on “what broke between the user and the application edge”, not just internal APM. citeturn5search2turn5search6turn21search4turn21search6turn5search7

Top-down market data also supports the opportunity. Precedence Research estimates the synthetic monitoring market at **US$1.61 billion in 2026**, while Mordor Intelligence estimates the digital experience monitoring market at **US$4.15 billion in 2026**; both reports cite cloud-native complexity, APIs, and experience assurance as major growth drivers. Fortune Business Insights places the broader APM market much higher again, at **US$11.36 billion in 2026**, which is helpful context but too broad for this specific product. citeturn32view0turn32view1turn32view2

### Target market segments and buyer personas

| Segment | Best-fit profile | Economic buyer | Functional buyer | Why this product matters | Suggested initial priority |
|---|---|---|---|---|---|
| SMBs | Revenue-bearing websites or APIs already behind Cloudflare; lean engineering team; no dedicated SRE tooling | Founder, VP Engineering, Head of Platform | DevOps lead or senior engineer | Fast setup, fewer incident blind spots, cheaper than a full observability suite | Medium |
| Enterprises | Digital commerce, fintech, media, marketplaces, customer-facing SaaS | CIO, VP Engineering, VP Digital | SRE director, Network Ops, Platform Engineering | Correlates edge, origin, ISP and CDN path issues without a large instrumentation programme | Very high |
| ISPs | Regional or national operators needing service assurance and “what customers see” evidence | CTO, VP Network Operations | NOC director, service assurance lead | External visibility, SLA protection, outage triage and customer evidence | Selective high-value |
| CDNs | Providers or teams operating multi-CDN and edge delivery | VP Network, VP Delivery | Traffic engineering, performance engineering | Objective edge/origin telemetry, routing and failover evidence | Selective |
| SaaS platforms | API-heavy, multi-region, customer-facing services | CTO, VP Platform | SRE, incident commander, API platform owner | Detects internet-layer/API regressions before tickets spike | Very high |
| MSPs and MSSPs | Managed platform/network providers serving many end customers | GM Managed Services | Service delivery manager | White-label or multi-tenant monitoring with alert verification and status evidence | High |

The buyer personas map especially well to industries that the incumbent platforms themselves highlight. ThousandEyes explicitly targets carriers and hosting, consumer web, financial services, public sector and other digital-service environments; its cloud and endpoint agents are built around seeing application, network, ISP and CDN dependencies. Catchpoint positions itself around “internet performance monitoring” with global agents and internet-path visibility, again confirming that the right buyer is typically responsible for uptime and external experience, not just server metrics. citeturn21search3turn21search4turn21search6turn22search5turn22search1

### Core use cases

The highest-value use cases are not generic uptime checks. They are: detecting origin regressions after a deployment; proving whether an incident is an origin, CDN, ISP, DNS or regional edge problem; monitoring API reliability from the edge; observing private origins exposed via Tunnel without opening inbound ports; and providing board-safe or customer-safe evidence during incidents. Cloudflare’s own docs show that health checks, load balancing, Workers routing and Tunnel already provide the primitives for active monitoring, failover and private-origin access, which means the product can be opinionated about workflows rather than inventing basic transport. citeturn33view0turn33view1turn27view0turn27view2

### TAM, SAM and SOM

I would present TAM, SAM and SOM as a transparent model, not as a pseudo-precise market fact.

| Measure | Estimate | How it is derived | Comment |
|---|---:|---|---|
| TAM | **US$2.0bn** | Practical overlap of 2026 synthetic monitoring and DEM spend, excluding most internal-only APM | Reasonable base case between US$1.6bn and US$2.6bn |
| SAM | **US$320m–400m** | Buyers with internet-facing services, meaningful Cloudflare affinity, and willingness to adopt a specialised edge product in North America, Europe and APAC | Assumes focus rather than broad global horizontal reach |
| SOM | **US$3m–9m exit ARR in year three** | 0.9%–2.4% capture of SAM, depending on enterprise win rate, MSP leverage, and average contract size | Appropriate target range for first three years |

**Assumptions.** TAM is a subset of DEM plus synthetic monitoring spend, not the whole observability market. SAM assumes an initial focus on customer-facing web/API workloads, English-first GTM, and buyers who value Cloudflare deployment simplicity. SOM assumes that the company does **not** beat Datadog, ThousandEyes or New Relic head-on as a full platform, but instead wins a specialist edge-use-case budget first.

## Competitive landscape

The market is crowded, but the competition is uneven. The closest **workflow** competitors are Cloudflare’s own health checks/load balancing stack and edge-native tooling from Fastly. The closest **budget** competitors are Datadog, New Relic, ThousandEyes and Catchpoint because they already own synthetic, DEM or network-intelligence spend. Open-source constrains the low end, but usually lacks distributed edge context, private networking polish, and enterprise reporting. citeturn33view0turn33view1turn34view0turn34view1turn19view0turn19view2turn21search1turn22search0turn18search0turn18search1

| Vendor | Category | Relevant capabilities | Public pricing signal | Strengths | Weaknesses |
|---|---|---|---|---|---|
| **entity["company","Cloudflare","connectivity cloud"]** | Direct / adjacent | Health Checks, Load Balancing, Workers routes, Tunnel, logs | Load Balancing starts at **US$5/month** | Native for existing Cloudflare users; simplest path to inline visibility; good failover/routing primitives | Not a full DEM/incident product; limited workflow depth versus observability suites |
| **entity["company","Datadog","observability software"]** | Direct | Synthetic API and browser tests, private locations, broad observability integration, edge device monitoring | Synthetic API tests **US$5 per 10k runs**; browser tests **US$12 per 1k runs** billed annually | Strong platform consolidation; good developer and SRE workflow integration | Can become expensive at scale; not Cloudflare-native inline monitoring |
| **entity["company","New Relic","observability software"]** | Direct | DEM plus synthetics, public and private locations, unified observability | Free tier includes **500 synthetic checks**; Synthetics Pro **US$69 per 10k checks** annual; private locations **US$1,000 fixed** | Transparent usage model; good cross-product workflows; easy entry | Data-ingest economics and pricing complexity still matter; less edge-native |
| **entity["organization","Cisco ThousandEyes","network intelligence"]** | Direct | Cloud, enterprise and endpoint agents; API, DNS, BGP, CDN and ISP monitoring | Annual subscription; **quote based** | Best-known brand for internet-path and provider visibility; strong enterprise credibility | Opaque pricing; enterprise-heavy sales motion; more complex onboarding |
| **entity["company","Catchpoint","internet performance"]** | Direct | Internet Performance Monitoring, synthetic and internet synthetics, global intelligent agents | **Quote based** | Very strong external vantage model; internet-centric story | Enterprise-focused; pricing opacity; integration path after acquisition may evolve |
| **entity["company","Fastly","edge cloud platform"]** | Adjacent | Origin Inspector, metrics, real-time logging, health checks | Mostly bundled/custom; Origin Inspector is an optional upgrade | Strong edge/origin visibility for Fastly customers; real-time data | Best only for organisations already on Fastly; not a broad monitoring suite |
| Open-source | Indirect | Uptime Kuma, OneUptime, Prometheus blackbox exporter, OpenStatus | Free/self-hosted or low-cost SaaS | Cheap, flexible, controllable | Ops burden; weak distributed internet intelligence; weaker enterprise support and compliance posture |

Pricing and feature references above come from official vendor pages and docs, except where vendors do not publish list pricing and only expose quote-based models. Catchpoint’s current corporate status also changed after its December 2025 acquisition by entity["company","LogicMonitor","hybrid observability"], which is relevant for account strategy and future product bundling. citeturn19view4turn20view1turn19view2turn19view1turn21search1turn21search20turn22search0turn22search1turn34view0turn34view1turn34view3turn34view4turn18search0turn18search1turn18search2turn18search3turn23search0turn23search2

The strategic takeaway is straightforward. Competing as “another synthetic monitoring tool” is unattractive. Competing as **the best way to monitor user-critical traffic that already passes through Cloudflare** is more promising, because it reduces deployment friction and increases edge-context fidelity. The product should therefore avoid trying to replicate full-stack APM, logs, RUM and endpoint management in the first year. It should integrate with those tools, not imitate them. citeturn27view0turn27view2turn33view1turn21search8turn22search5

## Product and technical architecture

The strongest product architecture is a **hybrid edge-plus-control-plane model**: use Cloudflare as the inline monitoring surface where customer traffic already flows, but keep tenant management, analytics retention, alerting, billing and enterprise administration in AWS. That aligns technical differentiation with a realistic procurement path. citeturn24search0turn24search1turn24search5turn24search11

### Recommended technical options

| Option | Best for | How it works | Pros | Constraints |
|---|---|---|---|---|
| Inline HTTP(S) monitoring with Workers | Customer-facing sites, APIs, multi-tenant SaaS | Customer maps a route to a Worker; Worker records metadata then proxies to origin | Fastest onboarding; richest edge context; no origin agent needed | Must keep request path extremely lightweight |
| L4 monitoring with Spectrum | TCP/UDP services, mail, MQTT, gaming, file transfer | Traffic passes through Spectrum; service metrics inferred at L4 | Covers non-HTTP workloads | Paid-plan dependency; lower semantic richness than HTTP |
| Private-origin mode with Cloudflare Tunnel | Origins that should not expose public IPs | `cloudflared` creates outbound-only tunnel; traffic stays behind Cloudflare | Excellent for private apps and secure onboarding | Requires origin-side daemon and customer acceptance of Tunnel |
| Agentless synthetic probes | Public endpoints, pre-prod, SLA checks | Scheduled probes from managed regions/private locations | Low risk MVP extension; complements inline mode | Less true-to-life than real inline traffic |
| Lightweight private probes / agents | Internal apps, regulated environments | Small probe in customer VPC/on-prem, sending results to control plane | Covers internal targets and private networks | Higher deployment friction and support burden |

The official building blocks are already there. Workers routes map URL patterns to code at the Cloudflare edge; Spectrum proxies any TCP/UDP service; Cloudflare Tunnel provides outbound-only, post-quantum-encrypted connectivity without public IP exposure; Load Balancing and Health Checks can already monitor endpoints, steer traffic and fail over. Those primitives reduce implementation risk materially. citeturn27view0turn27view1turn27view2turn33view0turn33view1

### Recommended reference architecture

The request path should be minimal. A customer points a hostname through Cloudflare and attaches a route to a Worker. The Worker evaluates tenant policy, stamps request and response metadata, and immediately proxies to origin. Heavy lifting must be asynchronous: event summaries go to Cloudflare Queues, tenant-scoped counters and low-latency coordination live in Durable Objects, and high-cardinality hot analytics can use Workers Analytics Engine. Because Analytics Engine currently stores data for only **three months**, it is better treated as a hot/fast layer, not the long-term system of record. Logpush can be used for near-real-time batch export and reconciliation. citeturn27view0turn27view3turn27view4turn27view5turn27view6turn27view7

A clean AWS control plane then takes over. Ingestion APIs handle tenant auth and control-plane traffic. Entitlements, account objects and alert policies sit in relational storage; long-term events go to lower-cost object storage or a columnar analytics stack; notifications fan out through standard AWS messaging. Amazon Managed Grafana is viable for embedded dashboards when buyers want a familiar interface, and AWS services also help if the company later wants to publish compliance artefacts through AWS channels. citeturn28view5turn9search2turn15search5

### Data model and alerting

For the MVP, capture **metadata, not payloads**. The core event schema should include tenant, hostname, route, time, method, status, edge colo, latency buckets, cache status, origin outcome, TLS/certificate signals, selected ISP/ASN or region tags, and synthetic/private-probe context where available. Defaulting to metadata-only keeps privacy, security and retention simpler while still supporting most operational use cases. Alerting should begin with a narrow rules engine: availability, p95/p99 regressions, regional anomalies, origin error spikes, certificate expiry, Tunnel degradation, and “dependency blast radius” views that separate origin issues from network/provider issues. citeturn33view0turn33view1turn21search9turn21search15

### Multi-tenancy, scalability and security

The product should launch as **pooled multi-tenant by default**, with hard tenant IDs on every event, row-level security in analytics, per-tenant encryption keys for secrets, customer-scoped API tokens, SSO/SAML for enterprise, and an enterprise option for dedicated data stores if needed. Cloudflare’s network now spans **330+ cities in 125+ countries**, and Workers positioning claims service within **50 ms of 95% of internet users**; that makes the inline architecture globally credible so long as the Worker itself stays thin and the control plane does not sit on the critical request path. citeturn24search0turn24search1turn24search5

For compliance-sensitive customers, Cloudflare’s Data Localization Suite can help control where Cloudflare inspects and stores data, and the Workers localisation docs explain how Workers can be configured with Regional Services and Customer Metadata Boundary. On the AWS side, AWS Artifact is the delivery mechanism for AWS compliance reports, and AWS notes that SOC reports are available through Artifact. For the product itself, the target bar should be SOC 2 Type II first, then ISO 27001 if enterprise traction warrants it. citeturn15search4turn27view8turn15search2turn15search5turn16search3turn16search7

### Recommended MVP feature set

The MVP should include: inline HTTP(S) monitoring via Workers; optional Tunnel support for private origins; basic synthetic checks; incident alerts to Slack, PagerDuty, webhooks and email; tenant dashboards with regional heatmaps and origin-vs-edge breakdowns; status evidence export; API access; SSO for paid tiers; and simple usage-based billing. I would **not** include RUM, full endpoint agents, complex AI root-cause systems, or broad packet/network telemetry in the MVP. Those features increase scope and move the product directly into the strongest territory of the incumbents. citeturn27view0turn27view2turn27view3turn31view1

## Commercial model, AWS Marketplace and go-to-market

The commercial shape should be **hybrid subscription plus usage**. That matches both how buyers think about monitoring budgets and how AWS Marketplace expects SaaS dimensions to work. AWS explicitly supports SaaS subscriptions, SaaS contracts, and SaaS contracts with pay-as-you-go overages, and its pricing-dimension examples include users, hosts scanned and GB of logs ingested. That is a natural fit for dimensions such as monitored hostnames, monitored requests, private probes, and retention. citeturn31view0turn31view1turn31view2

### Packaging on AWS Marketplace

For this product, the best Marketplace packaging is **SaaS contract with pay-as-you-go**. The public offer should be simple and small in number of dimensions, because Enterprise deals will mostly close via private offers. Public SaaS listings incur a **3%** fee, while private offers are **3% below US$1m TCV**, **2% between US$1m and below US$10m**, and **1.5% above US$10m** or on renewals. Private offers also support GBP, AUD, EUR, JPY and selected other currencies, while public listings are in USD. citeturn27view11turn31view5

To integrate technically, AWS Marketplace requires a registration URL flow, token resolution through `ResolveCustomer`, entitlement verification through `GetEntitlements`, and subscription-change handling. AWS also notes that new SaaS listings are moving toward **Amazon EventBridge** for subscription events rather than relying on SNS for new integrations. That is manageable engineering work, but it should be planned from the start, not bolted on late. citeturn27view10turn25search0turn25search10

The important strategic caveat is deployment eligibility. Since May 2025, AWS allows Marketplace listings for SaaS products regardless of deployment location, but only products whose application and control planes run entirely on AWS receive the “deployed on AWS” designation. That matters because some enterprise buyers care about spend-commit drawdown. If the product’s core live service depends on Cloudflare-operated components, listability is not the issue; **badge eligibility and certain procurement incentives are**. citeturn27view9turn13search1

### Direct-to-market versus Marketplace

| Route | Best use | Advantages | Disadvantages | Recommendation |
|---|---|---|---|---|
| Direct self-serve | SMB and small mid-market | Fastest learning loop; best control of pricing, onboarding and support | Higher friction for enterprise procurement | Use from day one |
| Direct sales-assisted | Enterprise SaaS, MSPs, selected ISPs/CDNs | Better discovery, expansion and packaging | Longer sales cycle | Core motion for higher ACV |
| AWS Marketplace public offer | Procurement convenience, discoverability | AWS billing, standard contract path, lower vendor onboarding friction | Fee drag, public pricing rigidity, USD-only public pricing | Use early, but keep simple |
| AWS Marketplace private offers | Enterprise and channel | Better close mechanics, custom terms, multi-currency, renewals | Operational discipline required | Essential by the time enterprise selling begins |
| CPPO / channel | Resellers, MSPs, regional partners | Lets channel own commercial relationship | Requires channel enablement | Add once repeatability exists |

AWS’s own programme structure strongly supports enterprise co-sell once the product is mature enough. The ISV Accelerate programme is a global co-sell motion for partners selling through AWS Marketplace, while CPPO lets authorised channel partners own the financial and contractual relationship in Marketplace. Cloudflare’s Technology Partner programme also explicitly offers technical integrations plus joint sales and marketing opportunities. citeturn31view6turn31view3turn31view7

### Recommended pricing model

| Plan | Indicative price | Included model | Intended buyer |
|---|---:|---|---|
| Starter | **US$199–299/month** | 1–3 hostnames, basic synthetic checks, basic alerts, 30-day retention | SMBs, startups |
| Growth | **US$799–1,299/month** | 10+ hostnames, role-based access, API, SSO, advanced routing insights, 90-day retention | Mid-market SaaS and digital businesses |
| Enterprise Platform | **US$2,500–5,000/month plus usage** | Multi-team tenancy, SLA views, private probes, export APIs, custom retention, premium support | Enterprise SaaS, MSPs |
| Network / Provider | **US$50k–150k ARR** | Custom contracts, larger event budgets, private deployments, account team | ISPs, CDNs, large platforms |

**Assumptions.** Pricing should stay roughly channel-neutral between direct and Marketplace; do not mark up Marketplace so aggressively that buyers avoid it. Absorb the fee in most cases, and use annual contractions or private offers to preserve margin.

### Sales motion, partnerships, onboarding and support

The first sales motion should be **product-led evidence, sales-assisted conversion**. Let an SMB or platform engineer point one hostname through Cloudflare, see latency and error attribution within minutes, and then convert once the first incident or regression is detected. For enterprise, the motion should begin with a high-value, low-scope deployment on one revenue-critical hostname, one API cluster, or one Tunnel-backed private service. That produces incident proof quickly and shortens the “why another tool?” debate. citeturn27view0turn27view2turn33view1

Partnerships should be practical rather than symbolic. With Cloudflare, focus on technology-partner alignment, joint architecture patterns, and co-marketing around edge reliability. With AWS, focus on Marketplace operational maturity, private offers, and ISV Accelerate once there is repeatable customer proof. MSPs are a particularly attractive channel because the product is inherently multi-tenant and evidence oriented. citeturn31view7turn31view6turn31view3

Onboarding must be exceptionally short. The target should be: create tenant, connect domain or route, verify telemetry, configure alerts, and publish a first dashboard in under an hour for self-serve buyers. Support should begin with email and Slack/community patterns for lower tiers, then add named success management and incident-response SLAs for enterprise tiers.

## Financial outlook, KPIs and roadmap

### Unit economics and pricing scenarios

The variable cost profile is favourable if the architecture is disciplined. Cloudflare Workers pricing is low on a request basis, with **10 million requests included** and **US$0.30 per additional million** on the standard plan; Queues include **1 million operations per month** and then cost **US$0.40 per million**, while R2 standard storage is **US$0.015 per GB-month** with free egress. Amazon Managed Grafana is a per-user control-plane cost, not a large variable cost centre. In other words, the architecture can support healthy SaaS gross margins provided detailed payload retention is not the default. citeturn28view0turn29view2turn29view3turn29view1turn28view5

| Scenario | Blended customer mix | Indicative gross margin | Comment |
|---|---|---:|---|
| Starter-heavy | Many SMBs, low support touch, lighter event budgets | **82%–86%** | Viable if acquisition is efficient |
| Balanced | Growth and enterprise dominate revenue, SMBs dominate logos | **84%–88%** | Best base-case profile |
| Enterprise-heavy | Fewer accounts, more support and private probes | **78%–85%** | Lower margin but stronger retention and expansion |

**Assumptions.** Gross margin estimates assume metadata-first capture, asynchronous export, sensible sampling for detailed events, and limited premium support costs in lower tiers.

### Three-year revenue scenarios

| Year | Conservative customers at year-end | Conservative exit ARR | Optimistic customers at year-end | Optimistic exit ARR |
|---|---:|---:|---:|---:|
| Year one | 25 | **US$0.18m** | 40 | **US$0.35m** |
| Year two | 95 | **US$0.95m** | 180 | **US$2.50m** |
| Year three | 230 | **US$3.20m** | 450 | **US$8.80m** |

**Assumptions.** Conservative case assumes mostly SMB and mid-market traction, limited channel leverage, and slow enterprise conversion. Optimistic case assumes two things go right: the company finds a repeatable enterprise SaaS/MSP motion, and Marketplace plus private offers improve close rates rather than merely adding procurement convenience. These are judgemental planning assumptions, not market facts.

### KPIs and sample dashboards

The product should be managed with a tight KPI set: tenant activation time, time to first alert, false-positive rate, percentage of incidents with attributable root domain or provider layer, ingestion latency, p95 inline overhead, net revenue retention, logo churn, Marketplace-sourced pipeline, and MSP channel contribution. Those metrics matter more than vanity measures such as total events ingested. citeturn31view6turn31view8

| Dashboard | Audience | Core widgets |
|---|---|---|
| Executive service health | CTO / VP Engineering | Revenue-critical hostnames, SLA/SLO status, regions in alarm, major incidents this week |
| Edge and origin operations | SRE / Platform | p50/p95/p99 latency, origin error rate, colo distribution, Tunnel health, failover events |
| Internet dependency view | Network / Incident team | ISP/ASN anomalies, DNS failures, CDN edge variance, region-by-region degradation |
| Tenant operations | Customer success / MSP | Tenant burn-down, noisy tenants, alert volumes, pending integrations, support SLA risk |
| Commercial performance | Leadership | Activation funnel, trial-to-paid, ACV by tier, Marketplace mix, NRR, gross margin trend |

### Roadmap and resource estimate

| Period | Milestones | Team shape | Rough cost |
|---|---|---|---:|
| Months six to twelve before scale | MVP: Workers inline monitoring, Tunnel support, alerts, dashboards, API, billing, self-serve onboarding | 1 product lead, 1 engineering lead, 3 software engineers, 1 SRE/data engineer, 1 designer or product designer, fractional founder sales | **US$0.9m–1.3m** for build phase |
| First growth period | AWS Marketplace integration, private offers, SSO, richer dashboards, MSP admin, status exports, support workflows | Add 1 solutions engineer, 1 account executive, 1 support/customer success, possibly 1 backend/data engineer | **US$2.2m–2.8m annualised** |
| Expansion period | Private probes, Spectrum support, provider-level analytics, channel tooling, compliance hardening, optional evidence attestation | Add 1 partner manager, 1 second AE, 1 additional engineer, part-time compliance/security leadership | **US$3.0m–4.0m annualised** |

The sequencing matters. The company should not invest early in a broad agent estate, full RUM, or deep AI automation. It should first prove that an inline Cloudflare-routed wedge can create faster incident attribution and a better procurement story than a larger incumbent can offer for this specific edge use case.

## Risks, recommendation and open questions

The biggest **technical risk** is adding meaningful latency or fragility to the request path. The mitigation is strict separation between the hot path and the analytics path: do the smallest possible amount of per-request work inline, then move everything else to Queues and downstream processing. Another technical risk is over-dependence on Cloudflare product limits or pricing changes; that argues for an abstraction layer around event schemas and for retaining at least one non-inline monitoring mode such as synthetic probing. citeturn27view3turn28view0turn29view2

The biggest **commercial risk** is competitive bundling. Datadog, New Relic, ThousandEyes and Catchpoint all sell broader platforms, and Cloudflare itself can always enrich native health/load-balancing features. The mitigation is to stay opinionated: sell clarity at the edge, not generic observability, and target buyers who value low-friction deployment over platform consolidation. citeturn20view1turn19view2turn21search1turn22search0turn33view1

The biggest **legal and procurement risk** is data handling plus Marketplace positioning. Monitoring systems naturally touch IP addresses, headers and path information; that requires disciplined minimisation, regional controls, DPAs and clear retention defaults. On the commercial side, buyers who require the AWS “deployed on AWS” designation may resist a Cloudflare-dependent architecture. The mitigation is to make the service listable in Marketplace anyway, be explicit about the designation issue, and consider an AWS-only operating mode later if spend-commit eligibility becomes a major blocker. citeturn15search4turn27view8turn27view9

The recommended course is therefore:

1. **Build the MVP now** around inline HTTP(S) monitoring on Cloudflare Workers, optional Tunnel support, and an AWS-hosted control plane.
2. **Sell direct first**, with AWS Marketplace added early as a procurement path, not as the sole GTM motion.
3. **Position narrowly** around internet-facing customer experience, edge-to-origin attribution, and high-trust alerting.
4. **Add MSP and enterprise features next**, because they improve ACV and channel leverage faster than broadening into generic observability.
5. **Defer heavyweight attestation, agents and AI automation** until the first 10–20 customers prove where the pull is strongest. fileciteturn0file0

### Open questions and limitations

Some competitor pricing remains opaque because Cisco ThousandEyes, Catchpoint and several Fastly observability capabilities are still quote based rather than transparently listed on public pricing pages. TAM, SAM, SOM and the three-year financial scenarios above are planning estimates built from current market reports and product economics, not audited forecasts. Finally, this report is commercial and technical analysis, not legal advice on privacy obligations or AWS spend-commit eligibility.