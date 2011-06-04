/**
 * // TODO: mk 2011-05-22 12:44:28: Missing comment
 */

// Import XPCOMUtils for setting the migrator component.
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

var jsm_lazyloaded = false;
function jsm_lazyload() {
	// FIX: mk 2011-05-30 20:04:59: In Gecko < 2.0 are modules loaded before .jsm modules,
	// this means that we are cannot load jsm from top-level scope.
	//
	// jsm_lazyload() needs to be called from every component constructor here
	// on the page.
	if (jsm_lazyloaded)
		return;
	jsm_lazyloaded = true;
	Components.utils.import('resource://birdimport/importkit_thebat.jsm');
}

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

// TODO: mk 2011-05-22 18:30:46: Get rid of / turn off the LOG()
function LOG(msg) {
	/** @type Components.interfaces.nsIConsoleService */
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	
	consoleService.logStringMessage('IM: '+msg);
}

// TODO: mk 2011-05-22 18:30:35: Get rid of dbgmd in this file

/**
 * Class ID of the The Bat! import module.
 */
const THEBAT_IMPORT_MODULE_CID = '{864d338b-bbc4-4cc1-bd82-027b85ef8e1e}';

/**
 * Class ID of the implementation of importing mail from The Bat!
 */
const IMPORT_THEBAT_MAIL_IMPL_CID = '{d7263931-21ea-4972-a335-6c62daa942f7}';

/**
 * String noting that module is able to import e-mails.
 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportModule.idl
 */
const NS_IMPORT_MAIL_STR = 'mail';

/** @type Components.interfaces.nsIStringBundleService */
var strBundleSrv = Cc['@mozilla.org/intl/stringbundle;1'].getService(Ci.nsIStringBundleService);
var strBundle = strBundleSrv.createBundle('chrome://birdimport/locale/birdimport.properties');

// TODO: mk 2011-05-30 20:06:12: Remove dbgmd when not needed anymore
function dbgmd() {
	this._file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
}

dbgmd.prototype = {
	
	// Properties for the XPCOM registration
	classID: Components.ID('{f6801fa0-848a-11e0-9d78-0800200c9a66}'),
	//classDescription: 'The import module for data from The Bat!',
	//contractID: '@mozilla.org/import/import-thebat;1',
	
	// Interface we are implementing
	// http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportMailboxDescriptor.idl
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIImportMailboxDescriptor]),
	
	_identifier: 0,
	get identifier() {
		LOG('DBGMD get identifier ['+this._identifier+']');
		return this._identifier;
	},
	set identifier(value) {
		LOG('DBGMD set identifier ['+value+']');
		this._identifier = value;
	},
	
	_depth: 0,
	get depth() {
		LOG('DBGMD get depth ['+this._depth+']');
		return this._depth;
	},
	set depth(value) {
		LOG('DBGMD set depth ['+value+']');
		this._depth = value;
	},
	
	_size: 0,
	get size() {
		LOG('DBGMD get size ['+this._size+']');
		return this._size;
	},
	set size(value) {
		LOG('DBGMD set size ['+value+']');
		this._size = value;
	},
	
	_displayName: '',
	GetDisplayName: function() {
		LOG('DBGMD GetDisplayName ['+this._displayName+']');
		return this._displayName;
	},
	SetDisplayName: function(value) {
		LOG('DBGMD SetDisplayName ['+value+']');
		this._displayName = value;
	},
	
	_import: false,
	get import() {
		LOG('DBGMD get import ['+this._import+']');
		return this._import;
	},
	set import(value) {
		LOG('DBGMD set import ['+value+']');
		this._import = value;
	},
	
	_file: null,
	get file() {
		LOG('DBGMD get import ['+this._file.path+']');
		return this._file;
	}
};

/**
 * Import module for the data from The Bat! application.
 *
 * Supports nsIImportModule interface.
 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportModule.idl
 */
function TheBatImportModule() {
	jsm_lazyload();
	LOG('TheBatImportModule ctor');
}

TheBatImportModule.prototype = {
	
	// Properties for the XPCOM registration
	classID: Components.ID(THEBAT_IMPORT_MODULE_CID),
	classDescription: 'The import module for data from The Bat!',
	contractID: '@mozilla.org/import/import-thebat;1',
	
	// Interface we are implementing
	// http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportModule.idl
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIImportModule]),
	
	/**
	 * Returns name of this import module.
	 *
	 * @returns {String} Module name.
	 */
	get name() {
		return strBundle.GetStringFromName('import.thebat.name');
	},
	
	/**
	 * Returns description of this import module.
	 *
	 * @returns {String} Module description.
	 */
	get description() {
		return strBundle.GetStringFromName('import.thebat.description');
	},
	
	/**
	 * Returns comma-separated list of supported values.
	 *
	 * @returns {String} Comma-separated list of supported values.
	 */
	get supports() {
		return NS_IMPORT_MAIL_STR;
	},
	
	get supportsUpgrade() {
		return false; // TODO: mk 2011-05-22 02:22:09: I don’t know, what's this, so better to disable it
	},
	
	/**
	 * @param {String} importType The type of desired import.
	 * @returns {Components.interfaces.nsISupports}
	 */
	GetImportInterface: function(importType) {
		
		if (importType == 'mail') { // TODO: mk 2011-05-22 02:41:06: Externalize the string
			
			// Import service http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportService.idl
			var importService = Cc['@mozilla.org/import/import-service;1'].getService().QueryInterface(Ci.nsIImportService);
			
			/** @type Components.interfaces.nsIImportGeneric http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportGeneric.idl */
			var iGeneric = importService.CreateNewGenericMail();
			
			/** @type Components.interfaces.nsIImportMail */
			var importMailImpl = Components.classesByID[IMPORT_THEBAT_MAIL_IMPL_CID].createInstance(Ci.nsIImportMail);
			
			/** @type Components.interfaces.nsISupportsString */
			var name_str = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
			name_str.data = strBundle.GetStringFromName('import.thebat.name');
			
			// Assignments inspired by http://mxr.mozilla.org/comm-central/source/mailnews/import/oexpress/nsOEImport.cpp, nsOEImport::GetImportIterface()
			// and http://mxr.mozilla.org/comm-central/source/mailnews/import/applemail/src/nsAppleMailImport.cpp, nsAppleMailImportModule::GetImportIterface()
			// Data keys are described in the interface.
			
			iGeneric.SetData('mailInterface', importMailImpl);
			
			// mk: Thunderbird uses the name attribute for composing the name of the root folder, where all imported e-mails are filed.
			iGeneric.SetData('name', name_str);
			
			LOG('GetImportIterface: Return prepared nsIImportGeneric');
			return iGeneric;
		}
		
		// Fallback - this should not happen
		throw Cr.NS_ERROR_NOT_AVAILABLE;
	}
};

/**
 * Import module for the e-mails from The Bat! application.
 *
 * Supports nsIImportMail interface.
 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportMail.idl
 */
function ImportTheBatMailImpl() {
	jsm_lazyload();
	LOG('ImportTheBatMailImpl ctor');
}

ImportTheBatMailImpl.prototype = {
	
	// Properties for the XPCOM registration
	classID: Components.ID(IMPORT_THEBAT_MAIL_IMPL_CID),
	//classDescription: '',
	//contractID: '',
	
	// Interface we are implementing
	// http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportMail.idl
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIImportMail]),
	
	/**
	 * If found and userVerify BOTH return false, then it is assumed that this
	 * means an error - mail cannot be found on this machine.
	 * If userVerify is true, the user will have an opportunity to specify
	 * a different location to import mail from.
	 *
	 * @param {Components.interfaces.nsIFile} location Out parameter.
	 * @param {Boolean} found Out parameter.
	 * @param {Boolean} userVerify Out parameter.
	 * @returns {Null}
	 */
	GetDefaultLocation: function(location, found, userVerify) {
		
		var location_str = ImportKit_TheBat.detectLocation();
		
		if (location_str) {
			var location_file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			location_file.initWithPath(location_str);
			
			location.value = location_file;
			found.value = true;
			userVerify.value = false;
			
			LOG('GetDefaultLocation found - ['+location_file.path+']');
		} else {
			LOG('GetDefaultLocation not found');
			
			location.value = null;
			found.value = false;
			userVerify.value = true; // Give the user the ability to choose the directory with The Bat! files
		}
	},
	
	/**
	 * Returns an nsISupportsArray which contains an nsIImportMailboxID for each
	 * mailbox. The array is not sorted before display to the user.
	 * 
	 * @param {Components.interfaces.nsIFile} location
	 * @returns {Components.interfaces.nsISupportsArray}
	 */
	FindMailboxes: function(location) {
		LOG('FindMailboxes [location:'+location.path+']');
		
		/** @type Components.interfaces.nsISupportsArray */
		var arr = Cc['@mozilla.org/supports-array;1'].createInstance(Ci.nsISupportsArray);
		
		// Get mailbox info
		var mailboxes = ImportKit_TheBat.findMailboxes(location.path);
		
		// Import service http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportService.idl
		var importService = Cc['@mozilla.org/import/import-service;1'].getService().QueryInterface(Ci.nsIImportService);
		
		/** @type Components.interfaces.nsIImportMailboxDescriptor
			http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportMailboxDescriptor.idl */
		
		for(var i in mailboxes) {
			var mailbox = mailboxes[i];
			// TODO: mk 2011-05-30 19:48:57: This is a debug version:
			//var mbd = Components.classesByID['{f6801fa0-848a-11e0-9d78-0800200c9a66}'].createInstance(Ci.nsIImportMailboxDescriptor); // dbgmd
			var mbd = importService.CreateNewMailboxDescriptor();
			
			mbd.identifier = mailbox.identifier;
			mbd.depth = mailbox.depth;
			
			if (mailbox.filepath)
				mbd.file.initWithPath(mailbox.filepath);
			mbd.size = mailbox.size;
			
			// This means, whether the actual ImportMailbox function is called, or only the folder is created.
			mbd.import = mailbox.do_import;
			
			mbd.SetDisplayName(mailbox.dirname);
			
			//LOG('FindMailboxes - appending box [id:'+mbd.identifier+'; displayname:'+mbd.GetDisplayName()+'] on path ['+mbd.file.path+']');
			arr.AppendElement(mbd);
		}
		
		LOG('FindMailboxes - returns '+arr.Count()+' items');
		return arr;
	},
	
	/**
	 * Import a specific mailbox into the destination file supplied.  If an error
	 * occurs that is non-fatal, the destination will be deleted and other mailboxes
	 * will be imported.  If a fatal error occurs, the destination will be deleted
	 * and the import operation will abort.
	 *
	 * @param {Components.interfaces.nsIImportMailboxDescriptor} source
	 * @param {Components.interfaces.nsIFile} destination
	 * @param {String} errorLog Out parameter.
	 * @param {String} successLog Out parameter.
	 * @param {Boolean} fatalError Out parameter.
	 * @returns {Null}
	 */
	ImportMailbox: function(source, destination, errorLog, successLog, fatalError) {
		LOG('ImportMailbox [source:'+source.GetDisplayName()+'; destination: '+destination.path+' - '+destination.target+']');
		
		
		
		//throw Cr.NS_ERROR_NOT_IMPLEMENTED;
	},
	
	/**
	 * Return the amount of the mailbox that has been imported so far.  This number
	 * is used to present progress information and must never be larger than the
	 * size specified in nsIImportMailboxID.GetSize();  May be called from
	 * a different thread than ImportMailbox()
	 *
	 * @returns {Number}
	 */
	GetImportProgress: function() {
		LOG('GetImportProgress');
		//throw Cr.NS_ERROR_NOT_IMPLEMENTED;
	},
	
	/**
	 * When migrating the local folders from the import source into mozilla,
	 * we want to translate reserved folder names from the import source to
	 * equivalent values for Mozilla.
	 * Localization Impact is unknown here.
	 *
	 * @param {String} aFolderName
	 * @returns {String}
	 */
	translateFolderName: function(aFolderName) {
		var return_name = aFolderName;
		//throw Cr.NS_ERROR_NOT_IMPLEMENTED;
		
		// TODO: mk 2011-05-30 20:15:54: Didn’t found when this is used
		
		LOG('translateFolderName ['+aFolderName+'] -> ['+return_name+']');
		return aFolderName;
	}
};

var components = [TheBatImportModule, ImportTheBatMailImpl, dbgmd];

// The actual hook into XPCOM
if (typeof XPCOMUtils !== 'undefined' && !!XPCOMUtils.generateNSGetFactory) {
	// Gecko 2 uses a different component registration strategy and registers categories in chrome.manifest
	var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
} else {
	// Older Firefox requires manually setting up category entries
	var NSGetModule = function NSGetModule(compMgr, fileSpec) {
		return XPCOMUtils.generateModule(components);
	}
}
