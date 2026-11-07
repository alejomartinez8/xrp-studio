# 007 — Automated testing

Checks that run by themselves and catch problems before a change reaches a classroom. This spec is
the plan: each part is a goal of its own, delivered in its own change, and its section is filled in
(files, results) when it is done. Parts marked **Planned** are not built yet.

## Levels

- **Unit tests** check one function or component on its own, without a browser window (for
  example, how "Keep me signed in" changes the stored session).
- **Integration tests** check several pieces together (for example, a block program and the
  Python it produces).
- **End-to-end tests** open the whole app in a real browser and use it the way a person does:
  clicking, typing, reloading. The first ones test accounts and sync against a fake Google
  ([005, part 3](005-accounts-and-sync.md#part-3--testing-accounts-and-sync-without-google)).

None of them replaces a manual check with a real robot and a real Google account before a
release; each part says what it leaves out.

## Principles

- **Deterministic:** the same app gives the same result every run. No test depends on the internet,
  a real account, a robot or an AI model while it runs.
- **Fakes live in the tests:** fake Google, fake robot and similar helpers exist only in the test
  run, never in the app, so no build can contain them.
- **Every language:** checks that involve text run in every language the app offers, not only
  English and Spanish, so a new language is tested as soon as it is added.
- **Readable failures:** a failing check shows what the screen looked like, step by step, so
  anyone can see the problem without running it again.

## Part 1 — Visual regression (Planned)

### Problem

The app is very visual: block colours, the toolbox, the light and dark themes, rounded panels,
the phone and tablet layouts. A small change in a style can break how they look without breaking
any behaviour test, and nobody notices until a class sees it.

### Solution

Screenshots of key screens compared with approved reference images. A difference beyond a small
tolerance fails the check and shows the expected image, the new one and the difference. When a
change is meant to alter the look, the reviewer approves the new images in the same change.

Screens: the welcome screen; the block editor with one block of each toolbox category; the
toolbox open, with search and the Advanced group; the Python editor; the settings menu; the phone
menu. Each in light and dark, at desktop, tablet and phone sizes. Screenshots use the English UI;
other languages are covered by Part 5.

### Not covered

How the app looks in browsers other than Chrome and Edge (Web Serial only exists there).

### Upstream

The approach could be offered to XRPWeb; the reference images are fork-specific.

## Part 2 — Blocks to Python (Planned)

### Problem

The Python sent to the robot comes from the blocks. A mistake in a block definition or the
generator produces wrong code silently: the program looks right in the editor but the robot does
something else.

### Solution

A set of example block programs (driving, turning, sensors, loops, functions, variables) with the
exact Python each one must produce. A change that alters the generated code fails the check
unless the expected code is updated on purpose. The same programs are generated in every
language: the Python must be identical in all of them (blocks change language, code does not).

### Not covered

Whether the code does the right thing on the robot; that is Part 3 and a real robot.

### Upstream

Possible: the examples and checks apply to XRPWeb's blocks as they are.

## Part 3 — Fake robot (Planned)

### Problem

Connect, Run, Stop, the terminal, robot memory and firmware updates can only be tried with an XRP
robot plugged in. Behaviour with a robot connected was designed from the code and still needs
testing (see [004](004-file-management.md)).

### Solution

A fake robot for the end-to-end tests, like the fake Google: it answers the USB connection and the
MicroPython prompt the way an XRP does, keeps a small file system in memory and records what it
was sent. Tests then check, in the app's own words: connecting and disconnecting, Run copying the
program and starting it, Stop, the terminal output, saving to robot memory, and the robot being
unplugged in the middle of a run.

### Not covered

Real motors and sensors, Bluetooth timing, firmware flashing on a real board.

### Upstream

Possible: XRPWeb has the same connection code.

## Part 4 — Accessibility (Planned)

### Problem

The users are kids, some using a tablet, a keyboard or a screen reader. Low contrast, buttons
without names or controls that cannot be reached with the keyboard make the app harder for them,
and are easy to introduce without noticing.

### Solution

An automatic accessibility check (WCAG 2.1 AA rules: contrast, names of buttons and fields,
headings, roles) on the same key screens as Part 1, in light and dark. A few keyboard-only paths:
create a project, open the settings menu, change the language. Element ids must be unique on every
screen.

### Not covered

What only a person can judge: whether the wording is clear for a child, whether the screen reader
experience is pleasant.

### Upstream

Fixes found are usually small and can be offered to XRPWeb.

## Part 5 — Languages and screen sizes (Planned)

### Problem

Text that is missing in a language, left in English by mistake or longer than the English one
breaks the screen: cut-off buttons, overlapping labels, menus wider than a phone. Today this is
only checked by hand in Spanish.

### Solution

Checks that run for every language the app offers, read from the app's own language list, so a new
language is covered without writing new tests:

- **Complete translations:** every text in the app and the blocks exists in each language; a
  missing one fails and names it. Texts identical to English are listed for review (some, like
  "XRP", are meant to stay).
- **No hard-coded text:** a test language that replaces every translated text with a marker shows
  any text on screen that does not go through the translations.
- **Long text:** a test language with every text about 40% longer (as German or Portuguese often
  are) checks that buttons, menus and the toolbox still fit at desktop, tablet and phone sizes.
- **Language switch:** changing the language from the settings menu updates the menus, the blocks
  and the welcome screen at once, and is remembered after a reload.
- **Blocks:** the toolbox and blocks show in the chosen language, and Part 2 checks that the
  Python stays the same.

Right-to-left languages are not offered yet; when one is, this part adds a check that the layout
mirrors correctly.

### Not covered

Translation quality: a correct but awkward sentence still needs a native speaker.

### Upstream

Possible: XRPWeb offers several languages too.

## Reports

- Every run produces a report page: each check with its steps, screenshots and, when it fails, a
  recording that can be followed step by step with what the page showed, its network requests and
  its console. Failing runs on pull requests attach this report.
- Visual differences (Part 1) are shown side by side and overlaid, so a reviewer can tell a real
  break from an intended change.
- Later, a hosted visual review service could show the differences directly in the pull request
  and record who approved them. Not needed to start.

## Writing tests with AI agents

AI agents can drive a browser, explore the app, write new tests and repair tests broken by an
intended change. They help write and maintain the tests; the tests they write are ordinary,
deterministic checks reviewed like any other change. No check asks an AI model what to do while
it runs, because the result could change from one run to the next.
