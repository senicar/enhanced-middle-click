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

	var pref = {}
	var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.enhancedmiddleclick.");

	pref.primaryMenu = preferences.getCharPref("mainMenu");
	pref.secondaryMenu = preferences.getCharPref("secondaryMenu");
	pref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");
	pref.refreshOnTabClose = preferences.getBoolPref("refreshOnTabClose");

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
	var mouseEvent;
	var screenX;
	var screenY;
	
	// used for debuging
	var report = function (msg)
	{
		// check if firebug even available, if you try to "report" and firebug
		// is not opened it will break addon
		if(typeof Firebug.Console == 'object' && debug)
			Firebug.Console.log(msg);
	}


	var updateAndReset = function ()
	{
		pref.primaryMenu = preferences.getCharPref("mainMenu");
		pref.secondaryMenu = preferences.getCharPref("secondaryMenu");
		pref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");
		pref.refreshOnTabClose = preferences.getBoolPref("refreshOnTabClose");
	}


	// it validates only on empty page areas, at least it tries
	var clickValid = function ()
	{
		var t = mouseEvent.target;

		// check if element is child of anchor
		while(t && !(t instanceof HTMLAnchorElement)) {
			t = t.parentNode;
			if(t instanceof HTMLAnchorElement) {
				return false;
			}
		}

		// reset t
		t = mouseEvent.target;

		if( !(t instanceof HTMLInputElement ||
			  t instanceof HTMLAnchorElement ||
			  t instanceof HTMLButtonElement ||
			  t instanceof HTMLVideoElement ||
			  t instanceof HTMLAudioElement ||
			  t instanceof HTMLTextAreaElement ||
			  t instanceof HTMLCanvasElement ||
			  t instanceof HTMLAppletElement ||
			  t instanceof HTMLSelectElement ||
			  t instanceof HTMLOptionElement ||
			  t instanceof XULElement) &&
			  (t instanceof HTMLElement ||
			  t instanceof SVGElement) &&
			  mouseEvent.button == 1 )
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	var returnAction = function ()
	{
		if(mouseEvent.button == 1)
		{
			if(!mouseEvent.ctrlKey && !mouseEvent.shiftKey)
				return pref.primaryMenu;

			else if(!mouseEvent.ctrlKey && mouseEvent.shiftKey && pref.secondaryMenuEnabled)
				return pref.secondaryMenu;

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
				var menuseparator = tabs_popup.appendChild(document.createElement("menuseparator"));
			else
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
			screenX = mouseEvent.screenX;
			screenY = mouseEvent.screenY;
			tabs_popup.openPopupAtScreen(mouseEvent.screenX, mouseEvent.screenY, true);
		}
	}

	var getTabGroup = function(tab)
	{
		var groupID;
		var tabviewtab;

		report(tab);

		// use _tabViewTabItem if available its more predictable
		if(typeof tab._tabViewTabItem != 'undefined' && !tab.pinned)
		{
			report("using _tabViewTabItem");
			groupID = tab._tabViewTabItem.parent.id
			return groupID;
		}
		else if(typeof tab.__SS_extdata != 'undefined' && !tab.pinned)
		{
			// __SS_extdata is undefined when no groups
			report("using __SS_extdata");

			// is null when tab is pinned
			if(tab.__SS_extdata["tabview-tab"] != 'null')
			{
				// sometimes groupID is not set, like when creating new tab
				tabviewtab = JSON.parse(tab.__SS_extdata["tabview-tab"]);
				if(typeof tabviewtab.groupID != 'undefined')
				{
					if(tabviewtab.groupID % 1 === 0)
					{
						return tabviewtab.groupID;
					}
					else { return false; }
				}
				else { return false; }
			}
			else { return false; }
		}
		else if (tab.pinned) 
		{
			return 0;
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
		mouseEvent = e;

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
		var refresh = pref.refreshOnTabClose; 

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
		if( typeof refresh == 'undefined' ) refresh = false;
		makePopupMenu("visibleTabsMenu", gBrowser.visibleTabs, refresh);
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
			report(tab);

			// make unique array of groups
			if(groups.indexOf(tab_group) == -1)
				groups.push(tab_group);
		}

		for (var x = 0; x < groups.length; x++)
		{
			parent_id=groups[x];

			if(x != 0)
				tabs.push('separator');

			for ( var y = 0; y < num; y++) 
			{
				tab = gBrowser.tabContainer.getItemAtIndex(y);
				tab_group = getTabGroup(tab);

				if(tab_group >= 0 && tab_group == parent_id)
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
		
		history_popup.openPopupAtScreen(mouseEvent.screenX, mouseEvent.screenY, true);
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


// true, to execute before selection buffer on linux
document.addEventListener("click", senicar.emc.click, true);

// if loaded to soon panorama won't work due to "redeclared const Cu" bug
// it has to load after the page is done to work in firefox
// 
// had to change to SSWindowStateReady in Firefox 19, before it worked with "load"
window.addEventListener("SSWindowStateReady", function load(event){
    window.removeEventListener("SSWindowStateReady", load, false); //remove listener, no longer needed
    senicar.emc.init(); 
},false);
