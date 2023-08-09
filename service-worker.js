// https://developer.chrome.com/docs/extensions/mv3/service_workers/
// This is a chrome extension service worker, it has some similarities to a web service worker.
// It cannot access the DOM, it can access the chrome.tabs API.
// The purpose of this worker is to give content-script.js access to the chrome.tabs API.

// https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === "main-background-channel");

  port.onMessage.addListener(function (msg) {
    console.log("Retool Quickopen service worked received a message:");
    console.log(msg);

    // Content script is asking for a list of open Retool tabs.
    if (msg.queryOpenRetoolTabs) {
      chrome.tabs.query({ url: "<all_urls>" }, function (tabs) {
        console.log(tabs);
        tabs = tabs.filter((tab) => tab.url.includes("retool"));
        port.postMessage({ openRetoolTabs: JSON.stringify(tabs) });
      });
    }

    // Content script is asking to navigate to a different tab.
    if (msg.navigateToTab) {
      chrome.tabs.update(parseInt(msg.navigateToTab), {
        url: msg.url,
      });
      chrome.tabs.update(parseInt(msg.navigateToTab), {
        active: true,
      });
    }
  });
});
