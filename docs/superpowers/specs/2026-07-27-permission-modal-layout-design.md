# Personnel Permission Modal Layout Design

## Problem

The personnel permission editor uses a fixed 1120px modal and lets the full form determine the modal height. On a 1263x720 viewport, the content extends below the viewport and the 1060px grant table can widen the modal or page. Form controls inside grid and flex layouts also lack explicit shrink constraints.

## Approved Behavior

- Keep the desktop modal capped at 1120px while preserving 16px viewport margins on narrower screens.
- Keep the modal title and close control visible while the modal body scrolls vertically.
- Prevent the modal and page from scrolling horizontally.
- Keep wide-screen form sections in two columns and collapse them to one column below the existing 980px breakpoint.
- Allow the role selector and save button row to wrap without clipping either control.
- Confine the grant table's 1060px horizontal scroll area to a dedicated table container.
- Preserve all permission data loading, role assignment, preview, save, and revoke behavior.

## Structure

The existing Ant Design Vue modal receives a dedicated `permission-config-modal` wrap class and a CSS `min()` width. Global selectors scoped by that wrap class turn the modal content into a bounded flex column: the header remains fixed and the body becomes the only vertical scrolling region. The grant table is wrapped in `grant-table-scroll`, which owns horizontal overflow.

The existing form layout remains intact. Shrink constraints are added to the editor, form items, grid children, and select containers. The role row is allowed to wrap, while the existing 980px media query continues to switch multi-column content to a single column.

## Verification

An automated source contract locks the modal class, responsive width, viewport-bound content, body scrolling, shrink constraints, role-row wrapping, and table overflow ownership. The full contract suite, type checker, and production build must pass. Browser verification covers 1263x720, 1024x768, and 1440x900, checking viewport containment, page horizontal overflow, modal-body scrolling, and access to the bottom of the form.
