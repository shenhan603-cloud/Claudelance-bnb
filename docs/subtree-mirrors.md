# Subtree mirror repos

The two published npm packages live inside the monorepo at `packages/sdk` and
`packages/types`. For visibility on crawlers that shallow-scan a repo's root
`package.json` (notably Talent App's project tracker), the package histories
are also published to single-package mirror repos:

| Package | Source path | Mirror repo |
|---|---|---|
| `@yeheskieltame/claudelance-sdk` | `packages/sdk` | <https://github.com/yeheskieltame/claudelance-sdk> |
| `@yeheskieltame/claudelance-types` | `packages/types` | <https://github.com/yeheskieltame/claudelance-types> |

## Why mirror at all

A monorepo's root `package.json` describes the *workspace*, not any published
package. npm registry metadata for each scoped package does carry
`repository.directory` pointing back at the subpath, but most third-party
crawlers (Talent app's project page, several npm dashboards, some search
indexes) only read the root manifest of the linked GitHub repo. Result:
"No npm packages found" despite live packages with steady download volume.

Single-package mirrors give those crawlers exactly what they look for:
- One repo per published name
- `package.json` at the root
- `repository.url` pointing at that same repo
- Independent GitHub commit history per package

The monorepo remains the source of truth. Mirrors are read-only downstream
artifacts of `git subtree split`.

## How to refresh

```bash
# both
scripts/subtree-publish.sh

# one at a time
scripts/subtree-publish.sh sdk
scripts/subtree-publish.sh types
```

Force-push is used intentionally: the mirror is a projection of the canonical
history under `packages/<pkg>`. Direct edits to the mirror repos are discouraged
and will be overwritten on the next publish.

## When to run

- After each SDK / types release on npm
- After major refactors touching `packages/sdk/**` or `packages/types/**`
- Manually any time the mirror falls behind (CI workflow at
  `.github/workflows/subtree-mirror.yml` automates this on release tags)

## Verifying the link

After publish, on the mirror repo:

```bash
gh repo view yeheskieltame/claudelance-sdk
# should show the package.json name in the README + latest commits
```

On Talent App: the project page should pick up the mirror within ~24h of the
first push. If it doesn't, retrigger the project rescan from the project
settings page or contact Talent support with the package URL.
