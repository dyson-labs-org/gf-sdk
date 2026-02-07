## [0.1.1] - 2026-02-07

### Changed
- Removed admin token requirement from the regular user workflow
- Invoice creation and checkout no longer require any admin credentials
- Clarified separation between user-facing flows and admin-only execution actions

### Fixed
- Correct handling of non-BTC invoice currencies (e.g. USD) without leaking incorrect `expected_total_sats`


## [0.1.0] - 2026-02-05
### Added
- Initial gf-sdk release
