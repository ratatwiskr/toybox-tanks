# Toybox Tanks — Asset Integration Handoff

## Purpose

Integrate the generated visual assets into the existing game without silently changing gameplay, world geometry, controls or release requirements.

This handoff is based on the asset definitions and design decisions recorded in the conversation. The actual archives and local game repository were not inspected when preparing these documents. Source inspection is mandatory; this documentation is not evidence of a completed integration.

## Read in this order

1. ASSET_AGENT_INSTRUCTIONS.md
2. ASSET_CATALOG.md
3. INTEGRATION_GUIDE.md
4. VALIDATION_CHECKLIST.md
5. DESIGN_DECISIONS_AND_OPEN_QUESTIONS.md

## Supply these archives separately

- toybox-assets-kit.zip
- toybox-baukasten-erweiterung.zip
- toybox-fussboden-kit.zip
- toybox-rand-assets.zip

This documentation package does not include those asset archives. Unpack each into a separate inspection folder first; do not flatten their README files or overwrite existing repository instructions.

## Agent kickoff prompt

Read this README and ASSET_AGENT_INSTRUCTIONS.md, then inspect the actual asset archives and original game source. Before editing code, report the package revisions, actual APIs and layer schemas, authoritative world/collision dimensions, angle conventions, viewport transforms, and any conflicts. Propose a minimal staged integration plan. Implement approved visual changes only. Use a separate visual sandbox for assets whose gameplay does not exist. Do not implement catapult combat, moving enemies, chick distraction or terrain destruction without explicit approval. Report automated tests, actual browser/input tests and untested requirements separately.

## Repository instructions

Do not replace an existing AGENTS.md. Reference ASSET_AGENT_INSTRUCTIONS.md from the existing instruction mechanism if appropriate. Follow existing project requirements and ask before resolving consequential conflicts.
