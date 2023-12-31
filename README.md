# Retool Quickopen Extension

![Image depicting a user clicking a zendesk link and a Retool tab opening](https://i.ibb.co/bbHf6KR/Screenshot-2023-07-07-at-10-44-04-AM.png)

A Chrome extension to enable tab re-use of Retool. Inspired by a [similar extension](https://chrome.google.com/webstore/detail/zendesk-quicktab/moiloihigegdbekeabannnkibekfnekf) for Zendesk.

This extension is very basic and easy to customize for your use case:

1. `src/content-script.ts` runs in the context of a web page. It scans the DOM for links to Retool, and modifies their click listener.
2. `src/service-worker.ts` provides access to `chrome.tabs` APIs. This provides access to metadata on which tabs are open, and handles tab navigation.

## Install from Chrome Web Store

https://chrome.google.com/webstore/detail/retool-quick-open/ceealkjinhcgoihffmapmhdopljdbmco

## Install from source

1. `git clone https://github.com/tryretool/retool-quickopen-extension.git`
2. `cd retool-quickopen-extension`
3. `npm i && npm build`
4. https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked

## Release Process (For Retool Employees)

1. `npm run build`
2. Zip up dist/, icons/, manifest.json, popup.html, README.md
3. Upload to Chrome Web Store (use retoolquickopen@gmail.com credentials in 1password)
