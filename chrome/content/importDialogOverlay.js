/* ***** BEGIN LICENSE BLOCK *****
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Bird Import.
 * 
 * The Initial Developer of the Original Code is Michal Kočárek <michal.kocarek@brainbox.cz>.
 * 
 * Copyright (C) 2011, Michal Kočárek. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Script is used in the overlay of the Mozilla Thunderbird Import dialog.
 *
 * File registers the The Bat! importer just when the dialog is shown,
 * and that allows importing the The Bat! e-mails.
 *
 * We are not registering the importer permanently, because it is buggy.
 *
 * @author Michal Kočárek michal.kocarek@brainbox.cz
 * @since 2011.06.04
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
	
	/** @type Components.interfaces.nsICategoryManager */
	var categoryManager = Cc["@mozilla.org/categorymanager;1"].getService().QueryInterface(Ci.nsICategoryManager);
	
	// Instantiate the importer to get information about what we import
	var tbImportModule = Cc['@mozilla.org/import/import-thebat;1'].createInstance(Ci.nsIImportModule);
	
	// mailnewsimport is name of category holding all available import modules.
	categoryManager.addCategoryEntry('mailnewsimport', Cc['@mozilla.org/import/import-thebat;1'].number, tbImportModule.supports, false, true);
	
})();
// Handling out data in XPCOM components:
// http://www.synovel.com/content/handling-out-parameters-javascript-xpcom-components
