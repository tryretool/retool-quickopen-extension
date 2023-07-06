// https://developer.chrome.com/docs/extensions/mv3/content_scripts/
// This content script runs in the context of an open web page.
// It scans the DOM for any links to Retool apps, and modifies them
// to open in an existing Retool tab if one exists.

// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
// Establish a port with the service worker.
let port = chrome.runtime.connect({ name: "main-background-channel" });

// Ask the service worker for a list of open Retool tabs, to decide if the DOM should be modified.
// A service worker is needed because content scripts cannot query what tabs are open.
// https://developer.chrome.com/docs/extensions/reference/tabs/#overview
// setTimeout is needed to give the website time to load, so that the DOM can be modified when this query returns.
setTimeout(() => {
  ensurePortOpen();
  port.postMessage({ queryOpenRetoolTabs: true });
}, 5000);

port.onMessage.addListener(function (msg) {
  if (msg.openRetoolTabs) {
    const openTabs = JSON.parse(msg.openRetoolTabs);

    // If you wish to customize the selector for links to Retool apps, you can do so here.
    const retoolLinks = document.querySelectorAll("a[href*='retool']");
    retoolLinks.forEach((link) => {
      const retoolUrl = new URL(link.href);
      const retoolTab = openTabs.find((tab) => {
        const tabUrl = new URL(tab.url);
        return (
          tabUrl.hostname === retoolUrl.hostname &&
          tabUrl.pathname === retoolUrl.pathname
        );
      });
      if (retoolTab) {
        console.log("Retool Quickopen extension modifying a link:");
        console.log(link);
        link.addEventListener("click", (e) => {
          e.preventDefault();
          ensurePortOpen();

          // If you wish to customize navigaton URL, you can do so here.
          port.postMessage({ navigateToTab: retoolTab.id, url: link.href });
        });
      }
    });
  }
});

port.onDisconnect.addListener(function () {
  console.log("Retool Quickopen extension port disconnected.");
  port = null;
});

function ensurePortOpen() {
  if (!port) {
    console.log("Retool Quickopen extension re-opening a port.");
    port = chrome.runtime.connect({ name: "main-background-channel" });
  }
}
