# AugurForkingLayer

The Augur forking layer repository hosts [Zoltar](zoltar/README.md) as an independent component.

Zoltar's contracts, UI, runtime libraries, tooling, tests, and dependency lockfile live in `zoltar/`. Its GitHub Actions entrypoints are staged in `workflow/`. Move the YAML files into `.github/workflows/` to activate them; the setup action is already in `.github/actions/setup-zoltar/`.

See the [extraction plan](docs/plans/zoltar-extraction.md) and [source provenance](zoltar/UPSTREAM.md).
