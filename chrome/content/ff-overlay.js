/*******************************************************************************
*  
*  Extension: Enhanced Middle Click
*  Author: senicar
*  
*  Thanks to: 
*  gMinus (Tab History Menu)
*  keremonal (Middle Click To Go Back)
* 
*******************************************************************************/

if(!senicar) var senicar = {};
if(!senicar.emc) senicar.emc = {};

senicar.emc = (function (emc)
{
	var debug = true;

	var emcpref = {}
	var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.enhancedmiddleclick.");
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

	emcpref.primaryMenu = preferences.getCharPref("mainMenu");
	emcpref.secondaryMenu = preferences.getCharPref("secondaryMenu");
	emcpref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");
	emcpref.refreshOnTabClose = preferences.getBoolPref("refreshOnTabClose");
	emcpref.displayGroupTitles = preferences.getBoolPref("displayGroupTitles");

	// create all the menus
	var visibleTabsPopup = document.createElement("menupopup");
	visibleTabsPopup.setAttribute("id", "senicar.emc.visibleTabsMenu");
	visibleTabsPopup.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
	visibleTabsPopup.setAttribute("onclick", "senicar.emc.closeTab(this, event);");
	document.getElementById("mainPopupSet").appendChild(visibleTabsPopup);

	var tabsGroupsPopup = document.createElement("menupopup");
	tabsGroupsPopup.setAttribute("id", "senicar.emc.tabsGroupsMenu");
	tabsGroupsPopup.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
	tabsGroupsPopup.setAttribute("onclick", "senicar.emc.closeTab(this, event);");
	document.getElementById("mainPopupSet").appendChild(tabsGroupsPopup);

	var history_popup = document.createElement("menupopup");
	history_popup.setAttribute("id", "senicar.emc.historyMenu");
	history_popup.setAttribute("oncommand", "gotoHistoryIndex(event); event.stopPropagation();");
	history_popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
	document.getElementById("mainPopupSet").appendChild(history_popup);
		

	// where click event is stored
	var emcmouseEvent;
	var emcscreenX;
	var emcscreenY;
	
	// used for debuging
	var report = function (msg)
	{
		// check if firebug even available, if you try to "report" and firebug
		// is not opened it will break addon
		if(typeof Firebug.Console == 'object' && debug)
			Firebug.Console.log(msg);

  		consoleService.logStringMessage("enhancedmiddleclick: " + msg);
	}


	var updateAndReset = function ()
	{
		emcpref.primaryMenu = preferences.getCharPref("mainMenu");
		emcpref.secondaryMenu = preferences.getCharPref("secondaryMenu");
		emcpref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");
		emcpref.refreshOnTabClose = preferences.getBoolPref("refreshOnTabClose");
		emcpref.displayGroupTitles = preferences.getBoolPref("displayGroupTitles");
	}


	// it validates only on empty page areas, at least it tries
	var clickValid = function ()
	{
		// by default disable all target areas
		var disallow = {};
		var allow = {};

		disallow .html = false;
		disallow .xul = false;
		allow .html = false;
		allow .xul = false;

		var t = emcmouseEvent.target;

		// reset t
		t = emcmouseEvent.target;

		// https://developer.mozilla.org/en-US/docs/Gecko_DOM_Reference
		if( t instanceof HTMLInputElement ||
			t instanceof HTMLAnchorElement ||
			t instanceof HTMLButtonElement ||
			t instanceof HTMLVideoElement ||
			t instanceof HTMLAudioElement ||
			t instanceof HTMLTextAreaElement ||
			t instanceof HTMLCanvasElement ||
			t instanceof HTMLAppletElement ||
			t instanceof HTMLSelectElement ||
			t instanceof HTMLOptionElement
		) { disallow.html = true; }

		// best way to disable all xul elements is by instanceof XULElement
		if( t instanceof XULControllers ||
			t.nodeName == 'textbox' ||
			t.nodeName == 'toolbarbutton' ||
			t.nodeName == 'richlistitem' ||
			t.nodeName == 'menuitem'
		) { disallow.xul = true; }

		if( t.baseURI == 'about:addons'
		) { allow.xul = true ; }

		if( t instanceof HTMLElement ||
			t instanceof SVGElement
		) { allow.html = true; }

		// check if element is child of anchor
		// we realy dont want to break links
		while(t && !(t instanceof HTMLAnchorElement)) {
			t = t.parentNode;
			if(t instanceof HTMLAnchorElement)
				disallow.html = true;
		}

		if( (allow.html || allow.xul) && !(disallow.html || disallow.xul) && emcmouseEvent.button == 1 )
			return true;
		else
			return false;
	}

	var returnAction = function ()
	{
		if(emcmouseEvent.button == 1)
		{
			if(!emcmouseEvent.ctrlKey && !emcmouseEvent.shiftKey)
				return emcpref.primaryMenu;

			else if(!emcmouseEvent.ctrlKey && emcmouseEvent.shiftKey && emcpref.secondaryMenuEnabled)
				return emcpref.secondaryMenu;

			else
				return false;
		}
		else
		{
			return false;
		}
	}


	var display = function ()
	{
		updateAndReset();

		var action = returnAction();

		if( action == 'tabs' || action == 'visibleTabsMenu' )
			visibleTabsMenu();

		if( action  == 'tabsGroupsMenu')
			tabsGroupsMenu();

		if( action == 'history' || action == 'historyMenu' )
			historyMenu();

		if( action == 'toggleBookmarksSidebar' || action == 'bookmarksSidebarToggle' )
			bookmarksSidebarToggle();

		if( action == 'toggleDownloadsSidebar' || action == 'downloadSidebarToggle' )
			downloadSidebarToggle();

		if( action == 'toggleHistorySidebar' || action == 'historySidebarToggle' )
			historySidebarToggle();
	}


	var makePopupMenu = function(action, items, refresh)
	{
		items = ( typeof items == 'undefined' ) ? false : items;

		var tabs_popup = document.getElementById("senicar.emc." + action);

		while(tabs_popup.hasChildNodes())
			tabs_popup.removeChild(tabs_popup.firstChild);

		for ( var i = 0; i< items.length; i++)
		{
			var tab = items[i];

			if(tab == 'separator')
			{
				var menuseparator = tabs_popup.appendChild(document.createElement("menuseparator"));
			}
			else if (typeof tab == 'string' && tab && emcpref.displayGroupTitles)
			{
				// if tab is string it's most probably a group name
				var item = tabs_popup.appendChild(document.createElement("caption"));
				item.setAttribute("label", tab);
				item.setAttribute("disabled", true);
				item.classList.add("emc-grouptitle");
			}
			else if (typeof tab == 'object')
			{
				var item = tabs_popup.appendChild(document.createElement("menuitem"));

				item.setAttribute("index", tab._tPos);
				item.setAttribute("label", tab.label);
				
				// if page has no favicon show default
				if(!tab.getAttribute("image"))
					item.setAttribute("image", 'chrome://mozapps/skin/places/defaultFavicon.png');
				else
					item.setAttribute("image", tab.getAttribute("image"));

				item.classList.add("menuitem-iconic");

				if (tab.selected)
					item.classList.add("unified-nav-current");
			}
		}

		if(!refresh)
		{
			emcscreenX = emcmouseEvent.screenX;
			emcscreenY = emcmouseEvent.screenY;
			tabs_popup.openPopupAtScreen(emcmouseEvent.screenX, emcmouseEvent.screenY, true);
		}
	}

	var getTabGroup = function(tab)
	{
		var group = {};
		var tabviewtab;

		if(typeof tab != 'undefined')
		{
			// use _tabViewTabItem if available its more predictable
			if(typeof tab._tabViewTabItem != 'undefined' && !tab.pinned)
			{
				group.id = tab._tabViewTabItem.parent.id
				group.title = tab._tabViewTabItem.parent.getTitle();

				return group;
			}
			else if (tab.pinned) 
			{
				group.id = 0;
				group.title = null;
				return group;
			}
			else { return false; }
		}
		else { return false; }
	}



	//////////////////
	//
	// Public functions
	//
	//////////////////


	emc.init = function (event)
	{
		// init tabview in the background so _tabViewTabItem gets added to tabs
		TabView._initFrame(event);
	}


	emc.click = function (e)
	{
		emcmouseEvent = e;

		if( clickValid() )
		{
			display();
			// fix: linux selection buffer, if there's URL in buffer it doesn't try to open it
			// e.cancelBubble = true;
			e.stopPropagation();
		}
	}


	emc.closeTab = function(menu, item)
	{
		var action = menu.id.replace(/senicar.emc./g,'');
		var tab = gBrowser.tabContainer.getItemAtIndex(item.target.getAttribute('index'));
		var refresh = emcpref.refreshOnTabClose; 

		if(item.button == 1)
		{
			gBrowser.removeTab(tab);

			if(refresh)
			{
				if( action == 'tabs' || action == 'visibleTabsMenu' )
					visibleTabsMenu(refresh);

				if( action  == 'tabsGroupsMenu')
					tabsGroupsMenu(refresh);
			}
			else
				menu.hidePopup();
		}
	}


	//////////////////
	//
	// Actions
	//
	//////////////////


	var visibleTabsMenu= function (refresh)
	{
		var group;
		var tabs = [];

		// if tabs=gBrowser.visibleTabs there is another title added each time you open popup
		tabs.push.apply(tabs,gBrowser.visibleTabs);

		if( typeof refresh == 'undefined' ) refresh = false;

		// pick last tab, less possible to be pinned
		// and prepend title if exists
		group = getTabGroup(tabs[tabs.length-1]);
		if(typeof group.title == 'string')
			tabs.unshift(group.title);

		makePopupMenu("visibleTabsMenu", tabs, refresh);
	}


	var tabsGroupsMenu = function (refresh)
	{
		if( typeof refresh == 'undefined' ) refresh = false;
		var num = gBrowser.browsers.length;
		var tab;
		var tab_group;
		var parent_id;
		var groups = [];
		var tabs = [];

		for ( var x = 0; x< num; x++)
		{
			tab = gBrowser.tabContainer.getItemAtIndex(x);

			tab_group = getTabGroup(tab);

			// make unique array of groups
			if(groups.indexOf(tab_group.id) == -1)
				groups.push(tab_group.id);
		}

		for (var x = 0; x < groups.length; x++)
		{
			parent_id=groups[x];

			if(x != 0)
				tabs.push('separator');

			var first_group_item = true;
			for ( var y = 0; y < num; y++) 
			{
				tab = gBrowser.tabContainer.getItemAtIndex(y);
				tab_group = getTabGroup(tab);

				if(typeof tab_group.title == 'string' && tab_group.id == parent_id && first_group_item)
				{
					tabs.push(tab_group.title);
					first_group_item = false;
				}

				if(tab_group.id >= 0 && tab_group.id == parent_id)
					tabs.push(tab);

			}
		}

		makePopupMenu("tabsGroupsMenu", tabs, refresh);
	}


	var historyMenu = function ()
	{
		while(history_popup.hasChildNodes())
			history_popup.removeChild(history_popup.firstChild);

		var hasHistory = FillHistoryMenu(history_popup);
		var selectedTab = gBrowser.tabContainer.selectedItem;
		
		if(!hasHistory)
		{
			var menuitem = history_popup.appendChild(document.createElement("menuitem"));
			menuitem.setAttribute("index", "0");
			menuitem.setAttribute("label", selectedTab.label);
			menuitem.className = "unified-nav-current";
			var bundle_browser = document.getElementById("bundle_browser");
			var tooltipCurrent = bundle_browser.getString("tabHistory.current");
			menuitem.setAttribute("tooltiptext", tooltipCurrent);

		}
		
		history_popup.openPopupAtScreen(emcmouseEvent.screenX, emcmouseEvent.screenY, true);
	}


	var downloadSidebarToggle = function ()
	{
		toggleSidebar("viewDownloadsSidebar");
	}


	var historySidebarToggle = function ()
	{
		toggleSidebar("viewHistorySidebar");
	}


	var bookmarksSidebarToggle = function ()
	{
		toggleSidebar("viewBookmarksSidebar");
	}

	return emc;

}(senicar.emc));


// upgrade or install gracefully
Application.getExtensions(function(extensions) {
	var emcinfo = extensions.get("enhancedmiddleclick@senicar.net");

	if (emcinfo.firstRun)
	{
		/* Code related to firstrun */
		Services.prefs.setCharPref("extensions.enhancedmiddleclick.version",emcinfo.version);
	} else
	{
		try {
			var version = Services.prefs.getCharPref("extensions.enhancedmiddleclick.version");
			if (emcinfo.version > version) {
				/* Code related to upgrade */
				Services.prefs.setCharPref("extensions.enhancedmiddleclick.version", emcinfo.version);
			}
		} catch (ex) {
			/* Code related to a reinstall or upgrade old version, one without enhancedmiddleclick.version pref */
			Services.prefs.setCharPref("extensions.enhancedmiddleclick.version", emcinfo.version);
			try {
				// this setting was used before inline preferences and enhancedmiddleclick.version
				var useSecondaryMenu = Services.prefs.getBoolPref("extensions.enhancedmiddleclick.useSecondaryMenu");
				if(! useSecondaryMenu)
				{
					//Services.prefs.setCharPref("extensions.enhancedmiddleclick.secondaryMenu", "disable");
				}
			}
			catch (ex) {
			}
		}
	}
});


// true, to execute before selection buffer on linux
document.addEventListener("click", senicar.emc.click, true);

// if loaded to soon panorama won't work due to "redeclared const Cu" bug
// it has to load after the page is done to work in firefox
//
// needs eventListener on "load" so it runs on every new window
// needs observer to listen for browser-delayed-startup-finished, SSWindowStateReady doesn't fire in new windows
// 
// https://developer.mozilla.org/en-US/docs/DOM/Mozilla_event_reference
var ObserverDelayedStartup = {

register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(ObserverDelayedStartup, "browser-delayed-startup-finished", false);
	},

observe: function(subject, topic, data) {
		switch (topic) {
			case 'browser-delayed-startup-finished':
				senicar.emc.init();
				this.unregister();
				break;
		}
	},

unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(ObserverDelayedStartup, "browser-delayed-startup-finished");
	}
}

window.addEventListener("load", ObserverDelayedStartup.register, false);
window.addEventListener("unload", ObserverDelayedStartup.unregister, false);

