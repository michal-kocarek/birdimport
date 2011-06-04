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
 * // TODO: mk 2011-05-22 14:36:46: Add here caption
 * 
 * @author Michal Kočárek michal.kocarek@brainbox.cz
 */

// TODO: mk 2011-05-22 15:03:24: FIX THIS!
netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');

// Symbols exported to the outer scope.
const EXPORTED_SYMBOLS = ['ImportKit_TheBat', 'ConvertTbbToMboxIterator'];

// Shorthands
const Cc = Components.classes;
const Ci = Components.interfaces;

/**
 * Registry key containing the path to The Bat! working directory.
 *
 * Value is REG_SZ, but can contain environment variables. ("%APPDATA%\The Bat!")
 */
const USERDIR_REGKEY = 'HKCU\\SOFTWARE\\RIT\\The Bat!\\Working Directory';

/**
 * Registry key containing the current ANSI codepage number used by the system.
 *
 * Type is REG_SZ, value is same as the result of WINAPI GetACP() function. ("1252")
 */
const ACP_REGKEY = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage\\ACP';

/**
 * Filename of The Bat!’s message storage files.
 */
const MAILBOX_FILENAME = 'MESSAGES.TBB';

/**
 * Magic sequence at the start of TBB files in BIG ENDIAN format.
 */
const TBB_GLOBAL_HEADER_START = 0x20067919;

/**
 * Magic sequence at the start of each e-mail message in BIG ENDIAN format.
 */
const TBB_MAIL_HEADER_START = 0x21097019;

const TBB_FLAG_DELETED = 1 << 0;

const TBB_FLAG_READ = 1 << 1;

const TBB_FLAG_ANSWERED = 1 << 2;

// Znamená zaparkováno -NEBO- bude odesláno (je-li složka Outbox)
const TBB_FLAG_PARKED = 1 << 3;

const TBB_FLAG_HAS_ATTACHMENT = 1 << 4;

const TBB_FLAG_ATTACHMENT_NOT_INCLUDED = 1 << 5;

const TBB_FLAG_FLAGGED = 1 << 6;

const TBB_FLAG_FORWARDED = 1 << 7;

// TODO: mk 2011-05-30 22:53:39: Priority info can be probably removed, because is contained in headers
///**
// * TBB flag for Lowest (1) priority in Big Endian.
// *
// * Value comes from manual observation of priority
// * status for TBB messages in The Bat! 5.0.12.
// */
//const TBB_PRIORITY_LOWEST = 0xFFFFFFFE;
//
///**
// * TBB flag for Low (2) priority in Big Endian.
// *
// * Value comes from manual observation of priority
// * status for TBB messages in The Bat! 5.0.12.
// */
//const TBB_PRIORITY_LOW = 0xFFFFFFFF;
//
///**
// * TBB flag for Normal (3) priority in Big Endian.
// *
// * Value comes from manual observation of priority
// * status for TBB messages in The Bat! 5.0.12.
// */
//const TBB_PRIORITY_NORMAL = 0x00000000;
//
///**
// * TBB priority flag for High (4) priority in Big Endian.
// *
// * Value comes from manual observation of priority
// * status for TBB messages in The Bat! 5.0.12.
// */
//const TBB_PRIORITY_HIGH = 0x00000001;
//
///**
// * TBB priority flag for Highest (5) priority in Big Endian.
// *
// * Value comes from manual observation of priority
// * status for TBB messages in The Bat! 5.0.12.
// */
//const TBB_PRIORITY_HIGHEST = 0x00000002;

function log(msg) {
	// TODO: mk 2011-05-22 15:25:31: FIX THIS
	console.log('IK: '+msg); return;
	
	/** @type Components.interfaces.nsIConsoleService */
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	consoleService.logStringMessage('IK: '+msg);
}

/**
 * Static class with utilities for importing data from The Bat! client.
 * 
 * @static
 */
ImportKit_TheBat = {
	
	/**
	 * Detect the location of The Bat! files.
	 * 
	 * @returns {String} Path to the The Bat! files. False, when not found or not installed.
	 */
	detectLocation: function() {
		
		var user_dir = RegTools.readStringValue(USERDIR_REGKEY);
		
		if (!user_dir)
			return false;
		
		var abs_user_dir = FileTools.expandEnvironmentStrings(user_dir);
		
		var fp = FileTools.openFile(abs_user_dir);
		
		if (!fp.exists()) {
			log('detectLocation: Directory ['+abs_user_dir+'] not exists.');
			return false;
		} else {
			log('detectLocation: Directory ['+abs_user_dir+'] exists.');
			return abs_user_dir;
		}
	},
	
	/**
	 * Returns array of mailbox informations
	 *
	 * @param {String} dirpath Path to the The Bat! files.
	 * @returns {Array} Array of objects containing mailbox information.
	 */
	findMailboxes: function(dirpath) {
		log('findMailboxes ['+dirpath+']');
		// Array of found mailboxes to return.
		var mailboxes = [];
		
		var finder = new TbMailboxFinder(dirpath);
		var mailboxes = finder.findMailboxes();
		// First found the mailbox accounts.
		
		log('findMailboxes - found ['+mailboxes.length+'] mailboxes');
		
		return mailboxes;
	},
	
	/**
	 * Returns new instance of the TBB mailbox parser.
	 *
	 * @param {String} Filepath to the .TBB file.
	 * @returns {TbbParser} New instance of the parser.
	 */
	createMailboxReader: function(filepath) {
		// TODO: mk 2011-05-30 21:27:29: Tohle by se dalo klidně vyexternalizovat jako Symbol
		var reader = new TbbMessageIterator(filepath);
		return reader;
	},
	
};

/**
 * Instance of this class can discover mailbox folders
 * for the TBB file.
 *
 * @param {String} dirpath The dirpath to the The Bat! working directory.
 *
 * @constructor
 * @class TbMailboxFinder
 */
function TbMailboxFinder(dirpath) {
	if (!/\\$/.test(dirpath))
		dirpath += '\\';
	this._dirpath = dirpath;
}

TbMailboxFinder.prototype = {
	
	/**
	 * Dirpath to the working directory.
	 * @type String
	 */
	_dirpath: '',
	
	/**
	 * @type Number
	 */
	_depth: 0,
	
	/**
	 * @type Array Array of objects with these keys: {identifier: int, depth: int, size: int; filepath: string; do_import: }
	 */
	_mailboxes: [],
	
	/**
	 * This is the main function which iterates over TB mailboxes
	 * and fills internal variables with information about them.
	 *
	 * Function should be called only once.
	 *
	 * @returns {Array} Array of objects with these keys: {identifier: int, depth: int, size: int; filepath: string}
	 */
	findMailboxes: function() {
		/**
		 * There are account folders in the Bat’s working directory.
		 * Each account folder has hierarchical structure of e-mail folders.
		 * 
		 * Account folder can be either for regular accounts (eg. e-mail accounts)
		 * or normal folder without any account association (eg. local folders).
		 *
		 * First level (account folders) can be read from the AccOrder.CFG file,
		 * located directly in the working directory.
		 *
		 * Account folder contain several ACCOUNT.* files. These files are binary
		 * and their structure is unknown.
		 *
		 * Under account folders is a hierarchy of folders, which can be preserved as-is.
		 * Each of these folders can contain two files: MESSAGES.TBB and MESSAGES.TBN.
		 *
		 * MESSAGES.TBN is sort of index, and is not important.
		 * MESSAGES.TBB is the actual database for the messages. This file must be processed and imported.
		 */
		
		// First discover the account folders.
		// For each account recursively iterate through its folders to get all mailboxes.
		
		// Reset default variables
		this._depth = 1; // 1 according the GetMailboxList() in http://mxr.mozilla.org/comm-central/source/mailnews/import/oexpress/nsOEScanBoxes.cpp
		this._mailboxes = [];
		
		//log('findMailboxes - before loop');
		
		for(var account_dirpath in this._discoverAccountFolders()) {
			this._discoverMailboxes(account_dirpath);
		}
		
		//log('findMailboxes - after loop');
		
		return this._mailboxes;
	},
	
	/**
	 * This iterator discovers account folder paths and returns them as String.
	 *
	 * @yields {String} Account folder dirpath.
	 * @private
	 */
	_discoverAccountFolders: function() {
		// open the accounts file
		var accorder_path = this._dirpath + 'AccOrder.CFG';
		var accorder = FileTools.openFile(accorder_path);
		
		if (!accorder.exists())
			throw new Error('File ['+accorder_path+'] does not exist. Cannot discover account folders.');
		
		// open an input stream from file
		/** @type Components.interfaces.nsIFileInputStream */
		var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		istream.init(accorder, 0x01 /* PR_RDONLY */, -1 /* not used */, 0);
		
		// initialize the converter
		var src_charset = FileTools.getAnsiCharset();
		/** @type Components.interfaces.nsIConverterInputStream */
		var icstream = Cc['@mozilla.org/intl/converter-input-stream;1'].createInstance(Ci.nsIConverterInputStream);
		icstream.init(istream, src_charset, 0 /* default size */, 0 /* throw exception on unknown character */);
		/** @type Components.interfaces.nsIUnicharLineInputStream */
		icstream.QueryInterface(Ci.nsIUnicharLineInputStream);
		
		// Now read the lines from the accounts file.
		// Lines have following format:
		// - \\account_name : account_name is folder for actual e-mail account
		// - \\\folder_name: folder_name is just the folder for e-mails
		//
		// We need to process both types, because both can contain the
		// e-mails.
		
		var lines = [];
		
		// Fill lines array with valid lines from the file
		var tmp_line = {}, has_more;
		do {
			has_more = icstream.readLine(tmp_line);
			var line = (''+tmp_line.value).trim();
			if (line)
				lines.push(line);
		} while(has_more);
		delete tmp_line, has_more;
		
		icstream.close();
		istream.close();
		
		// Process lines array
		for(var i = 0, lines_length = lines.length; i < lines_length; ++i) {
			var line = lines[i], matches, dirname;
			if (matches = line.match(/^\\\\([^\\]+)$/)) {
				// \\account_name
				dirname = matches[1];
			} else if (matches = line.match(/^\\\\\\([^\\]+)$/)) {
				// \\folder_name
				dirname = matches[1];
			} else {
				throw new Error('Invalid format of line in AccOrder.cfg ['+line+']');
			}
			
			var dirpath = this._dirpath + dirname;
			var dirfile = FileTools.openFile(dirpath);
			
			if (!dirfile.exists()) {
				log('Skipping dirname ['+dirname+'] - directory not exists.');
			}
			
			yield dirpath;
		}
		
		throw StopIteration;
	},
	
	/**
	 * Function adds mailbox file in this directory to the results (if exists)
	 * and recursively discovers mailboxes in subdirectories (calls itself).
	 *
	 * @param {String} dirpath The current directory path.
	 */
	_discoverMailboxes: function(dirpath) {
		
		// First check, if there is a mailbox file in this folder.
		// If so, add it to the results.
		// Then loop through the subdirectories and discover mailboxes in them.
		
		var mailbox_filepath = dirpath + '\\' + MAILBOX_FILENAME;
		var mailbox_file = FileTools.openFile(mailbox_filepath);
		
		var subdirectories = [];
		
		var dirpath_file = FileTools.openFile(dirpath);
		
		var directoryEntries = dirpath_file.directoryEntries;
		while(directoryEntries.hasMoreElements()) {
			var subdirectory = directoryEntries.getNext().QueryInterface(Ci.nsILocalFile);
			if (subdirectory.isDirectory()) {
				subdirectories.push(subdirectory.path);
			}
		}
		
		if (mailbox_file.exists()) {
			// Add the result object.
			this._addMailboxToResults(mailbox_file.path, mailbox_file.fileSize, dirpath_file.leafName, true);
		} else if (subdirectories.length) {
			this._addMailboxToResults(null, 0, dirpath_file.leafName, false); // do not actually do the import, just create folder
		}
		
		++this._depth;
		for(var i = 0, subdirectories_length = subdirectories.length; i < subdirectories_length; ++i) {
			this._discoverMailboxes(subdirectories[i]);
		}
		--this._depth;
		
	},
	
	_addMailboxToResults: function(filepath, filesize, dirname, do_import) {
		var mailbox = {
			identifier: this._mailboxes.length,
			depth: this._depth,
			filepath: filepath,
			size: filesize,
			dirname: dirname,
			do_import: do_import
		};
		//log('Adding result [identifier: '+mailbox.identifier+'; depth: '+mailbox.depth+'; dirname: '+mailbox.dirname+'; size:'+mailbox.size+'; filepath:'+mailbox.filepath+']');
		this._mailboxes.push(mailbox);
	}
	
};

/**
 * Instance of this class is able to iterate over the TBB file and
 * return formatted e-mail message usable in Thunderbird.
 *
 * @param {String} filepath The filepath to the TBB file.
 *
 * @constructor
 * @class TbbMessageIterator
 */
function TbbMessageIterator(filepath) {
	this._filepath = filepath;
}

TbbMessageIterator.prototype = {
	
	/**
	 * Filepath to the TBB file
	 * @type String
	 */
	_filepath: '',
	
	/**
	 * Actually opened file handler.
	 * @type Components.interfaces.nsILocalFile
	 */
	_file: null,
	
	/**
	 *Actually opened input stream.
	 * @type Components.interfaces.nsIFileInputStream
	 */
	_istream: null,
	
	/**
	 * Actually opened binary stream, from which we read the message.
	 * @type Components.interfaces.nsIBinaryInputStream
	 */
	_bstream: null,
	
	_filesize: 0,
	
	_curpos: 0,
	
	/**
	 * Iterates over the TBB file and returns e-mail messages for
	 * the work in Thunderbird.
	 *
	 * // TODO: mk 2011-05-24 17:37:27: Fix the description
	 */
	__iterator__: function() {
		this._openFile();
		
		log('TBB reading started [size:'+this._filesize+'; pos:'+this._curpos+']');
		
		this._readHeader();
		
		while(this._bstream.available()) {
			var message = this._readMessage();
			yield message;
		}
		
		log('TBB reading finished [size:'+this._filesize+'; pos:'+this._curpos+']');
		
		this._closeFile();
		
		throw StopIteration;
	},
	
	_readHeader: function() {
		var bs = this._bstream;
		
		// Read first magic bytes - always same
		var magic_bytes = bs.read32();
		if (magic_bytes != TBB_GLOBAL_HEADER_START)
			throw new Error('Unexpected global start byte sequence ['+magic_bytes+'], expected ['+TBB_GLOBAL_HEADER_START+']');
		
		var header_length = this._endianSwap16(bs.read16());
		
		// header_length is sum of magic_bytes (4), header_length (2) and unkown_data (var)
		var unknown_data = bs.readBytes(header_length - 4 - 2, null);
		
		this._curpos += header_length;
	},
	
	_readMessage: function() {
		var bs = this._bstream;
		
		// 00…03 Magic number - always same
		var magic_bytes = bs.read32();
		if (magic_bytes != TBB_MAIL_HEADER_START)
			throw new Error('Unexpected message start byte sequence ['+magic_bytes+'], expected ['+TBB_GLOBAL_HEADER_START+']');
		
		// 04…07 Message header size (little endian)
		var header_length = this._endianSwap32(bs.read32());
		var header_to_read = header_length - 8; // already read magic_bytes (4) and header_length (4)
		
		// 08…11 unknown
		// 12…15 Received time (unix timestamp, little endian)
		// 16…17 unknown (?id number?, ?display position?, little endian)
		// 18…19 unknown (?zeros?)
		// 20…23 Message status flag
		// 24…27 unknown (?zeros?)
		// 28…31 unknown (?zeros?) In older versions was color group of the message, but now this is stored elsewhere.
		// 32…35 Priority status (little endian)
		// 36…39 Variable part size (little endian)
		// 40…47 unknown (?zeros?)
		
		// I am interested only in message status flag and variable part size
		
		/* var skip08to19 = */ bs.readBytes(12, null);
		header_to_read -= 12;
		
		var message_status_flag = this._endianSwap32(bs.read32());
		header_to_read -= 4;
		
		/* var skip24to31 = */ bs.readBytes(8, null);
		header_to_read -= 8;
		
		// TODO: mk 2011-05-30 22:53:39: Priority info can be probably removed, because is contained in headers
		var priority_status = this._endianSwap32(bs.read32());
		header_to_read -= 4;
		
		var message_length = this._endianSwap32(bs.read32());
		header_to_read -= 4;
		
		/* var skipRest = */ bs.readBytes(header_to_read, null);
		header_to_read = 0;
		//log('Reading '+message_length+' -> 0x'+message_length.toString(16)+' bytes');
		var message = bs.readBytes(message_length);
		
		log('Read message [status:'+message_status_flag.toString(16)+'; priority: '+priority_status+'; size:'+message_length+']'+"\r\n"+
			message.substring(0, message.indexOf("\r\n\r\n")+50));
		
		log('Flags: '
			+'read: '+((message_status_flag & TBB_FLAG_READ ? 'yes' : 'no'))+'; '
			+'parked: '+((message_status_flag & TBB_FLAG_PARKED ? 'yes' : 'no'))+'; '
			+'flagged: '+((message_status_flag & TBB_FLAG_FLAGGED ? 'yes' : 'no'))+'; '
		+'');
		
		this._curpos += header_length + message_length;
		
		// TODO: mk 2011-05-24 17:41:45: Shouldn’t return foo! :-)
		return 'foo';
	},
	
	/**
	 * Swaps endianness in 16-bit number.
	 * 
	 * @param {Number} x The number. (0xAABB)
	 * @returns {Number} The number with switched endianness. (0xBBAA)
	 * 
	 * @private
	 */
	_endianSwap16: function(x) {
		// http://www.codeguru.com/forum/showthread.php?t=292902
		return ((x>>8) | (x<<8)) & 0xFFFF;
	},
	
	/**
	 * Swaps endianness in 32-bit number.
	 * 
	 * @param {Number} x The number. (0xAABBCCDD)
	 * @returns {Number} The number with switched endianness. (0xDDCCBBAA)
	 * 
	 * @private
	 */
	_endianSwap32: function(x) {
		// http://www.codeguru.com/forum/showthread.php?t=292902
		// ^ this was the idea.
		// However there were problems with 32bit integers in browser (couldn’t handle unsigned, and top bit was sign),
		// so I decided to do byte shuffling through strings. Ugly, but works.
		
		var x_str = '00' + x.toString(16);
		var first_tuplet = x_str.substr(-8, 2)
		var last_tuplet = x.toString(16).substr(-2, 2);
		
		return ( parseInt(first_tuplet, 16)
			| ((x & 0x00FF0000) >> 8)
			| ((x & 0x0000FF00) << 8) ) + parseInt(last_tuplet+'000000', 16);
	},
	
	_openFile: function() {
		this._file = FileTools.openFile(this._filepath);
		
		if (!this._file.exists()) {
			throw new Error('File ['+this._filepath+'] does not exist!');
		}
		
		this._filesize = this._file.fileSize;
		
		this._istream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
		this._istream.init(this._file, 0x01 /* PR_RDONLY */, -1, false);
		
		/** @type Components.interfaces.nsIBinaryInputStream */
		this._bstream = Cc['@mozilla.org/binaryinputstream;1'].createInstance(Ci.nsIBinaryInputStream);
		this._bstream.setInputStream(this._istream);
	},
	
	_closeFile: function() {
		log('Closing file');
		if (this._bstream) {
			this._bstream.close();
			this._bstream = null;
		}
		if (this._istream) {
			this._istream.close();
			this._istream = null;
		}
		if (this._file) {
			this._file = null;
		}
	}
	
};

/**
 * Iteration over instance of this class returns e-mail message ready to be written in
 * the Thunderbird MBOX file.
 *
 * @param {TbbMessageIterator} message_iterator The iterator over messages in The Bat storage.
 *
 * @constructor
 * @class ConvertTbbToMboxIterator
 */
function ConvertTbbToMboxIterator(message_iterator) {
	this._messageIterator = message_iterator;
}

ConvertTbbToMboxIterator.prototype = {
	
	/**
	 * @type TbbMessageIterator
	 */
	_messageIterator: null,
	
	/**
	 * Loops over the inner iterator and converts the message to the
	 * Thunderbird format.
	 * 
	 * @returns {String} Message ready to be appended to the MBOX file.
	 */
	__iterator__: function() {
		
		// X-Mozilla-? header description:
		// http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h and
		// http://www.eyrich-net.org/mozilla/X-Mozilla-Status.html?en and
		// http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgMessageFlags.idl
		
		for(var tbb_message in this._messageIterator) {
			
			// Pozn: flag PARKED ve složce odchozí znamená: nebylo odesláno!
			
		}
		
	},
	
	_getKeywordsHeader: function() {
		// Keywords described in http://kb.mozillazine.org/Tags
		// Service http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsIMsgTagService.idl
		// Usage of service: addTagCallback() in http://mxr.mozilla.org/comm-central/source/mail/components/preferences/display.js
	}
	
};

// TODO: mk 2011-05-30 22:53:39: Priority info can be probably removed, because is contained in headers
///**
// * Mapping from The Bat! priority status to the X-Priority values
// */
//ConvertTbbToMboxIterator.PRIORITY_MAP = {
//	TBB_PRIORITY_LOWEST: 1,
//	TBB_PRIORITY_LOW: 2,
//	TBB_PRIORITY_NORMAL: 3,
//	TBB_PRIORITY_HIGH: 4,
//	TBB_PRIORITY_HIGHEST: 5
//}

FileTools = {
	
	/**
	 * Creates the nsIFile instance for given filepath.
	 * 
	 * @param {String} filepath
	 * @returns {Components.interfaces.nsILocalFile}
	 */
	openFile: function(filepath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		//log('Opening file ['+filepath+']');
		file.initWithPath(filepath);
		return file;
	},
	
	/**
	 * Expands environment strings in given string
	 * 
	 * @param {String} string
	 * @returns {String}
	 */
	expandEnvironmentStrings: function(str) {
		/** @type Components.interfaces.nsIEnvironment */
		var env = Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);
		var matches = str.match(/%[^%]+%/g);
		
		for (var i = 0, matches_length = matches.length; i < matches_length; ++i) {
			var match = matches[i].toUpperCase();
			var env_name = match.match(/^%([^%]+)%/)[1];
			str = str.replace(match, env.get(env_name));
		}
		
		return str;
	},
	
	/**
	 * Returns current codepage in „windows-1252“ format.
	 * 
	 * @returns {String} Current system codepage.
	 */
	getAnsiCharset: function() {
		// detect source charset
		var ansi_cp = RegTools.readStringValue(ACP_REGKEY);
		if (!ansi_cp)
			throw new Error('Could not detect the source charset.');
		
		return 'windows-'+ansi_cp;
	}
	
};

RegTools = {
	
	/**
	 * Reads string value for given registry key
	 * 
	 * @param {String} key Fully qualified registry key ("HKCU\\Foo\\Bar\\Value").
	 * @returns {String} The value.
	 */
	readStringValue: function(key) {
		var key_parts = this._parseKey(key);
		
		var wrk = this._createWrkInstance();
		var value = null;
		try {
			wrk.open(key_parts[0], key_parts[1], wrk.ACCESS_READ);
			value = wrk.readStringValue(key_parts[2]);
			wrk.close();
		} catch(e) {
			value = null;
		}
		
		log('RegTools: Read key ['+key+'] got value ['+value+']');
		
		return value;
	},
	
	_parseKey: function(key) {
		var key_parts = key.split('\\');
		var root_key = key_parts.shift();
		var value_name = key_parts.pop();
		
		var root_const = this._rootKeyToConst(root_key);
		
		return [root_const, key_parts.join('\\'), value_name];
	},
	
	/**
	 * Map root key name to the constant.
	 * 
	 * @param {String} The root key name.
	 * @returns {Int} The constant.
	 * @private
	 */
	_rootKeyToConst: function(root_key) {
		var wrk = this._createWrkInstance();
		
		switch(root_key) {
			case 'HKCU': return wrk.ROOT_KEY_CURRENT_USER;
			case 'HKLM': return wrk.ROOT_KEY_LOCAL_MACHINE;
			case 'HKCR': return wrk.ROOT_KEY_CLASSES_ROOT;
			default: throw new Error('Invalid argument root_key ['+root_key+']!');
		}
	},
	
	/**
	 * @returns {Components.interfaces.nsIWindowsRegKey} The instance or null, when not found.
	 * @private
	 */
	_createWrkInstance: function() {
		var wrk = Cc["@mozilla.org/windows-registry-key;1"];
		if (wrk)
			return wrk.createInstance(Ci.nsIWindowsRegKey);
		return null;
	}
	
};

