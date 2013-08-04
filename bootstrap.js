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

// ************************************************************************** //
// XPCOM

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;

// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Services.jsm
// Gives access to prefs, console, cookies...
Cu.import("resource://gre/modules/Services.jsm");





// ************************************************************************** //
// Constants


const DBG_EMC = true;
const BRANCH = Services.prefs.getBranch("extensions.enhancedmiddleclick.");
const DEFAULT_PREFS = {
	// available actions:
	// historyMenu, tabsMenu, tabsGroupsMenu,
	// toggleBookmarksSidebar, toggleHistorySidebar, toggleDownloadSidebar
	// disable
	primaryAction: "historyMenu",
	secondaryAction: "disable",
	refreshOnTabClose: false,
	displayGroupName: false,
	autoscrolling: false
};


// Default preferences for bootstrap extensions are registered dynamically.
// no need for default/preferences/prefs.js
function setDefaultPrefs(reset) {
	// http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%E2%80%93-default-preferences/

	emclogger("setting defaults");

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
	// check if firebug even available, if you try to "report" and firebug
	// is not opened it will break addon
	if(DBG_EMC) {
		//if(typeof Firebug == 'object')
		//	Firebug.Console.log(msg);

		Services.console.logStringMessage("enhancedmiddleclick: " + msg);
	}
}


/**
 * It is called by addEventListener when click event is triggered
 */
var clicker = function(e) {
	emclogger("clicker");
	let window = this.window;

	// accept only middle click on a valid area thus the enhanced-middle-click
	if( areaValidator(e, window) && e.button === 1 ) {
		// e.cancelBubble = true;
		e.stopPropagation();
		emclogger("area accepted");

		runAction(e, window);
	} else return false;
};


/**
 * Validates clicked areas if they are valid, have no interaction.
 * It validates only on empty page areas, at least it tries
 */
var areaValidator = function(e, window)
{
	let t = e.target;
	emclogger(t);

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
	if( t instanceof window.HTMLInputElement ||
		t instanceof window.HTMLAnchorElement ||
		t instanceof window.HTMLButtonElement ||
		t instanceof window.HTMLVideoElement ||
		t instanceof window.HTMLAudioElement ||
		t instanceof window.HTMLTextAreaElement ||
		t instanceof window.HTMLCanvasElement ||
		t instanceof window.HTMLAppletElement ||
		t instanceof window.HTMLSelectElement ||
		t instanceof window.HTMLOptionElement ||
		t instanceof window.HTMLAreaElement ||
		t.attributes["g_editable"]
	) { disallow.html = true; }

	// best way to disable all xul elements is by instanceof XULElement
	if( t instanceof window.XULControllers ||
		t.nodeName == 'textbox' ||
		t.nodeName == 'toolbarbutton' ||
		t.nodeName == 'richlistitem' ||
		t.nodeName == 'menuitem'
	) { disallow.xul = true; }

	if( t.baseURI == 'about:addons' ||
		t.localName == 'tabbrowser'
	) { allow.xul = true ; }

	if( t instanceof window.HTMLElement ||
		t instanceof window.SVGElement
	) { allow.html = true; }

	// check if element is child of anchor
	// we realy dont want to break links
	while(t && !(t instanceof window.HTMLAnchorElement)) {
		t = t.parentNode;
		if(t instanceof window.HTMLAnchorElement)
			disallow.html = true;
	}

	emclogger("disHTML: " + disallow.html + ", allHTML: " + allow.html);
	emclogger("disXUL: " + disallow.xul+ ", allXUL: " + allow.xul);

	if( (allow.html || allow.xul) && !(disallow.html || disallow.xul) )
		return true;
	else
		return false;
};


var runAction = function(e, window) {

	emclogger("getting action");
	let action = null;

	if(!e.ctrlKey && !e.shiftKey) {
		emclogger("primaryAction"); 
		action = BRANCH.getCharPref("primaryAction");

	} else if(!e.ctrlKey && e.shiftKey && BRANCH.getCharPref("secondaryAction") !== "disable") {
		emclogger("secondaryAction"); 
		action = BRANCH.getCharPref("secondaryAction");

	} else {
		emclogger("no action"); 
		return false;

	}

	emclogger("action -> " + action);

	//updateAndReset();

	// TODO: clean up the action names, update all old settings
	if( action == 'tabs' || action == 'tabsMenu' || action == 'visibleTabsMenu' ) {
		tabsMenu(e, window);
	}

	if( action  == 'tabsGroupsMenu') {
		tabsGroupsMenu(e, window);
	}

	if( action == 'history' || action == 'historyMenu' ) {
		historyMenu(e, window);
	}

	if( action == 'toggleBookmarksSidebar' || action == 'bookmarksSidebarToggle' ) {
		toggleBookmarksSidebar(window);
	}

	if( action == 'toggleDownloadsSidebar' || action == 'downloadSidebarToggle' ) {
		toggleDownloadsSidebar(window);
	}

	if( action == 'toggleHistorySidebar' || action == 'historySidebarToggle' ) {
		toggleHistorySidebar(window);
	}

};


var makePopupMenu = function(e, window, action, items, refresh)
{
	emclogger("makePopupMenu");

	items = ( typeof items == 'undefined' ) ? false : items;

	let popupMenu = window.document.getElementById("emc." + action);

	while(popupMenu.hasChildNodes())
		popupMenu.removeChild(popupMenu.firstChild);

	for ( let i = 0; i< items.length; i++)
	{
		let item = items[i];

		if(item == 'separator')
		{
			let menuseparator = popupMenu.appendChild(window.document.createElement("menuseparator"));
		}
		else if (typeof item == 'string' && item && BRANCH.getBoolPref("displayGroupName"))
		{
			// if item is string it's most probably a group name
			let menuItem = popupMenu.appendChild(window.document.createElement("caption"));
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
			let menuItem= popupMenu.appendChild(window.document.createElement("menuitem"));

			menuItem.setAttribute("index", item._tPos);
			menuItem.setAttribute("label", item.label);
			
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


var getTabGroup = function(e, window, tab)
{
	emclogger("getTabGroup");
	var group = {};
	var tabviewtab;

	if(typeof tab != 'undefined')
	{
		// use _tabViewTabItem if available its more predictable
		if(typeof tab._tabViewTabItem != 'undefined' && !tab.pinned)
		{
			group.id = tab._tabViewTabItem.parent.id
			group.title = tab._tabViewTabItem.parent.getTitle();
			emclogger(group.title);

			return group;
		}
		else if (tab.pinned) 
		{
			group.id = 0;
			group.title = null;
			emclogger("tab pinned");

			return group;
		}
		else { return false; }
	}
	else { return false; }
}


var emcCloseTab = function(e)
{
	emclogger("closetab");
	let menu = this;
	var action = menu.id.replace(/emc./g,'');

	let window = Services.wm.getMostRecentWindow("navigator:browser");
	var tab = window.gBrowser.tabContainer.getItemAtIndex(e.target.getAttribute('index'));
	var refresh = BRANCH.getBoolPref("refreshOnTabClose"); 

	if(e.button == 1)
	{
		window.gBrowser.removeTab(tab);

		if(refresh)
		{
			if( action == 'tabs' || action == 'tabsMenu' || action == 'visibleTabsMenu' )
				tabsMenu(menu, window, refresh);

			if( action  == 'tabsGroupsMenu')
				tabsGroupsMenu(menu, window, refresh);
		}
		else
			menu.hidePopup();
	}
}


var emcInit = function(window) {
	emclogger("init");
	// init tabview in the background so _tabViewTabItem gets added to tabs
	window.TabView._initFrame();
}


// https://developer.mozilla.org/en/docs/Observer_Notifications
emcObserverDelayedStartup = {
	observe: function(subject, topic, data) {
			switch (topic) {
				case 'browser-delayed-startup-finished':
					emclogger("observe browser-delayed-startup-finish");

					emcInit(subject);

					Services.obs.removeObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished");
					break;
			}
		},
}


var loadIntoWindow = function(window) {
	if (!window)
		return;
	// Add any persistent UI elements
	// Perform any other initialization
	emclogger("add click listener");

	// FIXME: make and emc class so everything will be in one place !
	window.emcCloseTab = emcCloseTab;

	// Create menus
	var tabsMenu = window.document.createElement("menupopup");
	tabsMenu.setAttribute("id", "emc.tabsMenu");
	tabsMenu.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
	tabsMenu.addEventListener('click', emcCloseTab, true);
	window.tabsMenu = tabsMenu;
	window.document.getElementById("main-window").appendChild(tabsMenu);

	let tabsGroupsMenu  = window.document.createElement("menupopup");
	tabsGroupsMenu.setAttribute("id", "emc.tabsGroupsMenu");
	tabsGroupsMenu.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
	tabsGroupsMenu.addEventListener('click', emcCloseTab, true);
	window.tabsGroupsMenu = tabsGroupsMenu;
	window.document.getElementById("main-window").appendChild(tabsGroupsMenu);

	let history_popup = window.document.createElement("menupopup");
	history_popup.setAttribute("id", "emc.historyMenu");
	history_popup.setAttribute("oncommand", "gotoHistoryIndex(event); event.stopPropagation();");
	history_popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
	window.history_popup = history_popup;
	window.document.getElementById("main-window").appendChild(history_popup);

	// true, to execute before selection buffer on linux
	window.addEventListener("click", clicker, true);
}


var unloadFromWindow = function(window) {
	if (!window)
		return;
	// Remove any persistent UI elements
	// Perform any other cleanup
	emclogger("cleaning up and saying bye");
	window.removeEventListener("click", clicker, true);
	Services.obs.removeObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished");

	var node = window.document.getElementById("emc.tabsMenu");
	if (node.parentNode) {
		emclogger("remove tabsMenu");
		node.parentNode.removeChild(node);
	}

	var node = window.document.getElementById("emc.tabsGroupsMenu");
	if (node.parentNode) {
		emclogger("remove tabsGroupsMenu");
		node.parentNode.removeChild(node);
	}

	var node = window.document.getElementById("emc.historyMenu");
	if (node.parentNode) {
		emclogger("remove historyMenu");
		node.parentNode.removeChild(node);
	}
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





// ************************************************************************** //
// Actions


var historyMenu = function (e, window)
{
	emclogger("historyMenu");
	let history_popup = window.history_popup;

	while(history_popup.hasChildNodes())
		history_popup.removeChild(history_popup.firstChild);

	let hasHistory = window.FillHistoryMenu(history_popup);
	let selectedTab = window.gBrowser.tabContainer.selectedItem;
	
	if(!hasHistory)
	{
		let menuitem = history_popup.appendChild(window.document.createElement("menuitem"));
		menuitem.setAttribute("index", "0");
		menuitem.setAttribute("label", selectedTab.label);
		menuitem.className = "unified-nav-current";
		let bundle_browser = window.document.getElementById("bundle_browser");
		let tooltipCurrent = bundle_browser.getString("tabHistory.current");
		menuitem.setAttribute("tooltiptext", tooltipCurrent);

	}
	
	history_popup.openPopupAtScreen(e.screenX, e.screenY, true);
}


var tabsMenu = function (e, window, refresh)
{
	emclogger("tabsMenu");
	var group;
	var tabs = [];

	// if tabs=gBrowser.visibleTabs there is another title added each time you open popup
	tabs.push.apply(tabs, window.gBrowser.visibleTabs);

	if( typeof refresh == 'undefined' ) refresh = false;

	// pick last tab, less possible to be pinned
	// and prepend title if exists
	group = getTabGroup(e, window, tabs[tabs.length-1]);
	if(typeof group.title == 'string')
		tabs.unshift(group.title);

	makePopupMenu(e, window, "tabsMenu", tabs, refresh);
}


var tabsGroupsMenu = function (e, window, refresh)
{
	emclogger("tabsGroupsMenu");
	if( typeof refresh == 'undefined' ) refresh = false;
	let num = window.gBrowser.browsers.length;
	let tab;
	let tab_group;
	let parent_id;
	let groups = [];
	let tabs = [];

	for( let x = 0; x< num; x++)
	{
		tab = window.gBrowser.tabContainer.getItemAtIndex(x);

		tab_group = getTabGroup(e, window, tab);
		emclogger(tab_group);

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
			tab = window.gBrowser.tabContainer.getItemAtIndex(y);
			tab_group = getTabGroup(e, window, tab);

			if(typeof tab_group.title == 'string' && tab_group.id == parent_id && first_group_item)
			{
				tabs.push(tab_group.title);
				first_group_item = false;
			}

			if(tab_group.id >= 0 && tab_group.id == parent_id)
				tabs.push(tab);

		}
	}

	makePopupMenu(e, window, "tabsGroupsMenu", tabs, refresh);
}


var toggleDownloadsSidebar = function (window) {
	window.toggleSidebar("viewDownloadsSidebar");
	emclogger("toggleDownloadsSidebar");
}


var toggleHistorySidebar = function (window) {
	window.toggleSidebar("viewHistorySidebar");
	emclogger("toggleHistorySidebar");
}


var toggleBookmarsSidebar = function (window) {
	window.toggleSidebar("viewBookmarksSidebar");
	emclogger("toggleBookmarksSidebar");
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
	emclogger("install reason: " + reason);

	// upgrade or install gracefully
	// 0.3.3 -> 0.4.0
	// mainMenu -> primaryAction
	// secondaryMenu -> secondaryAction
	// history -> historyMenu
	// tabs -> tabsMenu
	//
	// this work only the first install because of the pref reset

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
		emclogger("upgradeGrace -> firstrun");

		// set autoScroll to false, only on fresh install
		Services.prefs.setBoolPref("general.autoScroll", false);
	}

	// new preferences, set them all
	if( reason == ADDON_INSTALL || reason == ADDON_UPGRADE || reason == ADDON_DOWNGRADE ) {
		AddonManager.getAddonByID("enhancedmiddleclick@senicar.net", function(addon) {
			/* Code related to firstrun */
			emclogger("upgradeGrace -> upgrade");

			// if there are no preferences to be updated/upgraded just make defaults
			setDefaultPrefs();

			BRANCH.setCharPref('version', addon.version);

			// really disable loading URL on middle click
			Services.prefs.setBoolPref("middlemouse.contentLoadURL", false);
		});
	}

	/* No need to upgrade at the moment
	if( reason == ADDON_UPGRADE || reason == ADDON_DOWNGRADE ) {
		emclogger("upgradeGrace -> upgrade/downgrade");

		let oldVersion = null;

		if( BRANCH.prefHasUserValue("version") )
			oldVersion = BRANCH.getCharPref("version");

		BRANCH.setCharPref('version', addon.version);

		// SAMPLE CODE FOR NOTIFICATIONS
		// Not very easy to update settings from classic addon that
		// deletes preference on uninstall :(
		if( oldVersion < "0.4.0" ) {
			emclogger("restartless notification");

			let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
			// https://developer.mozilla.org/en-US/docs/XUL/notificationbox
			let nb = browserWindow.gBrowser.getNotificationBox();
			let acceptButton = new Object();
			let message = "Enhanced Middle Click 0.x.x installed: Check out new preferences!";

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
		}
	}
	*/
}


function uninstall(data, reason) {
	emclogger("uninstall reason: " + reason);

	// delete all preferences on this branch
	if( reason == ADDON_UNINSTALL )
		BRANCH.deleteBranch("");
}


function startup(data, reason) {
	emclogger("startup reason: " + reason);
	
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
	emclogger("shutdown reason: " + reason);

	// TODO: Make a proper cleanup, all actions, menus, popups ...

	// When the application is shutting down we normally don't have to clean
	// up any UI changes made
	if( reason == APP_SHUTDOWN )
		return;

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
