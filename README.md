[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/morashad1010/ai-excited/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/morashad1010/ai-excited/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

# Falling Upward

A storm-lit shore at night, where a pillar of seawater peels away from a dark rock and climbs into the clouds instead of breaking against it. One small onlooker stands at the tide line, close to nothing against the size of the thing above.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `entry.png` into the output directory (`$MAKEFUN_OUTPUT_DIR`, default `/output`), checks the copy is a regular file with a valid PNG header of at most 1 MiB, and prints its path, size and sha256.
