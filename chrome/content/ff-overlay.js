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
	var pref = {}
	var preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.enhancedmiddleclick.");

	pref.primaryMenu = preferences.getCharPref("mainMenu");
	pref.secondaryMenu = preferences.getCharPref("secondaryMenu");
	pref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");

	// where click event is stored
	var mouseEvent;
	var screenX;
	var screenY;
	
	// used for debuging
	var report = function (msg)
	{
		Firebug.Console.log(msg);
		dump(msg);
	}


	var updateAndReset = function ()
	{
		pref.primaryMenu = preferences.getCharPref("mainMenu");
		pref.secondaryMenu = preferences.getCharPref("secondaryMenu");
		pref.secondaryMenuEnabled = preferences.getBoolPref("useSecondaryMenu");
	}


	// it validates only on empty page areas
	var clickValid = function ()
	{
		var t = mouseEvent.target
		var node = mouseEvent.target

		while(node && !(node instanceof HTMLAnchorElement)) {
			node = node.parentNode;
			if(node instanceof HTMLAnchorElement) {
				return false;
			}
		}
		
		if(!(t instanceof HTMLInputElement || t instanceof HTMLAnchorElement || t instanceof XULElement) && (t instanceof HTMLElement || t instanceof Element)) {
			return true;
		}
	}


	var uniqueArr = function(origArr)
	{
		var newArr = [],
			origLen = origArr.length,
			found,
			x, y;
	  
		for ( x = 0; x < origLen; x++ )
		{
			found = undefined;  
			for ( y = 0; y < newArr.length; y++ )
			{
				if ( origArr[x] === newArr[y] )
				{
				  found = true;
				  break;
				}
			}
			if ( !found) newArr.push( origArr[x] );
		}
	   return newArr;
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

	var makePopupMenu = function(items, refresh)
	{
		items = ( typeof items == 'undefined' ) ? false : items;

		var tabs_popup = document.createElement("menupopup");
		tabs_popup.setAttribute("oncommand", "gBrowser.tabContainer.selectedIndex = event.target.getAttribute('index');");
		//tabs_popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
		tabs_popup.setAttribute("onclick", "senicar.emc.closeTab(this, event);");
		document.getElementById("mainPopupSet").appendChild(tabs_popup);

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

		if(refresh)
			tabs_popup.openPopupAtScreen(screenX, screenY, true);
		else 
		{
			screenX = mouseEvent.screenX;
			screenY = mouseEvent.screenY;
			tabs_popup.openPopupAtScreen(mouseEvent.screenX, mouseEvent.screenY, true);
		}

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
			display();
	}


	emc.closeTab = function(menu, item)
	{
		var action = returnAction();
		var tab = gBrowser.tabContainer.getItemAtIndex(item.target.getAttribute('index'));
		if(item.button == 1)
		{
			gBrowser.removeTab(tab);
			menu.hidePopup();
			if( action == 'tabs' || action == 'visibleTabsMenu' )
				visibleTabsMenu(true);

			if( action  == 'tabsGroupsMenu')
				tabsGroupsMenu(true);
		}
	}


	//////////////////
	//
	// Actions
	//
	//////////////////


	var visibleTabsMenu= function (refresh)
	{
		refresh = ( typeof refresh == 'undefined' ) ? false : true;
		makePopupMenu(gBrowser.visibleTabs, refresh);
	}


	var tabsGroupsMenu = function (refresh)
	{
		refresh = ( typeof refresh == 'undefined' ) ? false : true;
		var num = gBrowser.browsers.length;
		var tab_id;
		var parent_id;
		var groups = [];
		var tabs = [];

		for ( var x = 0; x< num; x++)
		{
			tab_id = gBrowser.tabContainer.getItemAtIndex(x);
			if(tab_id.pinned)
				groups.push(0);
			else
				groups.push(tab_id._tabViewTabItem.parent.id);
		}

		var uniq = uniqueArr(groups);

		for (var x = 0; x < uniq.length; x++)
		{
			parent_id=uniq[x];
			uniq[x] = [];

			if(x != 0)
				tabs.push('separator');

			for ( var y = 0; y < num; y++) {
				tab_id = gBrowser.tabContainer.getItemAtIndex(y);
				if(tab_id.pinned)
				{
					if(parent_id == 0)
						tabs.push(tab_id);
				}
				else
				{
					if(tab_id._tabViewTabItem.parent.id == parent_id)
						tabs.push(tab_id);
				}
			}
		}

		makePopupMenu(tabs, refresh);
	}


	var historyMenu = function ()
	{
		var history_popup = document.createElement("menupopup");
		history_popup.setAttribute("oncommand", "gotoHistoryIndex(event); event.stopPropagation();");
		history_popup.setAttribute("onclick", "checkForMiddleClick(this, event);");
		document.getElementById("mainPopupSet").appendChild(history_popup);
		
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



document.addEventListener("click", senicar.emc.click, false);

// if loaded to soon panorama won't work due to "redeclared const Cu" bug
// it has to load after the page is done to work in firefox
window.addEventListener("load", senicar.emc.init, false);
