Enhanced Middle Click
=====================


= Options =


== Custom script ==

Variable `aWindow` is available that gives access to the window dom element.

=== Examples ===

** Set current tab as a setting for *Toggle tab position* **

```
Services.prefs.getBranch("extensions.enhancedmiddleclick.").setIntPref("favTabPosition",aWindow.gBrowser.visibleTabs.indexOf(aWindow.gBrowser.tabContainer.selectedItem));
```



== Toggle tab position ==

When *position* number is bigger than the number of all tabs in current tab group (visible tabs) it will toggle the last tab. Other wise it will jump to the tab at specified position. Usually this number is used to quickly toggle pined tabs.



