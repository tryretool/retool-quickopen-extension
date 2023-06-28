// https://developer.chrome.com/docs/extensions/mv3/content_scripts/
// This content script runs in the context of an open web page.
// It scans the DOM for any links to Retool apps, and modifies them
// to open in an existing Retool tab if one exists.

// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
// Establish a port with the service worker.
const port = chrome.runtime.connect({ name: "main-background-channel" });

// Ask the service worker for a list of open Retool tabs, to decide if the DOM should be modified.
// A service worker is needed because content scripts cannot query what tabs are open.
// https://developer.chrome.com/docs/extensions/reference/tabs/#overview
// setTimeout is needed to give the website time to load, so that the DOM can be modified when this query returns.
setTimeout(() => {
  port.postMessage({ queryOpenRetoolTabs: true });
}, 3000);

// TODO: This port shuts down after a while, figure out how to keep it alive.
port.onMessage.addListener(function (msg) {
  if (msg.openRetoolTabs) {
    const openTabs = JSON.parse(msg.openRetoolTabs);
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
        console.log("Retool quickopen extension modifying a link");
        console.log(link);
        link.addEventListener("click", (e) => {
          e.preventDefault();
          port.postMessage({ navigateToTab: retoolTab.id, url: link.href });
        });
      }
    });
  }
});
