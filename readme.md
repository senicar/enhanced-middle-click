Enhanced Middle Click
=====================


## Actions

**Toggle tab position**

Tab position is not aware of tab open/close/move commands, so if you change tab order it will not follow the tab, it will still jump to the tab at the specified position.

When *position* number is bigger than the number of all tabs in current tab group (visible tabs) it will toggle the last tab. Otherwise it will jump to the tab at specified position. Usually this number is used to quickly toggle pined tabs.


**Save image**

This action is a bit special, since it is only available as *secondary* and *tertiary* action. This is because it saves image even if it is linked. Therefore it would not open link in a new tab when used as *primary* action, which is not an expected behaviour. However *secondary* and *tertiary* actions use modifier keys which means that user is aware of and expects a special behaviour.

In case you really want to use it as *primary* action you can set in [about:config](about:config). Search for `extensions.enhancedmiddleclick.primaryAction` and change its value to `saveImage` or `saveImageTo` for directory prompt.



## Custom scripts examples

Variable `aWindow` is available that gives access to the window dom element.

**Set current tab as *Toggle tab position***
```
Services.prefs.getBranch("extensions.enhancedmiddleclick.").setIntPref("favTabPosition",aWindow.gBrowser.visibleTabs.indexOf(aWindow.gBrowser.tabContainer.selectedItem));
```

**Focus urlBar**
```
aWindow.document.getElementById("urlbar").focus();
```

**Go Back**
```
if(aWindow.gBrowser.canGoBack) { aWindow.gBrowser.goBack(); }
```

**Go Forward**
```
if(aWindow.gBrowser.canGoForward) { aWindow.gBrowser.goForward(); }
```

**Reload**
```
aWindow.gBrowser.reload();
```

**Undo close tab**
```
aWindow.undoCloseTab(0);
```

**Remove current tab**
```
aWindow.gBrowser.removeCurrentTab({animate: true, byMouse: false});
```

**Search selection**
```
let selection = aWindow.getBrowserSelection(); if( selection.length > 0 ) { aWindow.BrowserSearch.loadSearchFromContext(selection); }
```
