/* See license.txt for terms of usage */

// ********************************************************************************************* //
// XPCOM

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;

// ********************************************************************************************* //
// Constants

// Default preferences for bootstrap extensions are registered dynamically.
var defaultPrefs =
{
    "DBG_EMC": true,
}

// ********************************************************************************************* //
// Firefox Bootstrap API

function install(data, reason) {}
function uninstall(data, reason) {}
function startup(data, reason) {}
function shutdown(data, reason) {}
// ********************************************************************************************* //
