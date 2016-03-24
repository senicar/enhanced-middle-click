Enhanced Middle Click
=====================


# Options


### Custom script

Variable `aWindow` is available that gives access to the window dom element.

**Set current tab as *Toggle tab position**

    Services.prefs.getBranch("extensions.enhancedmiddleclick.").setIntPref("favTabPosition",aWindow.gBrowser.visibleTabs.indexOf(aWindow.gBrowser.tabContainer.selectedItem));

**Dispatch a KEY press**

[Key code reference](http://mxr.mozilla.org/mozilla-central/source/dom/interfaces/events/nsIDOMKeyEvent.idl) & [initKeyEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/initKeyEvent)

Toggle Web Developer Tools

    let evt = aWindow.document.createEvent('KeyboardEvent');
    evt.initKeyEvent("keydown", true, true, aWindow, false, false, false, false, evt.DOM_VK_F12, 0);
    aWindow.document.dispatchEvent(evt);

    evt = aWindow.document.createEvent('KeyboardEvent');

    evt.initKeyEvent("keypress", true, true, aWindow, false, false, false, false, evt.DOM_VK_F12, 0);
    aWindow.document.dispatchEvent(evt);

    evt = aWindow.document.createEvent('KeyboardEvent');
    evt.initKeyEvent("keyup", true, true, aWindow, false, false, false, false, evt.DOM_VK_F12, 0);
    aWindow.document.dispatchEvent(evt);

**Focus urlBar**

    aWindow.document.getElementById("urlbar").focus();

**Go Back**

    if(aWindow.gBrowser.canGoBack) { aWindow.gBrowser.goBack(); }

**Go Forward**

    if(aWindow.gBrowser.canGoForward) { aWindow.gBrowser.goForward(); }

**Reload**

    aWindow.gBrowser.reload();

**Undo close tab**

    aWindow.undoCloseTab(0);

**Remove current tab**

    aWindow.gBrowser.removeCurrentTab({animate: true, byMouse: false});

**Search selection**

    let selection = aWindow.getBrowserSelection(); if( selection.length > 0 ) { aWindow.BrowserSearch.loadSearchFromContext(selection); }



### Toggle tab position

When *position* number is bigger than the number of all tabs in current tab group (visible tabs) it will toggle the last tab. Otherwise it will jump to the tab at specified position. Usually this number is used to quickly toggle pined tabs.



