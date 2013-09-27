/*******************************************************************************
*
*  Extension: Enhanced Middle Click
*  Author: senicar
*
*  Thanks to: 
*  ttaubert ( #fx-team )
*  mfinkle ( #extdev )
*  gMinus (Tab History Menu)
*  keremonal (Middle Click To Go Back)
* 
*******************************************************************************/

// TODO: Comment and code cleanup, remove unused parts

// ************************************************************************** //
// XPCOM

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;

// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Services.jsm
// Gives access to prefs, console, cookies...
Cu.import("resource://gre/modules/Services.jsm");





// ************************************************************************** //
// Constants


// vim search and replace for more speed
// %s/\(.\)\/\/emclogger/\emclogger/gc
// %s/\temclogger/\\t/\/emclogger/gc
const DBG_EMC = true;
const BRANCH = Services.prefs.getBranch("extensions.enhancedmiddleclick.");
const DEFAULT_PREFS = {
	// deprecated: toggleDownloadsSidebar
	// available actions:
	// historyMenu, tabsMenu, tabsGroupsMenu,
	// toggleBookmarksSidebar, toggleHistorySidebar, toggleTabView
	// disable
	primaryAction: "historyMenu",
	secondaryAction: "disable",
	refreshOnTabClose: false,
	displayGroupName: false,
	autoscrolling: false
};

var emc_browser_delayed = false;


// Default preferences for bootstrap extensions are registered dynamically.
// no need for default/preferences/prefs.js
function setDefaultPrefs(reset) {
	// http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%E2%80%93-default-preferences/

	//emclogger("setting defaults");

	for(let [key, val] in Iterator(DEFAULT_PREFS)) {
		switch (typeof val) {
			case "boolean":
				if( !BRANCH.prefHasUserValue(key) || reset == true)
					BRANCH.setBoolPref(key, val);
				break;
			case "number":
				if( !BRANCH.prefHasUserValue(key) || reset == true)
					BRANCH.setIntPref(key, val);
				break;
			case "string":
				if( !BRANCH.prefHasUserValue(key) || reset == true)
					BRANCH.setCharPref(key, val);
				break;
		}
	}
}





// ************************************************************************** //
// Main EMC functions


/**
 * It's responible for proper output of debug messages to error console
 */
var emclogger = function(msg)
{
	if(DBG_EMC) {
		Services.console.logStringMessage("enhancedmiddleclick: " + msg);
	}
}


/**
 * It is called by addEventListener when click event is triggered
 */
var clicker = function(e) {
	//emclogger("clicker");
	let aWindow = this.window;

	// accept only middle click on a valid area thus the enhanced-middle-click
	if( areaValidator(e, aWindow) && e.button === 1 ) {
		// e.cancelBubble = true;
		e.stopPropagation();
		//emclogger("area accepted");

		runAction(e, aWindow);
	} else return false;
};


/**
 * Validates clicked areas if they are valid, have no interaction.
 * It validates only on empty page areas, at least it tries
 */
var areaValidator = function(e, aWindow)
{
	let t = e.target;
	//emclogger(t);
	//emclogger(aWindow.HTMLElement);

	// by default disable all target areas
	let disallow = {};
	let allow = {};

	disallow.html = false;
	disallow.xul = false;
	allow.html = false;
	allow.xul = false;

	// bootstrap is not loaded into a window thats why HTMLElements
	// cannot be directly accessed, again we have to use window
	// https://developer.mozilla.org/en-US/docs/Gecko_DOM_Reference
	if( t instanceof aWindow.HTMLInputElement ||
		t instanceof aWindow.HTMLAnchorElement ||
		t instanceof aWindow.HTMLButtonElement ||
		t instanceof aWindow.HTMLVideoElement ||
		t instanceof aWindow.HTMLAudioElement ||
		t instanceof aWindow.HTMLTextAreaElement ||
		t instanceof aWindow.HTMLCanvasElement ||
		t instanceof aWindow.HTMLAppletElement ||
		t instanceof aWindow.HTMLSelectElement ||
		t instanceof aWindow.HTMLOptionElement ||
		t instanceof aWindow.HTMLAreaElement ||
		t.attributes["g_editable"]
	) { disallow.html = true; }

	// best way to disable all xul elements is by instanceof XULElement
	if( t instanceof aWindow.XULControllers ||
		t.nodeName == 'textbox' ||
		t.nodeName == 'toolbarbutton' ||
		t.nodeName == 'richlistitem' ||
		t.nodeName == 'menuitem'
	) { disallow.xul = true; }

	if( t.baseURI == 'about:addons' ||
		t.localName == 'tabbrowser'
	) { allow.xul = true ; }

	if( t instanceof aWindow.HTMLElement ||
		t instanceof aWindow.SVGElement
	) { allow.html = true; }

	// check if element is child of anchor
	// we realy dont want to break links
	while(t && !(t instanceof aWindow.HTMLAnchorElement)) {
		t = t.parentNode;
		if(t instanceof aWindow.HTMLAnchorElement)
			disallow.html = true;
	}

	//emclogger("disHTML: " + disallow.html + ", allHTML: " + allow.html);
	//emclogger("disXUL: " + disallow.xul+ ", allXUL: " + allow.xul);

	if( (allow.html || allow.xul) && !(disallow.html || disallow.xul) )
		return true;
	else
		return false;
};


var runAction = function(e, aWindow) {

	//emclogger("getting action");
	let action = null;

	if(!e.ctrlKey && !e.shiftKey) {
		//emclogger("primaryAction"); 
		action = BRANCH.getCharPref("primaryAction");

	} else if(!e.ctrlKey && e.shiftKey && BRANCH.getCharPref("secondaryAction") !== "disable") {
		//emclogger("secondaryAction"); 
		action = BRANCH.getCharPref("secondaryAction");

	} else {
		//emclogger("no action"); 
		return false;

	}

	//emclogger("action -> " + action);

	//updateAndReset();

	// TODO: clean up the action names, update all old settings
	if( action == 'tabs' || action == 'tabsMenu' || action == 'visibleTabsMenu' ) {
		tabsMenu(e, aWindow);
	}

	if( action  == 'tabsGroupsMenu') {
		tabsGroupsMenu(e, aWindow);
	}

	if( action == 'history' || action == 'historyMenu' ) {
		historyMenu(e, aWindow);
	}

	if( action == 'toggleBookmarksSidebar' || action == 'bookmarksSidebarToggle' ) {
		toggleBookmarksSidebar(aWindow);
	}

	/*
	if( action == 'toggleDownloadsSidebar' || action == 'downloadSidebarToggle' ) {
		toggleDownloadsSidebar(aWindow);
	}
	*/

	if( action == 'toggleHistorySidebar' || action == 'historySidebarToggle' ) {
		toggleHistorySidebar(aWindow);
	}

	if( action == 'toggleTabView' ) {
		toggleTabView(aWindow);
	}

};


var makePopupMenu = function(e, aWindow, action, items, refresh)
{
	//emclogger("makePopupMenu");

	items = ( typeof items == 'undefined' ) ? false : items;

	let popupMenu = aWindow.document.getElementById("emc." + action);

	while(popupMenu.hasChildNodes())
		popupMenu.removeChild(popupMenu.firstChild);

	for ( let i = 0; i< items.length; i++)
	{
		let item = items[i];

		if(item == 'separator')
		{
			let menuseparator = popupMenu.appendChild(aWindow.document.createElement("menuseparator"));
		}
		else if (typeof item == 'string' && item && BRANCH.getBoolPref("displayGroupName"))
		{
			// if item is string it's most probably a group name
			let menuItem = popupMenu.appendChild(aWindow.document.createElement("caption"));
			menuItem.setAttribute("label", item);
			menuItem.setAttribute("disabled", true);
			// TODO: style in a separate css file
			menuItem.style.setProperty("font-weight:", "normal");
			menuItem.style.setProperty("text-align", "center");
			menuItem.style.setProperty("opacity", "0.3");
			menuItem.style.setProperty("margin", "3px");
			menuItem.classList.add("emc-grouptitle");
		}
		else if (typeof item == 'object')
		{
			let menuItem= popupMenu.appendChild(aWindow.document.createElement("menuitem"));

			menuItem.addEventListener('click', emcCloseTab, true);

			menuItem.setAttribute("index", item._tPos);
			menuItem.setAttribute("label", item.label);
			menuItem.setAttribute("data-action", action);
			
			// if page has no favicon show default
			if(!item.getAttribute("image"))
				menuItem.setAttribute("image", 'chrome://mozapps/skin/places/defaultFavicon.png');
			else
				menuItem.setAttribute("image", item.getAttribute("image"));

			menuItem.classList.add("menuitem-iconic");

			if (item.selected)
				menuItem.classList.add("unified-nav-current");
		}
	}

	if(!refresh)
	{
		popupMenu.openPopupAtScreen(e.screenX, e.screenY, true);
	}
}


var getTabGroup = function(e, aWindow, tab)
{
	//emclogger("getTabGroup");
	var group = {};
	var tabviewtab;

	if(typeof tab != 'undefined')
	{
		// use _tabViewTabItem if available its more predictable
		if(typeof tab._tabViewTabItem != 'undefined' && !tab.pinned)
		{
			group.id = tab._tabViewTabItem.parent.id
			group.title = tab._tabViewTabItem.parent.getTitle();
			//emclogger(group.title);

			return group;
		}
		else if (tab.pinned) 
		{
			group.id = 0;
			group.title = null;
			//emclogger("tab pinned");

			return group;
		}
		else { return false; }
	}
	else { return false; }
}


var emcCloseTab = function(e)
{
	//emclogger("closetab");
	let aWindow = Services.wm.getMostRecentWindow("navigator:browser");
	var tab = aWindow.gBrowser.tabContainer.getItemAtIndex(e.target.getAttribute('index'));
	var refresh = BRANCH.getBoolPref("refreshOnTabClose");

	let item = this;
	var action = item.getAttribute('data-action');
	let menu = aWindow.document.getElementById('emc.' + action);

	// if we'll ever need an item index here it is
	// let itemIndex = Array.prototype.indexOf.call(menu.childNodes, item);

	if(e.button == 1)
	{
		aWindow.gBrowser.removeTab(tab);

		if(refresh)
		{
			if( action == 'tabs' || action == 'tabsMenu' || action == 'visibleTabsMenu' )
				tabsMenu(menu, aWindow, refresh);

			if( action  == 'tabsGroupsMenu')
				tabsGroupsMenu(menu, aWindow, refresh);
		}
		else
			menu.hidePopup();
	}
}





// ************************************************************************** //
// Actions


var historyMenu = function (e, aWindow)
{
	//emclogger("historyMenu");
	let history_popup = aWindow.history_popup;

	while(history_popup.hasChildNodes())
		history_popup.removeChild(history_popup.firstChild);

	let hasHistory = aWindow.FillHistoryMenu(history_popup);
	let selectedTab = aWindow.gBrowser.tabContainer.selectedItem;
	
	if(!hasHistory)
	{
		let menuitem = history_popup.appendChild(aWindow.document.createElement("menuitem"));
		menuitem.setAttribute("index", "0");
		menuitem.setAttribute("label", selectedTab.label);
		menuitem.className = "unified-nav-current";
		let bundle_browser = aWindow.document.getElementById("bundle_browser");
		let tooltipCurrent = bundle_browser.getString("tabHistory.current");
		menuitem.setAttribute("tooltiptext", tooltipCurrent);

	}
	
	history_popup.openPopupAtScreen(e.screenX, e.screenY, true);
}


var tabsMenu = function (e, aWindow, refresh)
{
	//emclogger("tabsMenu");
	var group;
	var tabs = [];

	// if tabs=gBrowser.visibleTabs there is another title added each time you open popup
	tabs.push.apply(tabs, aWindow.gBrowser.visibleTabs);

	if( typeof refresh == 'undefined' ) refresh = false;

	// pick last tab, less possible to be pinned
	// and prepend title if exists
	group = getTabGroup(e, aWindow, tabs[tabs.length-1]);
	if(typeof group.title == 'string')
		tabs.unshift(group.title);

	makePopupMenu(e, aWindow, "tabsMenu", tabs, refresh);
}


var tabsGroupsMenu = function (e, aWindow, refresh)
{
	//emclogger("tabsGroupsMenu");
	if( typeof refresh == 'undefined' ) refresh = false;
	let num = aWindow.gBrowser.browsers.length;
	let tab;
	let tab_group;
	let parent_id;
	let groups = [];
	let tabs = [];

	for( let x = 0; x< num; x++)
	{
		tab = aWindow.gBrowser.tabContainer.getItemAtIndex(x);

		tab_group = getTabGroup(e, aWindow, tab);
		//emclogger(tab_group);

		// make unique array of groups
		if(groups.indexOf(tab_group.id) == -1)
			groups.push(tab_group.id);
	}

	for( let x = 0; x < groups.length; x++ )
	{
		parent_id = groups[x];

		if(x != 0)
			tabs.push('separator');

		let first_group_item = true;
		for ( let y = 0; y < num; y++) 
		{
			tab = aWindow.gBrowser.tabContainer.getItemAtIndex(y);
			tab_group = getTabGroup(e, aWindow, tab);

			if(typeof tab_group.title == 'string' && tab_group.id == parent_id && first_group_item)
			{
				tabs.push(tab_group.title);
				first_group_item = false;
			}

			if(tab_group.id >= 0 && tab_group.id == parent_id)
				tabs.push(tab);

		}
	}

	makePopupMenu(e, aWindow, "tabsGroupsMenu", tabs, refresh);
}


/*
var toggleDownloadsSidebar = function (aWindow) {
	// Deprecated, no longer works sinde the new download button/interface
	// aWindow.toggleSidebar("viewDownloadsSidebar");

	if(aWindow.document.getElementById("downloads-button") != null)
		aWindow.DownloadsIndicatorView.onCommand(aWindow.event);
	else
		aWindow.DownloadsPanel.showDownloadsHistory();

	//emclogger("toggleDownloadsSidebar");
}
*/


var toggleHistorySidebar = function (aWindow) {
	aWindow.toggleSidebar("viewHistorySidebar");
	//emclogger("toggleHistorySidebar");
}


var toggleBookmarksSidebar = function (aWindow) {
	aWindow.toggleSidebar("viewBookmarksSidebar");
	//emclogger("toggleBookmarksSidebar");
}


var toggleTabView = function (aWindow) {
	aWindow.TabView.toggle();
	//emclogger("toggleTabView");
}





// ************************************************************************** //
// Firefox Bootstrap API
//
// reasons and stuff
// https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions
// APP_STARTUP 		1 	The application is starting up.
// APP_SHUTDOWN 	2 	The application is shutting down.
// ADDON_ENABLE 	3 	The add-on is being enabled.
// ADDON_DISABLE 	4 	The add-on is being disabled. (Also sent during uninstallation)
// ADDON_INSTALL 	5 	The add-on is being installed.
// ADDON_UNINSTALL 	6 	The add-on is being uninstalled.
// ADDON_UPGRADE 	7 	The add-on is being upgraded.
// ADDON_DOWNGRADE 	8 	The add-on is being downgraded.


function install(data, reason) {
	//emclogger("install reason: " + reason);

	// upgrade or install gracefully
	// 0.3.3 -> 0.4.0
	// mainMenu -> primaryAction
	// secondaryMenu -> secondaryAction
	// history -> historyMenu
	// tabs -> tabsMenu
	//
	// this work only the first install because of the pref reset
	
	let oldVersion = '0';
	if( BRANCH.prefHasUserValue("version") )
		oldVersion = BRANCH.getCharPref('version');

	if( BRANCH.prefHasUserValue("mainMenu") ) {
		let oldMain = BRANCH.getCharPref("mainMenu");
		BRANCH.setCharPref("mainMenu", '');

		if( oldMain == 'history' )
			BRANCH.setCharPref('primaryAction', 'historyMenu');
		else if( oldMain == 'tabs' )
			BRANCH.setCharPref('primaryAction', 'tabsMenu');
		else if( oldMain != '' )
			BRANCH.setCharPref('primaryAction', oldMain);
	}

	if( BRANCH.prefHasUserValue("secondaryMenu") ) {
		let oldSecondary = BRANCH.getCharPref("secondaryMenu");
		BRANCH.setCharPref("secondaryMenu", '');

		if( oldSecondary == 'history' )
			BRANCH.setCharPref('secondaryAction', 'historyMenu');
		else if( oldSecondary == 'tabs' )
			BRANCH.setCharPref('secondaryAction', 'tabsMenu');
		else if( oldSecondary != '' )
			BRANCH.setCharPref('secondaryAction', oldSecondary);
	}

	// AddonManager callback somehow runs after extenstion startup ?
	// that is why everythin is inside that callback
	Cu.import("resource://gre/modules/AddonManager.jsm");

	// this is an old preferences so set it only if fresh install
	if( reason == ADDON_INSTALL ) {
		/* Code related to firstrun */
		//emclogger("upgradeGrace -> firstrun");

		// set autoScroll to false, only on fresh install
		Services.prefs.setBoolPref("general.autoScroll", false);
	}

	// new preferences, set them all
	if( reason == ADDON_INSTALL || reason == ADDON_UPGRADE || reason == ADDON_DOWNGRADE ) {
		AddonManager.getAddonByID("enhancedmiddleclick@senicar.net", function(addon) {
			/* Code related to firstrun */
			//emclogger("upgradeGrace -> upgrade");

			// if there are no preferences to be updated/upgraded just make defaults
			setDefaultPrefs();

			BRANCH.setCharPref('version', addon.version);

			// really disable loading URL on middle click
			Services.prefs.setBoolPref("middlemouse.contentLoadURL", false);

			/*
			// SAMPLE CODE FOR NOTIFICATIONS
			//emclogger("restartless notification");

			let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
			// https://developer.mozilla.org/en-US/docs/XUL/notificationbox
			let nb = browserWindow.gBrowser.getNotificationBox();
			let acceptButton = new Object();
			let message = "Enhanced Middle Click "+ addon.version +" installed - Check out new preference \"Toggle tab groups\"";

			acceptButton.label = "Check preferences";
			acceptButton.accessKey = ""
			acceptButton.popup = null;
			acceptButton.callback = function() { 
				// https://developer.mozilla.org/en-US/docs/Working_with_windows_in_chrome_code#Example_3:_Using_nsIWindowMediator_when_opener_is_not_enough

				// http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#6120
				browserWindow.BrowserOpenAddonsMgr("addons://detail/enhancedmiddleclick@senicar.net");
			};
			nb.appendNotification(
				message, "enhancedmiddleclick-upgrade-to-restartless-notification",
				"",
				nb.PRIORITY_INFO_HIGH, [ acceptButton ]);
			*/
		});
	}
}


function uninstall(data, reason) {
	//emclogger("uninstall reason: " + reason);

	// delete all preferences on this branch
	if( reason == ADDON_UNINSTALL )
		BRANCH.deleteBranch("");
}


function startup(data, reason) {
	//emclogger("startup reason: " + reason);
	
	// Load into any existing windows
	// bootstrap.js is not loaded into a window so we have to do it manually
	// let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
	let windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		loadIntoWindow(domWindow);

		// restartless addon can also be installed/enabled after browser-delayed-startup-finished
		if( reason == ADDON_DOWNGRADE || reason == ADDON_INSTALL || reason == ADDON_UPGRADE || reason == ADDON_ENABLE )
			emcInit(domWindow);
	}

	// if loaded to soon panorama won't work due to "redeclared const Cu" bug
	// it has to load after the page is done to work in firefox
	//
	// needs eventListener on "load" so it runs on every new window
	// needs observer to listen for browser-delayed-startup-finished, SSWindowStateReady doesn't fire in new windows
	// 
	// https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference 

	Services.obs.addObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished", false);

	// Load into any new windows
	Services.wm.addListener(windowListener);
}


function shutdown(data, reason) {
	//emclogger("shutdown reason: " + reason);

	// TODO: Make a proper cleanup, all actions, menus, popups ...

	// When the application is shutting down we normally don't have to clean
	// up any UI changes made
	//if( reason == APP_SHUTDOWN )
	//	return;

	// let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

	// Stop listening for new windows
	Services.wm.removeListener(windowListener);

	// Unload from any existing windows
	let windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		unloadFromWindow(domWindow);
	}

}


var emcInit = function(aWindow) {
	//emclogger("init");
	// init tabview in the background so _tabViewTabItem gets added to tabs

	if(emc_browser_delayed && typeof(aWindow.TabView) != 'undefined' && typeof(aWindow.gBrowser) != 'undefined' && typeof(aWindow.gBrowser.tabContainer.getItemAtIndex(0)._tabViewTabItem) == 'undefined') {
		//emclogger("emc_browser_delayed");
		aWindow.TabView._initFrame();
		return true;
	}

	return false;
}


// https://developer.mozilla.org/en/docs/Observer_Notifications
emcObserverDelayedStartup = {
	observe: function(subject, topic, data) {
			switch (topic) {
				// this is for the very first opened browser
				case 'browser-delayed-startup-finished':
					//emclogger("observe browser-delayed-startup-finish");
					emc_browser_delayed = true;

					emcInit(subject);

					Services.obs.removeObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished");
					break;
			}
		},
}


var loadIntoWindow = function(aWindow) {
	if (!aWindow)
		return;
	// Add any persistent UI elements
	// Perform any other initialization
	//emclogger("add click listener");

	// FIXME: make and emc class so everything will be in one place !
	aWindow.emcCloseTab = emcCloseTab;

	// Create menus
	if(aWindow.document.getElementById('emc.tabsMenu') == null) {
		let tabsMenu = aWindow.document.createElement("menupopup");
		tabsMenu.setAttribute("id", "emc.tabsMenu");
		tabsMenu.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
		aWindow.tabsMenu = tabsMenu;
		aWindow.document.getElementById("mainPopupSet").appendChild(tabsMenu);
	}

	if(aWindow.document.getElementById('emc.tabsGroupsMenu') == null) {
		let tabsGroupsMenu  = aWindow.document.createElement("menupopup");
		tabsGroupsMenu.setAttribute("id", "emc.tabsGroupsMenu");
		tabsGroupsMenu.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
		aWindow.tabsGroupsMenu = tabsGroupsMenu;
		aWindow.document.getElementById("mainPopupSet").appendChild(tabsGroupsMenu);
	}

	if(aWindow.document.getElementById('emc.historyMenu') == null) {
		let history_popup = aWindow.document.createElement("menupopup");
		history_popup.setAttribute("id", "emc.historyMenu");
		history_popup.setAttribute("oncommand", "gotoHistoryIndex(event); event.stopPropagation();");
		history_popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
		aWindow.history_popup = history_popup;
		aWindow.document.getElementById("mainPopupSet").appendChild(history_popup);
	}

	// true, to execute before selection buffer on linux
	aWindow.addEventListener("click", clicker, true);

	// just in case browser delay failed
	emcInit(aWindow);
}


var unloadFromWindow = function(aWindow) {
	if (!aWindow)
		return;
	// Remove any persistent UI elements
	// Perform any other cleanup
	//emclogger("cleaning up and saying bye");
	var node = aWindow.document.getElementById("emc.tabsMenu");
	if (node.parentNode) {
		//emclogger("remove tabsMenu");
		node.parentNode.removeChild(node);
	}

	var node = aWindow.document.getElementById("emc.tabsGroupsMenu");
	if (node.parentNode) {
		//emclogger("remove tabsGroupsMenu");
		node.parentNode.removeChild(node);
	}

	var node = aWindow.document.getElementById("emc.historyMenu");
	if (node.parentNode) {
		//emclogger("remove historyMenu");
		node.parentNode.removeChild(node);
	}

	aWindow.removeEventListener("click", clicker, true);
	//removed when initiated
	//Services.obs.removeObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished");

}


var windowListener = {
	onOpenWindow: function(aWindow) {
		// Wait for the window to finish loading
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		domWindow.addEventListener("load", function() {
			domWindow.removeEventListener("load", arguments.callee, false);
			loadIntoWindow(domWindow);
		}, false);
	},

	onCloseWindow: function(aWindow) {},
	onWindowTitleChange: function(aWindow, aTitle) {}
};
