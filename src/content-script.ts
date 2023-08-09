// https://developer.chrome.com/docs/extensions/mv3/content_scripts/
// This content script runs in the context of an open web page.
// It scans the DOM for any links to Retool apps, and modifies them
// to open in an existing Retool tab if one exists.

// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
// Establish a port with the service worker.
let port = chrome.runtime.connect({ name: "main-background-channel" });
let portOpen = true;

// Ask the service worker for a list of open Retool tabs, to decide if the DOM should be modified.
// A service worker is needed because content scripts cannot access chrome.tabs API.
// https://developer.chrome.com/docs/extensions/reference/tabs/#overview
// setTimeout is needed to give the website time to load, so that the DOM can be modified when this query returns.
setTimeout(() => {
  ensurePortOpen();
  port.postMessage({ queryOpenRetoolTabs: true });
}, 5000);

port.onMessage.addListener(function (msg) {
  if (msg.openRetoolTabs) {
    const openTabs = JSON.parse(msg.openRetoolTabs);

    // Support for <a href="*retool*"> links.
    const retoolLinks = document.querySelectorAll("a[href*='retool']");
    retoolLinks.forEach((link) => {
      //@ts-ignore b/c we know link.href is defined.
      const retoolTab = firstRetoolTabMatchingURL(openTabs, new URL(link.href));
      if (retoolTab) {
        console.log("Retool Quickopen extension modifying a link:");
        console.log(link);
        link.addEventListener("click", (e) => {
          e.preventDefault();
          ensurePortOpen();

          //@ts-ignore b/c we know link.href is defined.
          port.postMessage({ navigateToTab: retoolTab.id, url: link.href });
        });
      }
    });

    // Support for <button data-action-url="*retool*"> buttons.
    // This is what Intercom buttons look like.
    const retoolButtons = document.querySelectorAll(
      "button[data-action-url*='retool']"
    );
    retoolButtons.forEach((button) => {
      const buttonURL = button.getAttribute("data-action-url")!; // ! is safe because we filtered for buttons with data-action-url.
      const retoolTab = firstRetoolTabMatchingURL(openTabs, new URL(buttonURL));
      if (retoolTab) {
        console.log("Retool Quickopen extension modifying a button:");
        console.log(button);
        button.addEventListener("click", (e) => {
          ensurePortOpen();
          port.postMessage({ navigateToTab: retoolTab.id, url: buttonURL });
        });
        button.removeAttribute("data-action-url");
      }
    });
  }
});

port.onDisconnect.addListener(function () {
  console.log("Retool Quickopen extension port disconnected.");
  portOpen = false;
});

function ensurePortOpen() {
  if (!portOpen) {
    console.log("Retool Quickopen extension re-opening a port.");
    port = chrome.runtime.connect({ name: "main-background-channel" });
    portOpen = true;
  }
}

function firstRetoolTabMatchingURL(openTabs: chrome.tabs.Tab[], url: URL) {
  return openTabs.find((tab) => {
    const tabUrl = new URL(tab.url ? tab.url : "");
    return tabUrl.hostname === url.hostname && tabUrl.pathname === url.pathname;
  });
}
