# CatchUp Simulation

Run the full deterministic scoring stress test with:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run simulate
```

or, when npm is available on your shell path:

```bash
npm run simulate
```

The simulation writes an isolated SQLite database to `work/simulation/catchup-sim.sqlite`, exports raw data to `work/simulation/output/`, and writes the main report to `work/simulation/reports/algorithm-evaluation.md`.

The normal app database `catchup.sqlite` is not used.