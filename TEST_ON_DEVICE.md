# TEST_ON_DEVICE.md

Manual QA checklist for functionality that requires a real native runtime (camera,
signature WebView, PDF rendering, native share sheet, actual device restart) and could
not be executed inside the sandbox that built this codebase. Check every box on at least
one Android device and one iOS device before shipping.

## Fresh Install

- [ ] App installs and launches without crashing
- [ ] Onboarding shows exactly 3 slides, "Skip" works, "Set Up My Company" advances
- [ ] Company setup form accepts input and saves without error
- [ ] After saving company setup, app lands on Home with a sample job visible

## Jobs

- [ ] Create a job with all fields filled
- [ ] Create a job with only the required name field
- [ ] Edit an existing job and confirm changes persist after navigating away and back
- [ ] Archive a job with no open change orders (no warning shown)
- [ ] Archive a job with an open (unpaid) change order (warning message appears)
- [ ] Archived job disappears from the default Jobs list

## New Extra — Full Wizard

- [ ] Choose an existing job from "Recently used"
- [ ] Search for a job by name/customer and select it
- [ ] Create a brand-new job from inside the wizard and confirm it's auto-selected and the
      wizard continues to Step 2
- [ ] Leave Extra Work Title empty and confirm validation blocks continuing
- [ ] Add multiple labour lines
- [ ] Add multiple material lines
- [ ] Add equipment and subcontractor lines
- [ ] Apply percent markup and confirm the total updates live
- [ ] Apply fixed markup and confirm the total updates live
- [ ] Apply a discount and confirm it never makes the total negative
- [ ] Enable tax with a custom label (e.g. "HST") and percentage
- [ ] Navigate back a step and confirm all entered data is still present
- [ ] Navigate forward again and confirm data is still present

## Camera

- [ ] Grant camera permission and take a photo — appears in the photo list
- [ ] Deny camera permission — app shows a clear message and does not crash
- [ ] Take multiple photos in sequence

## Photo Library

- [ ] Choose one existing photo
- [ ] Choose multiple existing photos in one picker session
- [ ] Deny photo library permission — app shows a clear message and does not crash

## Photo Management

- [ ] Remove a photo from the list
- [ ] Reorder photos using Up/Down and confirm the new order is reflected in Review and in
      the generated PDF
- [ ] Add a caption to a photo and confirm it appears under the photo in the PDF

## Signature

- [ ] Draw a signature and tap "Approve Change Order" — success screen shows
- [ ] Tap "Clear Signature" before approving — pad clears, nothing is saved
- [ ] Try to approve with an empty signature — blocked with a message
- [ ] Try to approve with no approver name — blocked with a validation message
- [ ] Force-close and reopen the app; confirm the signature image still renders on the
      change order detail screen and inside a freshly generated PDF

## PDF Generation

- [ ] Generate a PDF for a change order with **no photos**
- [ ] Generate a PDF with **one photo**
- [ ] Generate a PDF with **many photos** (5+) and confirm layout doesn't break
- [ ] Generate a PDF with a very long description (several paragraphs) and confirm it
      wraps correctly and does not overlap other content
- [ ] Confirm a long change order correctly flows onto a **second page**
- [ ] Generate a PDF **before** approval — "PENDING APPROVAL" is clearly shown
- [ ] Generate a PDF **after** approval — signature, approver name/company/title, and
      approval timestamp all appear correctly
- [ ] Generate a PDF with a company **logo** set
- [ ] Generate a PDF with **no logo** set — layout still looks correct
- [ ] Generate a PDF in **CAD** with HST
- [ ] Generate a PDF in **USD** with sales tax
- [ ] Confirm the PDF filename matches the pattern `CO-0008-Smith-Residence-742.50.pdf`
      with special characters stripped from job/company names

## Sharing

- [ ] Share a generated PDF via Email
- [ ] Share a generated PDF via a messaging app (WhatsApp, Messages, etc.)
- [ ] Save the PDF to Files / Drive where supported by the OS share sheet
- [ ] Cancel the share sheet without sending — app returns to a normal state, no crash

## Offline Mode

- [ ] Turn on Airplane Mode
- [ ] Create a new job while offline
- [ ] Create a new extra (full wizard) while offline
- [ ] Capture a signature while offline
- [ ] Generate a PDF while offline
- [ ] Confirm none of the above requires network access to complete

## Persistence

- [ ] Force-close the app (swipe away from the app switcher)
- [ ] Reopen the app and confirm all jobs, change orders, photos, signatures, and company
      settings are still present exactly as left
- [ ] Confirm the dashboard totals match what they were before force-close

## Status Flow

- [ ] Draft → Sent (via "Mark Sent")
- [ ] Sent → Approved (via "Get Approval")
- [ ] Approved → Paid (via "Mark Paid", with a payment note)
- [ ] Draft → Approved directly (signed in person without ever marking "Sent")
- [ ] Confirm a Paid change order cannot be silently edited back to Draft/Sent/Approved

## Revision Protection

- [ ] Approve a change order, then attempt to edit its pricing
- [ ] Confirm the app warns before allowing the edit and offers "Create Revision"
- [ ] Confirm the revision is numbered correctly (e.g. `CO-0018-R1`)
- [ ] Confirm the **original approved change order is untouched** — same total, same
      signature, same approval timestamp
- [ ] Confirm the dashboard does not double-count the original and the revision as two
      separate outstanding balances

## Device Sizes

- [ ] Small Android phone (e.g. ~5.5")
- [ ] Large Android phone / phablet
- [ ] iPhone (any recent model available)
- [ ] Confirm large dollar totals (6+ figures) don't overflow their card on any size

## Android Back Button

- [ ] Hardware back button during onboarding
- [ ] Hardware back button mid-way through the New Extra wizard (should go to the
      previous step, not silently exit and discard everything)
- [ ] Hardware back button while the Mark Paid modal is open (should close the modal, not
      the whole screen)
- [ ] Hardware back button on the Approval success screen

## iOS Safe Areas

- [ ] Notch/Dynamic Island devices — header content not obscured
- [ ] Home indicator area — bottom buttons not obscured or unreachable
- [ ] Keyboard does not cover the field currently being edited in any form

## Error Scenarios

- [ ] Kill the app mid-way through PDF generation (if possible) and reopen — no corrupted
      state, change order still exists as a draft/sent record
- [ ] Attempt to open a change order whose photo file was deleted outside the app (e.g. via
      a file manager) — app shows a broken-image state gracefully, does not crash
- [ ] Fill a money field with garbage text (letters, symbols) — treated as zero/invalid,
      never crashes, never produces `NaN` in the UI or PDF
