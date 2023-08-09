// https://developer.chrome.com/docs/extensions/mv3/content_scripts/
// This content script runs in the context of an open web page.
// It scans the DOM for any links to Retool apps, and modifies them
// to open in an existing Retool tab if one exists.

// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
// Establish a port with the service worker.
// A service worker is needed because content scripts cannot access chrome.tabs API.
// https://developer.chrome.com/docs/extensions/reference/tabs/#overview
let port = chrome.runtime.connect({ name: "main-background-channel" });
let portOpen = true;

// These are messages that service worker can send to content script.
type UpdateDOMWithOpenRetoolTabs = {
  type: "UPDATE_DOM_WITH_OPEN_RETOOL_TABS";
  openRetoolTabs: string;
};

// Ask the service worker for a list of open Retool tabs, to decide if the DOM should be modified.
setInterval(() => {
  if (DOMContainsRetoolLink()) {
    ensurePortOpen();
    port.postMessage({
      type: "GET_OPEN_RETOOL_TABS",
    });
  }
}, 5000);

// Used as a cache key to avoid unnecessary DOM modifications.
let openRetoolTabsIDSum: number = 0;

port.onMessage.addListener(function (msg: UpdateDOMWithOpenRetoolTabs) {
  if (msg.type === "UPDATE_DOM_WITH_OPEN_RETOOL_TABS") {
    const openTabs: chrome.tabs.Tab[] = JSON.parse(msg.openRetoolTabs);

    // If the list of open Retool tabs hasn't changed, don't do anything.
    const openTabsIDSum = openTabs.reduce((acc, tab) => acc + tab.id!, 0);
    if (openRetoolTabsIDSum === openTabsIDSum) {
      return;
    }
    openRetoolTabsIDSum = openTabsIDSum;

    // Modify <a href="*retool*"> links.
    const retoolLinks = document.querySelectorAll("a[href*='retool']");
    retoolLinks.forEach((link) => {
      //@ts-ignore b/c we know link.href is defined.
      const retoolTab = firstRetoolTabMatchingURL(openTabs, new URL(link.href));
      if (retoolTab) {
        //@ts-ignore
        interceptElementNavigation(link, retoolTab.id!, link.href);
      }
    });

    // Modify <button data-action-url="*retool*"> buttons.
    // This is what Intercom buttons look like.
    const retoolButtons = [
      ...document.querySelectorAll("button[data-action-url*='retool']"),
      ...document.querySelectorAll("button[hidden-url*='retool']"),
    ];
    retoolButtons.forEach((button) => {
      const buttonURL =
        button.getAttribute("data-action-url") ||
        button.getAttribute("hidden-url");
      const retoolTab = firstRetoolTabMatchingURL(
        openTabs,
        new URL(buttonURL!)
      );
      if (retoolTab) {
        // Button cleanup
        button.removeAttribute("data-action-url");
        button.setAttribute("hidden-url", buttonURL!);
        interceptElementNavigation(button, retoolTab.id!, buttonURL!);
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

function interceptElementNavigation(
  element: Element,
  tabId: number,
  url: string
) {
  console.log("Retool Quickopen extension modifying an element:");
  console.log(element);

  // Remove old event listeners.
  const newElement = element.cloneNode(true);
  element.parentNode!.replaceChild(newElement, element);

  // Add new event listener.
  newElement.addEventListener("click", (e) => {
    e.preventDefault();
    ensurePortOpen();

    const payload: NavigateToTab = {
      type: "NAVIGATE_TO_TAB",
      tabId: tabId,
      url,
    };
    port.postMessage(payload);
  });
}

function DOMContainsRetoolLink(): boolean {
  return (
    [
      ...document.querySelectorAll("a[href*='retool']"),
      ...document.querySelectorAll("button[data-action-url*='retool']"),
      ...document.querySelectorAll("button[hidden-url*='retool']"),
    ].length > 0
  );
}
