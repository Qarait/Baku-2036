# RAISE-Inspired Baku 2036 Release 2 Factor-Ledger Proposal

**Status:** Proposed for human approval; not yet an approved implementation specification.

## Purpose

Release 1 made the existing editorial scenario arithmetic inspectable without changing its values or formula. Release 2 would make the qualitative reasoning behind each zone auditable by connecting statements to the evidence records already shipped in `data/zones.json`.

This proposal is deliberately narrow. It does not create numerical factor weights, change `growthPct`, derive a new scenario percentage, add market data, or call any source a proof of property-price movement.

## Decision requested

Approve or revise all three items below before any Release 2 runtime implementation begins:

1. The six-factor vocabulary and qualitative roles.
2. The stable evidence IDs and the complete 16-zone mapping.
3. The bilingual factor statements and their source-boundary wording.

Until those approvals are recorded, this document is an audit artifact only. The live site continues to use the completed Release 1 behavior.

## Evidence inventory audited

The current repository contains 19 evidence records. The IDs below are proposed stable identifiers; they are not yet present in the data files.

| Proposed evidence ID | Zone | Existing source and fact boundary |
| --- | --- | --- |
| `whitecity.aiib-metro-y14` | White City | AIIB/Baku Metro framework: planned Green Line stations and Y14 identification; timing remains subject to the project schedule. |
| `whitecity.atkins-white-city` | White City | AtkinsRéalis: White City regeneration and East Quarter planning scope; this is not a property-price series. |
| `yasamal.state-programme-purple-b4-b8` | Yasamal | State Programme: Purple Line B4–B8 included in the 2025–2030 programme; opening timing can move. |
| `narimanov.aqp-market-may-2026` | Narimanov | AQP May 2026: dated Baku-wide market benchmark; not proof of a Narimanov price lead. |
| `sabail.aqp-market-may-2026` | Sabail | AQP May 2026: dated Baku-wide market reference; not a Sabail-specific price estimate. |
| `khojasan.aiib-purple-depot` | Khojasan | AIIB/Baku Metro framework: operational Purple Line depot and separate planned extension; further uplift depends on unfinished works. |
| `khirdalan.ady-absheron-rail` | Khirdalan | ADY: Khirdalan is on the existing Absheron Circular Railway network; the cited record does not quantify a property premium. |
| `sumgayit.economic-zones-industrial-park` | Sumgayit | Economic Zones: resident companies, investment, and permanent jobs at the industrial park; this supports an employment thesis, not automatic residential growth. |
| `novkhani.ayna-northern-corridor` | Novkhani | AYNA: existing railway access and northern-road improvement corridor; delivery and local access remain relevant. |
| `bilgah.sea-breeze-development` | Bilgah | Sea Breeze/developer-government report: completed development, investment, jobs, and resident growth; reported figures are not independent market forecasts. |
| `bilgah.state-programme-tram` | Bilgah | State Programme: Sea Breeze–Pirshagi tram listed as planned 2027–2029 infrastructure; not funded-and-guaranteed construction. |
| `mardakan.polycentric-plan` | Mardakan | Official polycentric plan: Mardakan regional-centre direction and planned railway restoration; this is a long-term planning signal. |
| `airport.president-northern-corridor` | Airport | Presidential road announcement: northern airport-side road catalyst and corridor context; current connections are not an “airport city” price estimate. |
| `mohammadi.president-bogushor-pirshagi-road` | Mohammadi | Presidential road announcement: road opened and route passes through or near northern settlements; it does not prove Mohammadi repricing. |
| `hovsan.state-programme-rail` | Hovsan | State Programme: Yeni Surakhani–Hovsan railway restoration scheduled for 2026–2027; delivery remains a dependency. |
| `zikh.polycentric-transport-plan` | Zikh | Official plan: local-centre/east-corridor direction and road/rail relevance; no circular-metro base case is established. |
| `lokbatan.polycentric-plan` | Lokbatan | Official plan: local-centre direction with planned railway and outer-ring-road links; this is gradual corridor planning, not a guaranteed repricing event. |
| `alat.port-of-baku-throughput` | Alat | Port of Baku: 2024 throughput and current capacity; this supports a logistics thesis, not immediate residential demand. |
| `alat.afez-master-plan` | Alat | AFEZ: 719-hectare master plan and announced industrial projects; employment demand must precede any housing interpretation. |

No source record may be reused under a different zone ID without an explicit review decision. A URL change must update the existing record rather than silently create a second identity.

## Proposed factor vocabulary

The vocabulary is intentionally small. A factor is a qualitative explanation, not a score. The role is descriptive and does not create a weight.

| Factor ID | Role | English statement | Turkish statement |
| --- | --- | --- | --- |
| `transport-existing` | `support` | Existing transport access is documented here. The cited source does not measure a zone-level property premium. | Mevcut ulaşım erişimi burada belgelenmiştir. Atıf yapılan kaynak bölgeye özgü bir mülk primini ölçmez. |
| `transport-programmed` | `dependency` | An official plan or programme documents planned transport work; timing, delivery, and useful access remain dependencies. | Resmî bir plan veya program planlanan ulaşım çalışmasını belgeler; zamanlama, teslim ve işe yarar erişim hâlâ bağımlılıktır. |
| `development-anchor` | `support` | A named regeneration or private development anchor is documented; reported plans or targets are not independent market forecasts. | Adı belirtilen bir yenileme veya özel gelişim odağı belgelenmiştir; bildirilen planlar veya hedefler bağımsız piyasa tahminleri değildir. |
| `employment-anchor` | `support` | Current industrial, logistics, or jobs activity is documented; it does not automatically imply residential price growth. | Mevcut sanayi, lojistik veya istihdam faaliyeti belgelenmiştir; bu durum otomatik olarak konut fiyat artışı anlamına gelmez. |
| `centre-plan-direction` | `dependency` | An official plan assigns a local-centre, regional-centre, or corridor role; implementation and local demand remain dependencies. | Resmî bir plan yerel merkez, bölgesel merkez veya koridor rolü tanımlar; uygulama ve yerel talep hâlâ bağımlılıktır. |
| `market-context-only` | `unknown` | The cited market source provides citywide context, not a zone-specific price lead or causal estimate. | Atıf yapılan piyasa kaynağı şehir geneli bağlam sağlar; bölgeye özgü fiyat liderliği veya nedensel tahmin sağlamaz. |

The `unknown` role is a deliberate result. It prevents a citywide benchmark from being rendered as support for a specific zone.

## Complete proposed zone mapping

Each row below maps every current evidence record to one or more proposed factors. The mapping is qualitative only. `growthPct`, scenario multipliers, ranks, entry ranges, and deal-checker arithmetic are not inputs to this ledger.

| Zone | Evidence ID → factor ID(s) | Proposed role(s) | Boundary note |
| --- | --- | --- | --- |
| `whitecity` | `whitecity.aiib-metro-y14` → `transport-programmed`; `whitecity.atkins-white-city` → `development-anchor` | dependency; support | Metro timing and delivery remain open; regeneration evidence does not establish a property premium. |
| `yasamal` | `yasamal.state-programme-purple-b4-b8` → `transport-programmed` | dependency | Programme inclusion is not guaranteed opening or price uplift. |
| `narimanov` | `narimanov.aqp-market-may-2026` → `market-context-only` | unknown | Do not render “Baku-leading” or “20% Narimanov rise” from this record. |
| `sabail` | `sabail.aqp-market-may-2026` → `market-context-only` | unknown | Citywide benchmark is not a Sabail-specific price estimate. |
| `khojasan` | `khojasan.aiib-purple-depot` → `transport-existing`, `transport-programmed` | support; dependency | Existing depot/access and unfinished extension must remain separate. |
| `khirdalan` | `khirdalan.ady-absheron-rail` → `transport-existing` | support | Railway access is documented; congestion, land documentation, and price effects remain separate checks. |
| `sumgayit` | `sumgayit.economic-zones-industrial-park` → `employment-anchor` | support | Jobs and investment support an employment thesis, not an automatic housing premium. |
| `novkhani` | `novkhani.ayna-northern-corridor` → `transport-existing`, `transport-programmed` | support; dependency | Existing access and planned corridor work must not be collapsed into one completed catalyst. |
| `bilgah` | `bilgah.sea-breeze-development` → `development-anchor`; `bilgah.state-programme-tram` → `transport-programmed` | support; dependency | Developer/government figures and planned tram have separate confidence and status. |
| `mardakan` | `mardakan.polycentric-plan` → `centre-plan-direction`, `transport-programmed` | dependency; dependency | Regional-centre direction and railway restoration are planning dependencies. |
| `airport` | `airport.president-northern-corridor` → `transport-existing` | support | Road/rail corridor context does not establish an airport-city residential effect. |
| `mohammadi` | `mohammadi.president-bogushor-pirshagi-road` → `transport-existing` | support | Road opening is verified; repricing or district-leading growth is not. |
| `hovsan` | `hovsan.state-programme-rail` → `transport-programmed` | dependency | Railway restoration is scheduled infrastructure, not completed access. |
| `zikh` | `zikh.polycentric-transport-plan` → `centre-plan-direction`, `transport-programmed` | dependency; dependency | Local-centre and corridor direction does not establish a circular-metro case. |
| `lokbatan` | `lokbatan.polycentric-plan` → `centre-plan-direction`, `transport-programmed` | dependency; dependency | Gradual spillover and planned links remain implementation-dependent. |
| `alat` | `alat.port-of-baku-throughput` → `employment-anchor`; `alat.afez-master-plan` → `employment-anchor` | support; support | Logistics and industrial activity should not be presented as mature residential demand. |

## Approval checklist

Release 2 is approved for implementation only when a reviewer confirms:

- Every one of the 19 current evidence records has exactly one stable proposed ID or an explicit rejection decision.
- Every factor ID and role is accepted without numerical weights.
- Every zone mapping is accepted, revised, or explicitly marked `unknown`.
- Every English statement has an approved Turkish equivalent.
- The source-boundary notes for Narimanov, Sabail, Mohammadi, Bilgah, and Alat are retained.
- The validator will block duplicate evidence IDs, unresolved evidence references, invalid roles, and missing bilingual statements.
- Release 1 scenario arithmetic and `growthPct` values remain unchanged.

## Explicit non-goals

- No factor score, percentage, coefficient, confidence weight, rank adjustment, or scenario arithmetic.
- No claim that evidence proves a property-price increase or causal infrastructure uplift.
- No new property observations, asking-price series, completed-sale data, or external scraping.
- No Release 2 code, deployment, or public UI change before the checklist above is approved.
