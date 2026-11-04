# Toybox Tanks — Asset Integration Handoff

## Purpose

Give a local coding agent enough context to inspect and integrate the generated asset studies without silently redesigning gameplay or replacing the renderer.

These documents are based on the asset definitions, public JavaScript APIs and implementation notes recorded in the design conversation. The original game repository and the actual archives on your machine have not been inspected while preparing this handoff. Verify the files before implementation. Do not treat a preview, a generated README or this handoff as proof that a feature is implemented or browser-tested.

## Reading order

1. `ASSET_AGENT_INSTRUCTIONS.md` — binding work instructions for the integration task.
2. `ASSET_CATALOG.md` — packages, asset IDs, APIs, coordinate conventions and version caveats.
3. `INTEGRATION_GUIDE.md` — small-step integration and packaging approach.
4. `VALIDATION_CHECKLIST.md` — automated checks, manual checks and evidence requirements.
5. `DESIGN_DECISIONS_AND_OPEN_QUESTIONS.md` — approved direction versus unresolved gameplay.

Start your local agent with:

> Read README.md and ASSET_AGENT_INSTRUCTIONS.md in this handoff, then inspect the actual asset packages and the original game source. Before editing code, report the package/API inventory, the authoritative world/collision dimensions, any conflicts, and a minimal integration plan. Implement visual changes only; do not activate new gameplay unless separately authorized.

## Expected source packages

- `toybox-assets-kit.zip`: vehicle/character/projectile study, cork damage artwork, basic blocks.
- `toybox-baukasten-erweiterung.zip`: additional block shapes and colors.
- `toybox-fussboden-kit.zip`: floor tiles and optional play rug.
- `toybox-rand-assets.zip`: border components and border assembly helper.

Unpack each package into its own inspection directory first. Different studies may contain similarly named previews or README files; do not flatten them into one directory or overwrite the original project documentation.

No asset binaries are included in this documentation package. Supply the actual asset archives to the agent separately.
