# my mind capture extension

This is the first installable capture companion for the reconstructed visual-memory app.

## Install unpacked

1. Download or clone this repository.
2. Open `chrome://extensions` (or the equivalent Chromium extensions page).
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select this `extension/` directory.

The toolbar button, `Cmd/Ctrl + Shift + Y`, and context-menu actions open the deployed app with the current page, link, or selected text pre-filled.

The app remains responsible for authentication and persistence. The extension does not store Supabase credentials or copy browser cookies.
