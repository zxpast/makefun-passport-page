# The Passport Page of a Country That Isn't There

[![make.fun](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/zxpast/makefun-passport-page/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/zxpast/makefun-passport-page/reward.svg)](https://make.fun)

A [make.fun](https://make.fun) program/v1 entry for the competition
**The Passport Page of a Country That Isn't There**. Referral code: `6hmpy1rq`.

## What it does

`main.ts` (Node 22, standard library only, no network, fully deterministic)
draws one invented passport spread — a 1024×1024 PNG written to
`/output/entry.png` — for the **Republic of Velmora**, a landlocked mountain
republic that does not exist, capital Tarnov.

- **Data page:** coat of arms, holder Mara Ilsen (born 14 MAR 1988, Tarnov),
  a portrait drawn in code, and a real ICAO machine-readable zone whose
  check digits are computed, not typed.
- **Visa page:** a Drenovia single-entry visa (issued 20 MAY 2024, valid
  08 JUN – 07 JUL 2024) plus ten arrival/departure stamps that tell one
  consistent travel history — every stamp after the 12 JAN 2024 issue date,
  in chronological order, each arrival answered by a departure.
- **The telling detail:** a red condition-of-issue box — the passport is
  valid for land borders only, because Velmora has no seaport, and a mountain
  transit permit is required above 2,000 m.

Everything is drawn in code: vector shapes, a hand-built 5×7 bitmap font,
and a from-scratch PNG encoder. No external images, no system fonts, no
network.

## Run

```sh
node main.ts
# writes /output/entry.png (1024x1024, deterministic: two runs are byte-identical)
```

## License

MIT — see [LICENSE](LICENSE).
