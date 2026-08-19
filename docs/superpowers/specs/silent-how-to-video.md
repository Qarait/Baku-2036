# Silent Website Walkthrough

## Approved scope

Add a small attachment-style link to the existing How-to section. Clicking it opens a dedicated page containing a short, silent screen recording of the website interaction flow.

## Video behavior

- The recording shows only how to operate the website: search/select a place, open the selected-place details, reveal the details, and return to the map tools.
- No narration, captions, subtitles, explanatory overlays, or investment commentary are included in the video.
- The recording target is 18–20 seconds and must not exceed 20 seconds.
- The existing written How-to steps remain on the main page as the explanatory fallback.

## Page behavior

- The attachment opens `how-to.html` in a new tab.
- The page has native video controls, `playsinline`, and no autoplay.
- English and Turkish page copy follow the selected language.
- The page and video must work from the repository root and the existing `/en/` and `/tr/` fixed-language entry points under a GitHub Pages subpath.

## Constraints

- Preserve all existing uncommitted mobile-panel and attribution-copy changes.
- Do not change the map data, formulas, scenario values, or existing written How-to steps.
- Keep the feature in the preview worktree; do not deploy as part of this change.
