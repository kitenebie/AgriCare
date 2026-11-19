---
type: "query"
date: "2026-11-09T06:48:49.048527+00:00"
question: "Dashboard: may paraan na para mag-post ng sick-animal report. paano ito?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Animal", "dashboard/index.tsx", "TechDashboardScreen()"]
---

# Q: Dashboard: may paraan na para mag-post ng sick-animal report. paano ito?

## Answer

Expanded from original query via vocab: [dashboard, animal, report, health, farmer, submit]. To post as a farmer: Dashboard > Quick Access > My Animals > tap Report sick on the animal > enter symptoms/concern > Post report. This updates the animal record to sick with the description and reporter metadata. Technicians see it under Farmer Health Reports on their dashboard, which listens to Firestore changes. The farmer dashboard does not have a direct post button; posting is in My Animals.

## Outcome

- Signal: useful

## Source Nodes

- Animal
- dashboard/index.tsx
- TechDashboardScreen()