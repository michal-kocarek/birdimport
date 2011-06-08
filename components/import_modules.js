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
 * The Initial Developer of the Original Code is Michal Kočárek <code@brainbox.cz>.
 * 
 * Copyright (C) 2011, Michal Kočárek. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * This file contains XPCOM modules used in Mozilla Thunderbird
 * for importing e-mail messages from The Bat!
 * 
 * @author Michal Kočárek
 * @since 2011.06.04
 */

// Import XPCOMUtils for setting the migrator component.
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

// Import PluralForm for better localization possibilities
Components.utils.import("resource://gre/modules/PluralForm.jsm");

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
	Components.utils.import('resource://birdimport/tbtools.jsm');
}

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

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
 *
 * Constant name and value copied from following file.
 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportModule.idl
 */
const NS_IMPORT_MAIL_STR = 'mail';

/**
 * Comma-separated string of supported import types.
 *
 * See nsIImportModule::supports() for more info.
 */
const THEBAT_IMPORT_MODULE_SUPPORTS = NS_IMPORT_MAIL_STR;

/** @type Components.interfaces.nsIStringBundle
 * String bundle for Bird Import. */
const strBundle = Cc['@mozilla.org/intl/stringbundle;1']
	.getService(Ci.nsIStringBundleService)
	.createBundle('chrome://birdimport/locale/birdimport.properties');

/**
 * Import module for the data from The Bat! application.
 *
 * Supports nsIImportModule interface.
 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportModule.idl
 */
function TheBatImportModule() {
	jsm_lazyload();
	TbTools.log('TheBatImportModule ctor');
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
		return THEBAT_IMPORT_MODULE_SUPPORTS;
	},
	
	/**
	 * Unknown method.
	 *
	 * mk 2011-06-08: I could not find the meaning for this method.
	 *
	 * @returns {Boolean} A boolean value of unknown meaning.
	 */
	get supportsUpgrade() {
		// As found on MXR: http://mxr.mozilla.org/comm-central/ident?i=supportsUpgrade,
		// some import modules return true, some false. :-)
		//
		// So just return false and don’t think about it!
		return false; // Yes, Sir!
	},
	
	/**
	 * @param {String} importType The type of desired import.
	 * @returns {Components.interfaces.nsISupports}
	 */
	GetImportInterface: function(importType) {
		
		if (importType == NS_IMPORT_MAIL_STR) {
			
			// Import service http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportService.idl
			var importService = Cc['@mozilla.org/import/import-service;1'].getService().QueryInterface(Ci.nsIImportService);
			
			/** @type Components.interfaces.nsIImportGeneric
			 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportGeneric.idl */
			var iGeneric = importService.CreateNewGenericMail();
			
			/** @type Components.interfaces.nsIImportMail */
			var importMailImpl = Components.classesByID[IMPORT_THEBAT_MAIL_IMPL_CID].createInstance(Ci.nsIImportMail);
			
			/** @type Components.interfaces.nsISupportsString */
			var name_str = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
			name_str.data = strBundle.GetStringFromName('import.thebat.name');
			
			// Assignments to iGeneric inspired by http://mxr.mozilla.org/comm-central/source/mailnews/import/oexpress/nsOEImport.cpp, nsOEImport::GetImportIterface()
			// and http://mxr.mozilla.org/comm-central/source/mailnews/import/applemail/src/nsAppleMailImport.cpp, nsAppleMailImportModule::GetImportIterface()
			// Data keys are described in the interface.
			
			iGeneric.SetData('mailInterface', importMailImpl);
			
			// mk: This attribute is used as part of name for the root target folder.
			iGeneric.SetData('name', name_str);
			
			TbTools.log('GetImportIterface: Return prepared nsIImportGeneric');
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
	TbTools.log('ImportTheBatMailImpl ctor');
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
		
		var location_str = TbTools.detectLocation();
		
		if (location_str) {
			var location_file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
			location_file.initWithPath(location_str);
			
			location.value = location_file;
			found.value = true;
			userVerify.value = false;
			
			TbTools.log('GetDefaultLocation found - ['+location_file.path+']');
		} else {
			TbTools.log('GetDefaultLocation not found');
			
			location.value = null;
			found.value = false;
			userVerify.value = false; // true: Give the user the ability to choose the directory; false: do not
		}
	},
	
	/**
	 * @type Array
	 * Array of mailbox info get in FindMailboxes().
	 */
	_mailboxes: [],
	
	/**
	 * Returns an nsISupportsArray which contains an nsIImportMailboxID for each
	 * mailbox. The array is not sorted before display to the user.
	 * 
	 * @param {Components.interfaces.nsIFile} location
	 * @returns {Components.interfaces.nsISupportsArray}
	 */
	FindMailboxes: function(location) {
		TbTools.log('FindMailboxes [location:'+location.path+']');
		
		// Get mailbox info
		this._mailboxes = TbTools.findMailboxes(location.path);
		
		/** @type Components.interfaces.nsIImportService
		 * Import service http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportService.idl */
		var importService = Cc['@mozilla.org/import/import-service;1'].getService(Ci.nsIImportService);
		
		/** @type Components.interfaces.nsISupportsArray */
		var arr = Cc['@mozilla.org/supports-array;1'].createInstance(Ci.nsISupportsArray);
		
		for(var i in this._mailboxes) {
			var mailbox = this._mailboxes[i];
			
			/** @type Components.interfaces.nsIImportMailboxDescriptor
			 * http://mxr.mozilla.org/comm-central/source/mailnews/import/public/nsIImportMailboxDescriptor.idl */
			var mbd = importService.CreateNewMailboxDescriptor();
			
			mbd.identifier = i; // use index of the _mailboxes array, because this is used in ImportMailbox as well
			mbd.depth = mailbox.depth;
			
			if (mailbox.filepath) {
				// If the filepath is null, it is just a stub (plain folder without files).
				mbd.file.initWithPath(mailbox.filepath);
			}
			mbd.size = mailbox.size;
			
			// This means, whether the actual ImportMailbox function is called, or only the folder is created.
			mbd.import = mailbox.do_import;
			
			mbd.SetDisplayName(mailbox.dirname);
			
			//TbTools.log('FindMailboxes - appending box [id:'+mbd.identifier+'; displayname:'+mbd.GetDisplayName()+'] on path ['+mbd.file.path+']');
			arr.AppendElement(mbd);
		}
		
		TbTools.log('FindMailboxes - returns '+arr.Count()+' items');
		return arr;
	},
	
	/**
	 * @type TbbMessageIterator
	 */
	_reader: null,
	
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
		TbTools.log('ImportMailbox [source:'+source.GetDisplayName()+'; destination: '+destination.path+' - '+destination.target+']');
		
		// True/false according whether we are importing the Outbox folder.
		// FIX: mk 2011-06-05 20:08:14: We need special care for the Outbox folder.
		var is_importing_outbox = source.depth == 2 && source.file.parent.leafName == 'Outbox';
		
		var parked_tag_name = strBundle.GetStringFromName('import.thebat.tag.parked.name');
		var parked_tag_color = strBundle.GetStringFromName('import.thebat.tag.parked.color');
		
		var ostream, ostream_buf,
			success_msg = '', error_msg = '', is_fatal = false,
			mailbox = this._mailboxes[ source.identifier ]; // identifier is index from the array;
		
		var flush_data_callback = function(data) {
			ostream_buf.write(data, data.length);
		};
		
		var after_message_callback = function(i) {
			if (i%100 == 0)
				TbTools.log('Imported '+i+' messages.');
			ostream_buf.write("\r\n", 2 /* 2 = length of \r\n */);
		};
		
		// Keywords described in http://kb.mozillazine.org/Tags
		// Service http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsIMsgTagService.idl
		// Usage of service: addTagCallback() in http://mxr.mozilla.org/comm-central/source/mail/components/preferences/display.js
		parked_label = null;
		var wants_parked_label_callback = function() {
			if (parked_label === null) {
				// First access – we have to return or create the tag
				/** @type Components.interfaces.nsIMsgTagService */
				var tag_service = Cc['@mozilla.org/messenger/tagservice;1'].getService(Ci.nsIMsgTagService);
				parked_label = tag_service.getKeyForTag(parked_tag_name);
				if (!parked_label) {
					// We have to create the tag
					tag_service.addTag(parked_tag_name, parked_tag_color, '');
					parked_label = tag_service.getKeyForTag(parked_tag_name);
				}
			}
			TbTools.log('Have parked label: '+parked_label);
			return parked_label;
		};
		
		var reader = new TbbMessageIterator(source.file.path);
		var converter = new ConvertTbbToMboxIterator(reader, flush_data_callback, after_message_callback, wants_parked_label_callback);
		converter.isConvertingOutbox = is_importing_outbox;
		
		try {
			
			/** @type Components.interfaces.nsIFileOutputStream */
			ostream = Cc["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
			ostream.init(destination.QueryInterface(Ci.nsILocalFile), -1 /* default PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE */, -1 /* default */, 0);
			
			/** @type Components.interfaces.nsIBufferedOutputStream */
			ostream_buf = Cc['@mozilla.org/network/buffered-output-stream;1'].createInstance(Ci.nsIBufferedOutputStream);
			ostream_buf.init(ostream, 8192);
			
			this._reader = reader; // keep this for GetImportProgress, because it may be called from different thread
			
			converter.convert();
			
			this._reader = null;
			
			// Everything’s fine
			success_msg = this._formatSuccessMessage(mailbox, converter.convertedEmails);
		} catch(ex) {
			// Modify a bit the exception to contain more information for the log
			ex.message = 'ImportMailbox ['+mailbox.relativepath+'] ('+converter.convertedEmails+'): '+ex.message+"\r\n\r\nStacktrace:\r\n"+ex.stack;
			Components.utils.reportError(ex); // Log the error
			
			error_msg = this._formatErrorMessage(mailbox); // Store the message
		} finally {
			// Finalize - close all handles
			if (ostream_buf) {
				ostream_buf.QueryInterface(Ci.nsISafeOutputStream);
				ostream_buf.nsISafeOutputStream.finish();
				ostream_buf = null; // prevent memory leak
			}
			
			if (ostream) {
				ostream.QueryInterface(Ci.nsISafeOutputStream);
				ostream.finish();
				ostream = null // prevent memory leak
			}
		}
		
		successLog.value = success_msg;
		errorLog.value = error_msg;
		fatalError.value = is_fatal;
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
		var ret = 0;
		if (this._reader)
			ret = this._reader.currentPosition;
		//TbTools.log('GetImportProgress ['+ret+']');
		return ret;
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
		// mk 2011-05-30 20:15:54: I really don’t know, where is this function used.
		// So just return the original name.
		var return_name = aFolderName+'-x';
		
		TbTools.log('translateFolderName ['+aFolderName+'] -> ['+return_name+']');
		return return_name;
	},
	
	/**
	 * @private
	 */
	_formatSuccessMessage: function(mailbox, message_count) {
		// Format the number of imported messages first.
		var message,
			imported_part = PluralForm.get(message_count, strBundle.GetStringFromName('import.thebat.success.count'));
		imported_part = imported_part.replace('%d', message_count);
		
		let (args = [mailbox.relativepath, imported_part]) {
			message = strBundle.formatStringFromName('import.thebat.success', args, args.length)+"\r\n";
		};
		return message;
	},
	
	/**
	 * @private
	 */
	_formatErrorMessage: function(mailbox) {
		var message;
		let (args = [mailbox.relativepath]) {
			message = strBundle.formatStringFromName('import.thebat.error', args, args.length)+"\r\n";
		};
		return message;
	}
	
};

var components = [TheBatImportModule, ImportTheBatMailImpl];

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
