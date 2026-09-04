# Mobile Typography Design

## Goal

Improve readability of the smallest mobile labels and metadata without making the whole interface oversized or changing the desktop type scale.

## Scope

- On layouts through 760px, raise only small metadata and labels that currently render at 9–10px.
- Target metric labels, drawer metadata, evidence/status metadata, map freshness/legend text, search-result metadata, and compact section labels.
- Keep headings, body paragraphs, primary buttons, map marker labels, and overall spacing unchanged.
- Use modest increases (generally +1px or +2px) and preserve existing line-height so Turkish text wraps predictably.

## Care points

- Larger metadata can increase drawer height and wrapping, so the existing one-page mobile scroll and 360px toolbar contracts must remain green.
- Do not use a global `body` font-size increase.
- Validate both English and Turkish selected-drawer content at 390px.

## Verification

- Add a rendered-style regression for the targeted selectors and assert that unambiguous primary text scales remain unchanged.
- Run Chromium/WebKit suites, headed mobile checks, static contracts, and whitespace validation.
