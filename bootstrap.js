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


var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Components.interfaces.nsIStyleSheetService);


// ************************************************************************** //
// Constants

const STYLE_URI = Services.io.newURI("chrome://enhancedmiddleclick/skin/overlay.css", null, null);

// vim search and replace for more speed
// %s/\(.\)\/\/emclogger/\emclogger/gc
// %s/\temclogger/\\t/\/emclogger/gc
const DBG_EMC = true;
const BRANCH = Services.prefs.getBranch("extensions.enhancedmiddleclick.");
const FFVERSION = Services.prefs.getBranch("extensions.").getCharPref("lastPlatformVersion");
const DEFAULT_PREFS = {
	// deprecated: toggleDownloadsSidebar
	// available actions:
	// historyMenu, tabsMenu, tabsGroupsMenu,
	// toggleBookmarksSidebar, toggleHistorySidebar, toggleTabView
	// loadSearchFromContext
	// bookmarksMenuPopup, bookmarksToolbarFolderPopup
	// removeCurrentTab, autoScroll, undoCloseTab
	// toggleFavTabPosition
	// runCustomScript
	// disable
	//
	primaryAction: "historyMenu",
	secondaryAction: "disable",
	tertiaryAction: "disable",
	refreshOnTabClose: false,
	displayGroupName: false,
	autoscrolling: false,
	timeout: 999999999,
	favTabPosition: 0,
	favTabPositionRestore: 0,
	customScript: 'aWindow.console.log("Enhanced middle click says *Hi*, visit addon options to change this message.");',
};

var emc_browser_delayed = false;

var emc_timer = 0;


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
 * It's responsible for proper output of debug messages to error console
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
	//let aWindow = this.window;
	let aWindow = Services.wm.getMostRecentWindow("navigator:browser");

	//let autoscroll = Services.prefs.getBoolPref("general.autoScroll");

	let timeout = BRANCH.getIntPref("timeout");
	let end = +new Date();
	let time_diff = end - emc_timer;

	if( timeout == 0 )
		timeout = 999999999;

	//emclogger(timeout);
	//emclogger(time_diff);

	// accept only middle click on a valid area thus the enhanced-middle-click
	if( areaValidator(e, aWindow) && e.button === 1 && time_diff < timeout ) {
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
		t.baseURI == 'chrome://mozapps/content/extensions/extensions.xul' ||
		t.baseURI == 'about:preferences' ||
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

	if(!e.ctrlKey && ! e.altKey && !e.shiftKey) {
		//emclogger("primaryAction");
		action = BRANCH.getCharPref("primaryAction");

	} else if(!e.ctrlKey && !e.altKey && e.shiftKey && BRANCH.getCharPref("secondaryAction") !== "disable") {
		//emclogger("secondaryAction");
		action = BRANCH.getCharPref("secondaryAction");

	} else if(!e.ctrlKey && e.altKey && e.shiftKey && BRANCH.getCharPref("tertiaryAction") !== "disable") {
		//emclogger("tertiaryAction");
		action = BRANCH.getCharPref("tertiaryAction");

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

	if( action == 'toggleHistorySidebar' || action == 'historySidebarToggle' ) {
		toggleHistorySidebar(aWindow);
	}

	if( action == 'toggleTabView' ) {
		toggleTabView(aWindow);
	}

	if( action == 'loadSearchFromContext' ) {
		loadSearchFromContext(aWindow, e);
	}

	if( action == 'bookmarksToolbarFolderPopup' ) {
		bookmarksToolbarFolderPopup(aWindow, e);
	}

	if( action == 'bookmarksMenuPopup' ) {
		bookmarksMenuPopup(aWindow, e);
	}

	if( action == 'autoScroll' ) {
		// FIXME : not working
		aWindow.gBrowser.selectedBrowser.startScroll("NS", e.screenX, e.screenY);
	}

	if( action == 'removeCurrentTab' ) {
		aWindow.gBrowser.removeCurrentTab({animate: true, byMouse: false});
	}

	if( action == 'undoCloseTab' ) {
		aWindow.undoCloseTab(0);
	}

	if( action == 'runCustomScript' ) {
		runCustomScript(aWindow, e)
	}

	if( action == 'toggleFavTabPosition' ) {
		toggleFavTabPosition(aWindow, e)
	}
};


var makePopupMenu = function(e, aWindow, action, items, refresh)
{
	//emclogger("makePopupMenu");

	items = ( typeof items == 'undefined' ) ? false : items;

	let popupMenu = aWindow.document.getElementById("emc." + action);
	popupMenu.classList.add("emc-popupmenu");

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
			menuItem.classList.add("emc-grouptitle");
		}
		else if (typeof item == 'object')
		{
			let menuItem= popupMenu.appendChild(aWindow.document.createElement("menuitem"));

			menuItem.addEventListener('click', emcCloseTab, true);

			menuItem.setAttribute("index", item._tPos);
			menuItem.setAttribute("label", item.label);
			menuItem.setAttribute("data-action", action);

			if(item.pinned)
				menuItem.classList.add('emc-pinned');

			// this comes from updateTabsVisibilityStatus
			if(item.getAttribute('tabIsVisible'))
				menuItem.setAttribute('tabIsVisible', 'true');

			// firefox uses .alltabs-item[tabIsNotVisible] to style visible tabs
			menuItem.classList.add("alltabs-item");

			// if page has no favicon show default
			if(!item.getAttribute("image"))
				menuItem.setAttribute("image", 'chrome://mozapps/skin/places/defaultFavicon.png');
			else
				menuItem.setAttribute("image", item.getAttribute("image"));

			menuItem.classList.add("menuitem-iconic");

			if (item.selected) {
				menuItem.classList.add("unified-nav-current");
			}
		}
	}

	if(!refresh)
	{
		popupMenu.openPopupAtScreen(e.screenX, e.screenY, true);
	}
}


// http://mxr.mozilla.org/mozilla-central/source/browser/base/content/tabbrowser.xml#4751
var updateTabsVisibilityStatus = function updateTabsVisibilityStatus(aWindow, tabs, action = null) {
	var tabContainer = aWindow.gBrowser.tabContainer;

	// TODO: if refreshing open menu (when closing tab) than you don't need to loop all tabs

	// But we need it to run always due to all tab groups
	//
	// We don't want menu item decoration unless there is overflow or we are
	// showing all tab groups
	for (var i = 0; i < tabs.length; i++) {
		let curTab = tabs[i];
		if (typeof curTab == 'string') // "Tab Groups" menuitem and its menuseparator
			continue;
		tabs[i].removeAttribute("tabIsVisible");
	}

	if ( action != 'tabsGroupsMenu' && tabContainer.getAttribute("overflow") != "true")
		return;

	// tabContainer.mTabstrip.scrollBoxObject = tabContainer.mTabstrip.boxObject;
	let tabstripBO = tabContainer.mTabstrip.boxObject;

	// list of tabs
	for (var i = 0; i < tabs.length; i++) {
		let curTab = tabs[i];

		if (typeof curTab == 'string' || curTab.pinned) // "Tab Groups" menuitem and its menuseparator
			continue;

		let curTabBO = curTab.boxObject;
		if (curTabBO.screenX >= tabstripBO.screenX &&
				curTabBO.screenX + curTabBO.width <= tabstripBO.screenX + tabstripBO.width)
			tabs[i].setAttribute("tabIsVisible", "true");
		else
			tabs[i].removeAttribute("tabIsVisible");
	}
}


var emcCloseTab = function(e)
{
	//emclogger("closetab");
	let aWindow = Services.wm.getMostRecentWindow("navigator:browser");
	let tabIndex = e.target.getAttribute('index');
	var tab = aWindow.gBrowser.tabContainer.getItemAtIndex(tabIndex);
	var refresh = BRANCH.getBoolPref("refreshOnTabClose");

	let item = this;
	var action = item.getAttribute('data-action');
	let menu = aWindow.document.getElementById('emc.' + action);

	// if we'll ever need an item index here it is
	// let itemIndex = Array.prototype.indexOf.call(menu.childNodes, item);

	if(e.button == 1)
	{
		// TODO: closing tab with animation is async and slower so tabsMenu
		// and tabsGroupsMenu can redraw before tab is removed if closing
		// in quick succession and tab is still visible in the menu even
		// though it has been removed
		//
		// Try implementing removeTabsProgressListener or something similar
		//
		// aWindow.gBrowser.removeTab(tab,{animate: true, byMouse: false});
		aWindow.gBrowser.removeTab(tab);

		if(refresh)
		{
			if( action == 'tabs' || action == 'tabsMenu' || action == 'visibleTabsMenu' )
				tabsMenu(menu, aWindow, refresh);

				/*
				for(var i=0; i<menu.childNodes.length; i++) {
					let itemIndex = menu.childNodes[i].getAttribute('index');
					if(itemIndex == tabIndex)
						menu.removeChild(menu.childNodes[i]);
				}
				*/

			if( action  == 'tabsGroupsMenu')
				tabsGroupsMenu(menu, aWindow, refresh);
		}
		else
			menu.hidePopup();
	}
}


function getWordAt(s, pos) {
  // make pos point to a character of the word
  while (s[pos] == " ") pos--;
  // find the space before that word
  // (add 1 to be at the begining of that word)
  // (note that it works even if there is no space before that word)
  pos = s.lastIndexOf(" ", pos) + 1;
  // find the end of the word
  var end = s.indexOf(" ", pos);
  if (end == -1) end = s.length; // set to length if it was the last word
  // return the result
  return s.substring(pos, end);
}


var getTabGroup = function(aWindow, tab)
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


function containsGroup(obj, groups) {
	let i;
	for (i = 0; i < groups.length; i++) {
		if (JSON.stringify(groups[i]) === JSON.stringify(obj)) {
			return true;
		}
	}
	return false;
}


function getGroups(aWindow) {
	let tab;
	let tab_group;
	let groups = [];

	for( let x = 0; x<aWindow.gBrowser.browsers.length; x++)
	{
		tab = aWindow.gBrowser.tabContainer.getItemAtIndex(x);

		tab_group = getTabGroup(aWindow, tab);
		//emclogger(tab_group);

		// make unique array of groups
		if( ! containsGroup(tab_group, groups) )
			groups.push(tab_group);
	}

	return groups;
}


function getGroupTabs(aWindow, group) {
	let tabs = [];

	// tabContainer.mTabstrip.scrollBoxObject = tabContainer.mTabstrip.boxObject;
	let tabstripBO = aWindow.gBrowser.tabContainer.mTabstrip.boxObject;

	for ( let y = 0; y < aWindow.gBrowser.browsers.length; y++) {
		let tab = aWindow.gBrowser.tabContainer.getItemAtIndex(y);
		let tab_group = getTabGroup(aWindow, tab);

		// if all tabs are visible there is no need to show the stripe
		//if(tabs.length * tabs[i].boxObject.width)

		if(tab_group.id >= 0 && tab_group.id == group.id) {
			// we'll readd tabIsVisible it afterwards
			tab.removeAttribute("tabIsVisible");
			tabs.push(tab);
		}
	}

	/*
	if( (tabs.length * tabs[0].boxObject.width) > tabstripBO.width ) {

		for(let i = 0; i < tabs.length; i++) {
			let curTabBO = tabs[i].boxObject;
			if (curTabBO.screenX >= tabstripBO.screenX &&
				curTabBO.screenX + curTabBO.width <= tabstripBO.screenX + tabstripBO.width)
				tabs[i].setAttribute("tabIsVisible", "true");
			else
				tabs[i].removeAttribute("tabIsVisible");
		}
	}
	*/


	return tabs;
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
	group = getTabGroup(aWindow, tabs[tabs.length-1]);
	if(typeof group.title == 'string')
		tabs.unshift(group.title);

	updateTabsVisibilityStatus(aWindow, tabs, 'tabsGroupsMenu');

	makePopupMenu(e, aWindow, "tabsMenu", tabs, refresh);
}


var tabsGroupsMenu = function (e, aWindow, refresh)
{
	//emclogger("tabsGroupsMenu");
	if( typeof refresh == 'undefined' ) refresh = false;
	let num = aWindow.gBrowser.browsers.length;
	let tab;
	let parent_id;
	let tabs = [];

	let groups = getGroups(aWindow);

	for( let x = 0; x < groups.length; x++ )
	{
		let tab_group;
		parent_id = groups[x];

		if(x != 0)
			tabs.push('separator');

		if(typeof groups[x].title == 'string') {
			tabs.push(groups[x].title);
		}

		let group_tabs = getGroupTabs(aWindow, groups[x]);
		if(group_tabs.length > 0) {
			tabs = tabs.concat(group_tabs);
		}
	}

	updateTabsVisibilityStatus(aWindow, tabs, 'tabsGroupsMenu');

	makePopupMenu(e, aWindow, "tabsGroupsMenu", tabs, refresh);
}


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


// stackoverflow.com/questions/2444430/how-to-get-a-word-under-cursor-using-javascript
var loadSearchFromContext = function (aWindow, e) {
	//let range = e.target.parentNode.ownerDocument.createRange();

	//range.selectNode(e.rangeParent);
	//let str = range.toString();

	//range.detach();

	//let word_under = getWordAt(str, e.rangeOffset);
	let selection = aWindow.getBrowserSelection();

	if( selection.length > 0 ) {
		aWindow.BrowserSearch.loadSearchFromContext(selection);
	}
	/*
	else if( word_under.length > 1 ) {
		if(e && e.rangeParent && e.rangeParent.nodeType == e.rangeParent.TEXT_NODE
				&& e.rangeParent.parentNode == e.target) {
			aWindow.BrowserSearch.loadSearchFromContext(word_under);
		}
	}
	*/

	return;
}


var bookmarksMenuPopup = function (aWindow, e) {
	//emclogger('bookmarksMenuPopup');
	let popup = aWindow.document.getElementById('emc-bookmarksMenuPopup');
	popup.openPopupAtScreen(e.screenX, e.screenY, true);
}


var bookmarksToolbarFolderPopup = function (aWindow, e) {
	//emclogger('bookmarksToolbarFolderPopup');
	let popup = aWindow.document.getElementById('emc-bookmarksToolbarFolderPopup');
	popup.openPopupAtScreen(e.screenX, e.screenY, true);
}


var runCustomScript = function (aWindow, e) {
	if(BRANCH.getCharPref('customScript').length > 0) {
		eval(BRANCH.getCharPref('customScript'));
	}
}


var toggleFavTabPosition = function (aWindow, e) {
	// get current tabs
	let favTabPosition = BRANCH.getIntPref('favTabPosition');
	let tabs = [];
	tabs.push.apply(tabs, aWindow.gBrowser.visibleTabs);

	let currentTab = aWindow.gBrowser.tabContainer.selectedItem;
	let currentTabIndex = tabs.indexOf(currentTab);

	let favTabPositionRestore = BRANCH.getIntPref('favTabPositionRestore');

	if(currentTabIndex != favTabPosition) {
	}

	if(currentTabIndex != favTabPosition && favTabPositionRestore >= tabs.length) {
		BRANCH.setIntPref('favTabPositionRestore', currentTabIndex);
	}

	if(favTabPosition >= tabs.length) {
		if(currentTabIndex != tabs.length - 1) {
			// let set current tab so we can toggle back to it
			BRANCH.setIntPref('favTabPositionRestore', currentTabIndex);
			aWindow.gBrowser.tabContainer.selectedIndex = tabs[tabs.length - 1]._tPos;
		}
		else {
			aWindow.gBrowser.tabContainer.selectedIndex = tabs[favTabPositionRestore]._tPos;
		}
	}
	else if(currentTabIndex != favTabPosition) {
		// let set current tab so we can toggle back to it
		BRANCH.setIntPref('favTabPositionRestore', currentTabIndex);
		aWindow.gBrowser.tabContainer.selectedIndex = tabs[favTabPosition]._tPos;
	}
	else if(favTabPositionRestore >= 0 && (favTabPositionRestore in tabs)) {
		aWindow.gBrowser.tabContainer.selectedIndex = tabs[favTabPositionRestore]._tPos;
	}
	else {
		emclogger("Sorry no tab to restore or jump to");
	}
	// if everything else fails do nothing

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
		if( (reason == ADDON_DOWNGRADE || reason == ADDON_INSTALL || reason == ADDON_UPGRADE || reason == ADDON_ENABLE) && ! emc_browser_delayed )
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

	if(!sss.sheetRegistered(STYLE_URI, sss.USER_SHEET))
		sss.loadAndRegisterSheet(STYLE_URI, sss.USER_SHEET);

	// reset favTabPositionRestore, we want to start fresh everytime we boot up emc
	BRANCH.setIntPref("favTabPositionRestore", -1);
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

	Services.obs.removeObserver(emcObserverDelayedStartup, "browser-delayed-startup-finished");

	if(sss.sheetRegistered(STYLE_URI, sss.USER_SHEET))
		sss.unregisterSheet(STYLE_URI, sss.USER_SHEET);
}


var emcInit = function(aWindow) {
	// TODO : still a problem on mac os

	// init tabview in the background so _tabViewTabItem gets added to tabs
	if(typeof(aWindow.TabView) != 'undefined' && typeof(aWindow.gBrowser) != 'undefined' && typeof(aWindow.gBrowser.tabContainer.getItemAtIndex(0)._tabViewTabItem) == 'undefined') {
		// v23 doesn't have enough browser delay for tabview, so this
		// is an ugly hack just for v23, remove this as soon as possible
		if(aWindow.parseInt(FFVERSION) < aWindow.parseInt('24'))
			aWindow.setTimeout(function() { aWindow.TabView._initFrame(); }, 450);
		else
			aWindow.TabView._initFrame();
		return true;
	}

	return false;
}


// https://developer.mozilla.org/en/docs/Observer_Notifications
var emcObserverDelayedStartup = {
	observe: function(subject, topic, data) {
			switch (topic) {
				// this is for the very first opened browser
				case 'browser-delayed-startup-finished':
					//emclogger("observe browser-delayed-startup-finish");
					emc_browser_delayed = true;

					emcInit(subject);

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

	if(aWindow.document.getElementById("mainPopupSet") == null)
		return;

	let emcPopupGroup = aWindow.document.createElement('popupset');
	emcPopupGroup.setAttribute('id', 'emc-popupGroup');

	aWindow.document.getElementById("mainPopupSet").appendChild(emcPopupGroup);

	// Create menus
	if(aWindow.document.getElementById('emc.tabsMenu') == null) {
		let popup = aWindow.document.createElement("menupopup");
		popup.setAttribute("id", "emc.tabsMenu");
		popup.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
		aWindow.tabsMenu = popup;
		emcPopupGroup.appendChild(popup);
	}

	if(aWindow.document.getElementById('emc.tabsGroupsMenu') == null) {
		let popup = aWindow.document.createElement("menupopup");
		popup.setAttribute("id", "emc.tabsGroupsMenu");
		popup.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
		aWindow.tabsGroupsMenu = popup;
		emcPopupGroup.appendChild(popup);
	}

	if(aWindow.document.getElementById('emc.historyMenu') == null) {
		let popup = aWindow.document.createElement("menupopup");
		popup.setAttribute("id", "emc.historyMenu");
		popup.setAttribute("oncommand", "gotoHistoryIndex(event); event.stopPropagation();");
		popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
		aWindow.history_popup = popup;
		emcPopupGroup.appendChild(popup);
	}

	if(aWindow.document.getElementById('emc-bookmarksMenuPopup') == null) {
		let popup = aWindow.document.createElement("menupopup");
		let menu = aWindow.document.getElementById('bookmarksMenuPopup');
		//popup = menu.querySelector('#bookmarksMenuPopup').cloneNode(true);
		popup.setAttribute("id", "emc-bookmarksMenuPopup");
		popup.setAttribute("open", "true");
		popup.setAttribute("_moz-menuactive", "true");
		popup.setAttribute('openInTabs','children');
		popup.setAttribute('tooltip','bhTooltip');
		popup.setAttribute('popupsinherittooltip','true');
		popup.setAttribute('onclick','BookmarksEventHandler.onClick(event, this._placesView);');
		popup.setAttribute('oncommand','event.preventDefault(); BookmarksEventHandler.onCommand(event, this._placesView);');

		let onpopup = "BookmarkingUI.onPopupShowing(event); if (!this._placesView) this._placesView = new PlacesMenu(event, 'place:folder=BOOKMARKS_MENU');";

		popup.setAttribute('placespopup','true'); // this enables drag/drop
		popup.setAttribute('context','placesContext');
		popup.setAttribute('onpopupshowing', onpopup);

		let toolbar = aWindow.document.createElement("menu");
		toolbar.setAttribute('id', 'emc-bookmarksMenuPopup-toolbarFolderMenu');
		toolbar.setAttribute('class', 'menu-iconic bookmark-item emc-toolbarMenuIcon');
		if(aWindow.document.getElementById('bookmarksToolbarFolderMenu') != null)
			toolbar.setAttribute('label', aWindow.document.getElementById('bookmarksToolbarFolderMenu').getAttribute('label'));
		else
			toolbar.setAttribute('label', 'Toolbar Bookmarks');

		let toolbarPopup = aWindow.document.createElement("menupopup");
		toolbarPopup.setAttribute('placespopup','true'); // this enables drag/drop
		popup.setAttribute('context','placesContext');

		let toolbarOnPopup = "PlacesCommandHook.updateBookmarkAllTabsCommand(); if (!this._placesView) this._placesView = new PlacesMenu(event, 'place:folder=TOOLBAR');";
		toolbar.setAttribute('onpopupshowing', toolbarOnPopup);

		toolbar.appendChild(toolbarPopup);
		popup.appendChild(toolbar);
		popup.appendChild(aWindow.document.createElement("menuseparator"));
		emcPopupGroup.appendChild(popup);
	}

	if(aWindow.document.getElementById('emc-bookmarksToolbarFolderPopup') == null) {
		let popup = aWindow.document.createElement("menupopup");
		let menu = aWindow.document.getElementById('bookmarksMenu');
		//popup = menu.querySelector('#bookmarksToolbarFolderPopup').cloneNode(true);
		popup.setAttribute("id", "emc-bookmarksToolbarFolderPopup");
		popup.setAttribute("open", "true");
		popup.setAttribute("_moz-menuactive", "true");
		popup.setAttribute('openInTabs','children');
		popup.setAttribute('tooltip','bhTooltip');
		popup.setAttribute('popupsinherittooltip','true');
		popup.setAttribute('onclick','BookmarksEventHandler.onClick(event, this._placesView);');
		popup.setAttribute('oncommand','BookmarksEventHandler.onCommand(event, this._placesView);');

		let onpopup = "PlacesCommandHook.updateBookmarkAllTabsCommand(); if (!this._placesView) this._placesView = new PlacesMenu(event, 'place:folder=TOOLBAR');";

		popup.setAttribute('placespopup','true'); // this enables drag/drop
		popup.setAttribute('context','placesContext');
		popup.setAttribute('onpopupshowing', onpopup);
		emcPopupGroup.appendChild(popup);
	}

	// true, to execute before selection buffer on linux
	aWindow.addEventListener("click", clicker, true);
	aWindow.addEventListener("mousedown", clickerStartTimer, true);
}


var clickerStartTimer = function(e) {
	emc_timer = +new Date();
}


var unloadFromWindow = function(aWindow) {
	if (!aWindow)
		return;
	// Remove any persistent UI elements
	// Perform any other cleanup
	//emclogger("cleaning up and saying bye");

	var node = aWindow.document.getElementById("emc-popupGroup");
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}

	aWindow.removeEventListener("click", clicker, true);
	aWindow.removeEventListener("mousedown", clickerStartTimer, true);
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
