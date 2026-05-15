# Worker C Deliverables

Ownership scope: `deliverables/` only.

## Expected inputs

- `../data/apps.json` (array of normalized app records)
- `../data/stats.json` (optional; derived automatically if absent)

## Outputs

- `free_apps_catalog.xlsx`
- `free_apps_overview.pptx`

## Run commands

```powershell
pwsh -NoProfile -File .\deliverables\scripts\run_worker_c.ps1
```

Or step-by-step:

```powershell
py -3 .\deliverables\scripts\build_free_apps_catalog.py
py -3 .\deliverables\scripts\build_free_apps_overview.py
```

If input data is missing, scripts exit with a clear WAIT status and do not create fake artifacts.
