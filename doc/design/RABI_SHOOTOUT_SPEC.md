# Rabi Soccer Shootout — specification (third pass)

A section to add to the repository README. Describes a visualizer in the catalog
alongside `index_rabi.html` and the Bloch golf widget, which also stands alone as
a game.

Working filename: `index_soccer_shootout.html`. Single self-contained file, no build
step, no server, works from `file://` and from static GitHub Pages hosting.
Playable on phone and desktop.

This supersedes the regatta and pool drafts. The mechanics layer is largely
unchanged; the theme, the ending, and the measurement layer are new.

---

## 1. Premise

Rabi is a raccoon on a spherical pitch, seen from behind and held at the centre
of frame. Each touch of the ball rotates the world around him. The pitch shrinks
underneath him as the run goes on. When he is ready, he takes his shot — and the
shot is an actual quantum measurement, so he takes five of them.

The Bloch vector is Rabi's position. Everything else follows from that.

### 1.1 Layering

- **Sections 2–6, the mechanics layer.** Physics, controls, measurement, scoring,
  bots. Theme-independent, and the part that has to be correct.
- **Section 7, the theme layer.** Vocabulary, sprites, art direction.

If a theme change appears to require a mechanics change, the theme is wrong.

---

## 2. State and evolution

### 2.1 Representation

State is a Bloch vector `r = (x, y, z)` with purity radius `R = |r| ≤ 1`. Each
run starts at `r = (0, 0, 1)`, corresponding to `|0⟩` (`m_s = 0`). Bloch `+z` is
pinned to the N–V bond axis, consistent with the rest of the catalog.

`z` is the only component that matters for the shot. Everything else is
navigation.

### 2.2 A touch

A touch is a pulse `(Ω₀, φ, δ, t)` held constant for its duration. Rotation axis:

```
n̂ = (Ω₀ cos φ, Ω₀ sin φ, δ) / Ω        with   Ω = √(Ω₀² + δ²)
```

Rotation angle `θ = Ω t`. Apply Rodrigues' formula:

```
r' = r cos θ + (n̂ × r) sin θ + n̂ (n̂ · r)(1 − cos θ)
```

Exact for the unitary part, closed form, no integrator. From the pole it reduces
to `P₁(t) = (Ω₀²/Ω²)·½(1 − cos Ωt)`, the same model as `index_rabi.html`.

### 2.3 Which parameters the player actually holds

Only two, and this is the whole control budget:

| Parameter | Source |
| --- | --- |
| `φ` | player, by aiming |
| `t` | player, by how long the kick is charged |
| `Ω₀` | fixed constant — Rabi's kick strength |
| `δ` | **set by the level**, not the player |

Fixing `Ω₀` and level-setting `δ` means the rotation axis `n̂` sits at a fixed
tilt `β` above the equator, with `tan β = δ/Ω₀`, and the player chooses only its
azimuth and how far to turn about it. This is the minimum control set that still
produces the full physics, and it is what keeps the interface to one finger.

It also makes level design a single dial. From the north pole, one touch can
reach at best

```
z_min = 1 − 2·(Ω₀²/Ω²)
```

so any target below that requires two or more touches at different phases — a
composite pulse. The level's `δ` therefore sets the minimum number of touches
directly.

### 2.4 Straight runs and bent runs

The path of a touch is a circle about `n̂`. It is a **great** circle — the
straightest line available on the shell — exactly when `n̂ · r = 0`. Otherwise it
is a small circle: the run visibly corkscrews and cannot reach the antipode
however long the kick is held.

This condition depends on both `δ` and where Rabi currently stands, not on `δ`
alone. "Clean strike" is something the player learns to find by feel, the bend is
a direct readout of `n̂ · r`, and the fact that a bent run can never reach the far
side is the no-go constraint stated in a form a child can see.

### 2.5 Dephasing and the shrinking pitch

After each touch:

```
x' = x · exp(−t / T₂*)
y' = y · exp(−t / T₂*)
z' = z
```

`T₁` is omitted in v1 and this must be stated in the assumptions, not left
implicit.

Consequences that drive the game:

- Rotations preserve `R`; dephasing reduces it; nothing increases it. `R` is
  **non-increasing** and there is no undo.
- Dephasing touches only `x` and `y`, so nothing is lost at the poles and loss is
  fastest at the equator. Crossing the sphere costs purity; crossing it faster
  costs less. This is why π pulses are made short and why `T₂*` is the number
  experimentalists quote, and it arrives through the geometry rather than a
  caption.
- Since `|z| ≤ R`, the reachable range of the shot probability narrows as `R`
  falls: `P ∈ [(1−R)/2, (1+R)/2]`. As `R → 0`, `P → ½`. **A dead ball is a coin
  flip.** That is the correct picture of decoherence and it is also the failure
  mode the player feels.

### 2.6 The one honest approximation

Applying the dephasing envelope as a separate post-rotation step is not the exact
Lindblad solution during a drive: dephasing is defined about lab `z` while the
rotation is about the tilted `n̂`, and the two do not commute. It is exact on
resonance and in the weak-damping limit, and it is the same envelope already used
in `index_rabi.html`. The unitary part is exact; the damping is an approximation
of known form. Say so in the physics notes. Add the case to the QuTiP validation
script so the error is measured rather than asserted.

---

## 3. The run

### 3.1 Clock

A plain match clock ends the run. Not a purity threshold — dephasing does not
touch `z`, so a state parked at a pole would keep a perfect shot forever and the
run would never end. A clock is also the thing a player already understands from
every sport.

Three contributions to elapsed time:

1. **Touch duration** `t`.
2. **Plant-and-turn cost**, a fixed charge per touch. This is load-bearing. It
   stops the player subdividing into arbitrarily short touches and numerically
   recovering the continuous steering that the closed form forbids. It is also
   the anti-nausea mechanism: the phase change is animated as Rabi planting a
   foot and the world slewing, rather than the world snapping.
3. Nothing else. There is no map and no repositioning in this build.

### 3.2 Target

Each level names a **target probability** `P_target`, which fixes a target
latitude:

```
z_target = 1 − 2·P_target
```

The player is preparing a specified state and then verifying it by measurement.
That is calibration, which is what most of the day-to-day work on a real quantum
computer actually is.

Targets should use the whole sphere rather than only the far pole. Levels vary by
`(δ, P_target)`, which together set both the difficulty of the aim and the
minimum touch count.

### 3.3 Shooting

The player may shoot at any moment. There is no shooting spot. `t` is therefore
the player's choice throughout, which is what makes section 5 possible.

---

## 4. The shootout

### 4.1 Measurement, and why there are five replays

A shot is a projective measurement in the `z` basis. It goes in with probability

```
P = (1 − z) / 2
```

Measurement collapses the state, so the same prepared state cannot be shot twice.
To take five shots, the player's **entire control sequence is replayed from the
start five times**, each replay ending in one measurement.

This is not a workaround. It is exactly how a Rabi experiment is run: prepare,
drive, read out, repeat, and count. Building the shootout this way means the game
loop and the experimental loop are the same loop.

### 4.2 Five shots, and the granularity lesson

With `N = 5`, the only observable fractions are 0, 0.2, 0.4, 0.6, 0.8, 1.0. A
target of 0.7 **cannot be matched exactly**. This is a feature and levels should
be designed to expose it: choose targets that five shots cannot resolve.

**Overtime** is five more replays. At `N = 10` the resolution becomes 0.1 and the
target becomes reachable. The player discovers that more data buys resolution,
and that breaking a tie and shrinking an error bar are the same act.

Overtime is offered, not automatic, in two situations: a tied head-to-head, and
any run where the player asks for it.

### 4.3 Separating skill from luck

Randomness in a scored game feels unfair fast, so score the two layers
separately.

- **Aim score**, deterministic: how close the engineered `P` came to
  `P_target`. Skill maps onto this cleanly and it is the primary score.
- **Result**, statistical: the observed fraction from the shootout, displayed
  with an error bar of `√(P(1−P)/N)`.

Showing the error bar is what makes the relationship between the two legible
instead of arbitrary, and it teaches where the uncertainty comes from without a
lecture.

### 4.4 Seeding

Use a seeded PRNG, never `Math.random`. Three things depend on it: head-to-head
matches must be reproducible and shareable, ghost replay must be bit-identical,
and the coach inset must replay the run it recorded. Retrofitting this later is
painful.

---

## 5. The season chart

Every shootout contributes a point: total drive time on the horizontal axis,
observed goal fraction on the vertical, with its error bar.

Over repeated runs those points fill in the Rabi oscillation. Not a drawn curve —
a measured one, from the player's own shots. The shadow on the back wall has been
painting the ideal curve all along; the season chart is the same curve built from
data. That is the payoff the tool is named for.

One constraint on this: points fall on the clean single-touch Rabi curve only for
**single-touch, on-resonance** runs. Multi-touch runs at nonzero `δ` produce
legitimate scatter that does not lie on any simple curve. Render the two
populations distinguishably rather than mixing them, or the chart will look
wrong when it is in fact correct.

The gaps are visible and want filling, which is the collection mechanic.

---

## 6. Bots

The physics is closed form, so the opponent is a formula, not an AI. On
resonance, reaching a target `z` takes one touch of duration `arccos(z)/Ω₀`. A
bot run is solved algebraically in microseconds and then replayed as animation,
so there is no per-frame cost — which is what makes it viable on a phone.

**The bot obeys the same constraints as the player**: piecewise-constant touches,
the plant-and-turn cost, the same clock, the same dephasing. If the bot is
allowed to set the state directly or skip the per-touch cost, the head-to-head
teaches nothing, because the player is losing to a rule difference rather than to
worse play.

Three tiers, which are also the three ghosts:

1. **Personal best.** The player's own stored sequence. Cheapest and the one
   people actually replay against.
2. **Analytic optimal.** The closed-form best for the level. Defines par.
3. **The impatient one.** Deliberately over-detuned. Visibly turns faster than
   the player and still loses. This is the tier that demonstrates the
   speed-versus-usefulness tradeoff without the viewer reading anything.

A ghost is stored as its control sequence plus its seed, not as sampled
trajectory data. Replay is exact because the physics is deterministic. Ghosts are
small enough to fit in a URL fragment.

### 6.1 The bot is also the test harness

Run it headless, thousands of games, no rendering, and check that the observed
goal fraction converges to `(1 − z)/2` and that the spread matches
`√(P(1−P)/N)`. This validates the whole measurement layer against theory, which
is otherwise hard to test, and gives the QuTiP script a companion on the
statistics side. Same code, three uses: opponent, attract-mode demo, regression
test.

---

## 7. Theme and presentation

### 7.1 Camera

Player cam only. Rabi is held at the centre of frame, seen from behind, and the
world rotates around him.

This is a frame change, not a camera trick, and it is worth one line in the
physics notes. One precision: the simulation is already in the rotating frame —
that is what `δ` means. Player cam is a further change into a frame co-moving
with the state's trajectory. Related idea, different transformation; do not label
it "the rotating frame."

Lab cam and a full coach cam were considered and cut as unjustified expense.

### 7.2 Coach inset

A small wireframe sphere with a dot and a trail, in a corner. Its job is
navigation — player cam otherwise loses the player's sense of where anything is —
and it happens to also be the textbook Bloch picture, so a student who plays this
should recognise a Bloch sphere in a lecture.

It shows the sphere, Rabi's position, and his trail. **It does not show the
target.** Keeping the target out of the inset stops it absorbing the main view's
job.

On phone it is a corner thumbnail that expands on tap.

### 7.3 The shadow

A light to one side casts Rabi's shadow onto a back wall, and the shadow paints a
trace as the run advances.

This is exact, not decorative. The `z` component is the Rabi oscillation: on
resonance `z(t) = cos(Ω₀t)`, detuned
`z(t) = 1 − 2(Ω₀²/Ω²)sin²(Ωt/2)`, with the envelope decaying as `R` falls. The
shadow's height over time is the curve from every textbook. Students routinely
fail to connect the sphere picture to the oscillation plot; here the connection
is a shadow.

The shadow is a side silhouette, so it also carries all of Rabi's personality —
which is what makes the back-facing sprite affordable.

### 7.4 Sprites

Back views only. Five states, and no more for v1:

1. idle
2. dribble (two frames)
3. wind-up
4. kick
5. slump, triggered by low `R`

Everything expressive lives in the shadow silhouette, which is being rendered
anyway. The slump exists because low purity is the state the player most needs to
feel.

### 7.5 Controls and readouts

Controls, complete:

- **aim** — drag, sets `φ`
- **charge** — hold, sets `t`
- **release** — kick
- **shoot** — take the shootout

One finger or one mouse, identical on both platforms.

Readouts, complete:

- shadow trace
- current `P`
- shot count with error bar
- match clock
- coach inset

Anything beyond these lists needs a justification in the pull request.

### 7.6 Renderer

Hand-rolled. A sphere, a ball, a centred sprite and a shadow is
painter's-algorithm territory — a few hundred lines — and it preserves the
no-dependency, works-from-`file://` constraint that a CDN script tag would break.
Vendoring three.js into the repo was considered and rejected as disproportionate.

Because Rabi is always centred and always facing away, he never needs rendering
at an angle. The third-person choice makes the art cheaper, not dearer.

### 7.7 Vocabulary

touch, strike, bend, clean strike, dead ball, keeper, shootout, overtime, season.
Overtime rather than extra time: it is the term an American child uses.

---

## 8. Standalone and catalog

Every tool in this catalog is already a self-contained file, so standing alone
costs nothing extra. Belonging to the catalog means sharing the frame convention
(`+z` is `|0⟩`, pinned to the N–V bond axis) and the shared constants
(zero-field splitting 2.87 GHz, gyromagnetic ratio ≈ 28 MHz/mT), not sharing
code.

Default scale from `index_rabi.html`: `Ω₀ ≈ 6.0 MHz`, `T₂* ≈ 2.0 µs`. Run lengths
should sit within a few multiples of `T₂*` so the shrinking pitch is felt during
play.

---

## 9. What this teaches

Genuine, and each one is visible on screen rather than asserted:

- Single-qubit gates are rotations. A touch is a gate.
- Composite pulses. Bent runs cannot reach the far side; two touches can.
- Detuning costs you. Faster rotation, less useful transfer.
- Decoherence. The pitch shrinks, and a dead ball is a coin flip.
- Mixed states and the interior of the Bloch ball. The centre is no information.
- Measurement is probabilistic and destructive. One shot tells you almost
  nothing; the sequence must be replayed to shoot again.
- Statistics and shot noise. Five shots cannot resolve 0.7. Ten can.
- State preparation and verification — calibration, which is most of the real
  work.

---

## 10. Non-goals for v1

- No second qubit, no entanglement. Single-spin control throughout.
- No `T₁`, no repolarization. Both are v2 items with design consequences that
  need discussing first.
- No pylons, no field map, no terrain. Cut deliberately: the bend, the shrinking
  pitch and the clock are already a sufficient obstacle course, and they are made
  of physics rather than scenery.
- No lab cam, no full coach cam.
- No numerical integration, no Python at runtime, no build step.
- **Deferred:** a bot can fill the season chart far faster than a player can,
  which may undercut the collection mechanic. Authentic — automated sweeps are
  how the real experiment is run — but it needs an answer after the first pass.
