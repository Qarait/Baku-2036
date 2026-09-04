# Real iPhone Safari Promotion Check

Preview URL: https://qarait.github.io/Baku-2036/preview/

Run this on one physical iPhone in Safari before promoting preview to live. Record the iPhone model, iOS version, Safari version, date, and any failure.

## Portrait

- [ ] Open the preview URL in Safari with a cache-busting reload.
- [ ] Confirm the top bar, search, and language controls are below the Dynamic Island/notch.
- [ ] Confirm the map toolbar and right drawer do not touch rounded screen corners.
- [ ] Tap a map circle; confirm the identification drawer opens.
- [ ] Collapse, reopen, and close the drawer.
- [ ] Switch EN → TR → EN while a drawer is selected.
- [ ] Open Layers and tap each visible layer control.
- [ ] Search for a place and dismiss the keyboard; confirm the page does not jump or clip.
- [ ] Scroll the selected drawer to Clear selection and confirm it remains reachable.
- [ ] Confirm the bottom story/status content stays above the home indicator.

## Landscape

- [ ] Rotate the same device to landscape.
- [ ] Confirm left/right map controls stay inside the safe area and are not under the camera housing.
- [ ] Pan, pinch/zoom, and tap the map without the page horizontally scrolling.
- [ ] Open/close Layers and the identification drawer.
- [ ] Rotate back to portrait and confirm the layout recovers without a reload.

## Release decision

- [ ] No clipped or unreachable controls.
- [ ] No horizontal page scroll caused by the layout.
- [ ] No Safari console/runtime error observed through Web Inspector, if available.
- [ ] Result: PASS / FAIL
