# Changelog

## [0.2.0] - 2026-03-02

### Added

- Interactive plan selector using `@inquirer/select` — no shell configuration needed
- Multi-select (`@inquirer/checkbox`) for `ccplan status` — batch status changes from a single command
- Auto-select when only one plan exists

### Changed

- `clean` command default changed from 30 days to 7 days

### Removed

- Shell completion scripts (`ccplan --completions`) — replaced by built-in interactive selection

### Acknowledgements

Thanks to [@mozumasu](https://github.com/mozumasu) for contributing improvements and testing.

## [0.1.4] - 2026-03-01

### Added

- Shell completion for bash and zsh

## [0.1.3] - 2026-02-28

### Changed

- Schema validation using valibot
- Logger message improvements

## [0.1.2] - 2026-02-27

### Changed

- Metadata storage migrated to `.ccplan-meta.json` (plan files are never modified)

## [0.1.1] - 2026-02-27

### Added

- GitHub Actions CI
- npm publish workflow

### Fixed

- Type bundling issues
- macOS runner compatibility
