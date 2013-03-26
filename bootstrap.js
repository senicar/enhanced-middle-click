/* See license.txt for terms of usage */

// ********************************************************************************************* //
// XPCOM

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

// ********************************************************************************************* //
// Constants

// Default preferences for bootstrap extensions are registered dynamically.
var defaultPrefs =
{
	"DBG_EMC": true,
	"BRANCH": Services.prefs.getBranch("extensions.enhancedmiddleclick."),
}

// ********************************************************************************************* //
// Firefox Bootstrap API
function install(data, reason) {}

function uninstall(data, reason) {
	// delete all preferences on this branch
	defaultPrefs.BRANCH.deleteBranch("");
}

function startup(data, reason) {}

function shutdown(data, reason) {}
// ********************************************************************************************* //
