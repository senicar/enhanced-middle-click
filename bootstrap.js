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
	refreshOnTabClose: true,
	displayGroupName: true,
	autoscrolling: false
};


// Default preferences for bootstrap extensions are registered dynamically.
// no need for default/preferences/prefs.js
function setDefaultPrefs() {
	// http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%E2%80%93-default-preferences/

	for(let [key, val] in Iterator(DEFAULT_PREFS)) {
		switch (typeof val) {
			case "boolean":
				BRANCH.setBoolPref(key, val);
				break;
			case "number":
				BRANCH.setIntPref(key, val);
				break;
			case "string":
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

	if( areaValidator(e, window) ) {
		// e.cancelBubble = true;
		e.stopPropagation();
		emclogger("area clickable");

		// accept only middle click thus the enhanced-middle-click
		if(e.button == 1)
			runAction(e, window);
		else return false;

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
		emclogger("tabsMenu");
		//visibleTabsMenu();
	}

	if( action  == 'tabsGroupsMenu') {
		emclogger("tabsGroupsMenu");
		//tabsGroupsMenu();
	}

	if( action == 'history' || action == 'historyMenu' ) {
		emclogger("historyMenu");
		//historyMenu(e, window);
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


var loadIntoWindow = function(window) {
	if (!window)
		return;
	// Add any persistent UI elements
	// Perform any other initialization
	emclogger("add click listener");

	// true, to execute before selection buffer on linux
	window.addEventListener("click", clicker, true);
}


var unloadFromWindow = function(window) {
	if (!window)
		return;
	// Remove any persistent UI elements
	// Perform any other cleanup
	emclogger("remove click listener");
	window.removeEventListener("click", clicker, true);
}


var windowListener = {
	onOpenWindow: function(aWindow) {
		// Wait for the window to finish loading
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
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


function install(data, reason) {
	emclogger("install reason: " + reason);
	// FIXME: setDefaultPrefs on first install, not upgrade/update
	setDefaultPrefs();

	// TODO: 
	// mainMenu -> primaryAction
	// secondaryMenu -> secondaryAction
	// history -> historyMenu
	// tabs -> tabsMenu
	//
	// make it update on upgrade
}


function uninstall(data, reason) {
	emclogger("uninstall reason: " + reason);
	// delete all preferences on this branch
	// FIXME: delete branch only on uninstall, not upgrade/update
	BRANCH.deleteBranch("");
}


function startup(data, reason) {
	emclogger("startup reason: " + reason);
	let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

	// Load into any existing windows
	// bootstrap.js is not loaded into a window so we have to do it manually
	let windows = wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		loadIntoWindow(domWindow);
	}
	// Load into any new windows
	wm.addListener(windowListener);
}


function shutdown(data, reason) {
	emclogger("shutdown reason: " + reason);
	// When the application is shutting down we normally don't have to clean
	// up any UI changes made
	if (reason == APP_SHUTDOWN)
		return;

	let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

	// Stop listening for new windows
	wm.removeListener(windowListener);

	// Unload from any existing windows
	let windows = wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		unloadFromWindow(domWindow);
	}
}
