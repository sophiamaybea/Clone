const APP_URL = "https://my-mind-clone.vercel.app/";

function openComposer(params) {
  const url = new URL(APP_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  chrome.tabs.create({ url: url.toString() });
}

async function saveActivePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/i.test(tab.url)) return;
  openComposer({ save: tab.url });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "mind-save-page",
      title: "Save page to my mind",
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: "mind-save-link",
      title: "Save link to my mind",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: "mind-save-selection",
      title: "Save selection to my mind",
      contexts: ["selection"],
    });
  });
});

chrome.action.onClicked.addListener(() => {
  void saveActivePage();
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "save-to-mind") void saveActivePage();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "mind-save-link" && info.linkUrl) {
    openComposer({ save: info.linkUrl });
    return;
  }
  if (info.menuItemId === "mind-save-selection" && info.selectionText) {
    const source = tab?.url ? `\n\nSource: ${tab.url}` : "";
    openComposer({ note: `${info.selectionText}${source}` });
    return;
  }
  if (info.menuItemId === "mind-save-page" && tab?.url) {
    openComposer({ save: tab.url });
  }
});
