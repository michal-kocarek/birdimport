/**
 * Script for overlay for the Import dialog.
 *
 * @author Michal Kočárek michal.kocarek@brainbox.cz
 */

const Cc = Components.classes;
const Ci = Components.interfaces;

// importDialog.xul: http://mxr.mozilla.org/mozilla/source/mailnews/import/resources/content/importDialog.xul
// importDialog.js: http://mxr.mozilla.org/mozilla/source/mailnews/import/resources/content/importDialog.js

/*

var importService = Components.classes["@mozilla.org/import/import-service;1"].getService()

importService = importService.QueryInterface(Components.interfaces.nsIImportService)

var categoryManager = Components.classes["@mozilla.org/categorymanager;1"].getService();
categoryManager = categoryManager.QueryInterface(Components.interfaces.nsICategoryManager);

const CATEGORY_MAILNEWS_IMPORT = 'mailnewsimport';

// nsISimpleEnumerator
var en = categoryManager.enumerateCategory(CATEGORY_MAILNEWS_IMPORT);
var ar = [];
while(en.hasMoreElements()) {
	var prop = en.getNext().QueryInterface(Components.interfaces.nsISupportsCString); // class id
	var cid = prop.data; // string
	var im = Components.classesByID[cid].createInstance(Components.interfaces.nsIImportModule);
	print(''+cid+' - '+prop.data+' ** '+im.name+': '+im.description+'; supports: '+im.supports);
}
//print(ar);

// categoryManager.addCategoryEntry("mailnewsimport", "{1faf86b2-90b6-49ee-80ba-dd33612c1ba3}", "mail", false, true);



*/

(function() {
	
	var categoryManager = Cc["@mozilla.org/categorymanager;1"].getService().QueryInterface(Ci.nsICategoryManager);
	
	// Instantiate the importer to get information about what we import
	var tbImportModule = Cc['@mozilla.org/import/import-thebat;1'].createInstance(Ci.nsIImportModule);
	
	// mailnewsimport is name of category holding all available import modules.
	categoryManager.addCategoryEntry('mailnewsimport', Cc['@mozilla.org/import/import-thebat;1'].number, tbImportModule.supports, false, true);
	
})();
// Handling out data in XPCOM components:
// http://www.synovel.com/content/handling-out-parameters-javascript-xpcom-components
