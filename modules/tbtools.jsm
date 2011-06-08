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
 * Script contains XPCOM modules for Mozilla Thunderbird.
 * 
 * @author Michal Kočárek michal.kocarek@brainbox.cz
 * @since 2011.06.04
 */

// Symbols exported to the outer scope.
const EXPORTED_SYMBOLS = ['TbTools', 'TbbMessageIterator', 'ConvertTbbToMboxIterator'];

// Shorthands
const Cc = Components.classes;
const Ci = Components.interfaces;

/**
 * Registry key containing the path to The Bat! working directory.
 *
 * Value is REG_SZ, but can contain environment variables. ("%APPDATA%\The Bat!")
 */
const TB_USERDIR_REGKEY = 'HKCU\\SOFTWARE\\RIT\\The Bat!\\Working Directory';

/**
 * Registry key containing the path to The Bat! version.
 *
 * Value is REG_SZ. ("5.0.12")
 */
const TB_VERSION_REGKEY = 'HKCU\\SOFTWARE\\RIT\\The Bat!\\Version';

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

/**
 * Deleted message flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Expunged
 */
const TBB_FLAG_DELETED = 1 << 0;

/**
 * Read message flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Read
 */
const TBB_FLAG_READ = 1 << 1;

/**
 * Replied message flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Replied
 */
const TBB_FLAG_ANSWERED = 1 << 2;

/**
 * Parked message flag in TBB file.
 *
 * Note that the meaning is different in Outbox folder. There it does mean „to be sent“.
 *
 * Thunderbird does not have this kind of flag.
 */
const TBB_FLAG_PARKED = 1 << 3;

/**
 * Message has attachment flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Attachment
 */
const TBB_FLAG_HAS_ATTACHMENT = 1 << 4;

/**
 * The attachments are not included in message flag in TBB file.
 *
 * mk: I Haven't found that this flag is being used.
 *
 * Thunderbird does not have this kind of flag.
 */
const TBB_FLAG_ATTACHMENT_NOT_INCLUDED = 1 << 5;

/**
 * Flagged message flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Flagged
 */
const TBB_FLAG_FLAGGED = 1 << 6;

/**
 * Forwarded message flag in TBB file.
 *
 * Twin for Components.interfaces.nsMsgMessageFlags.Forwarded
 */
const TBB_FLAG_FORWARDED = 1 << 7;

/**
 * MBOX splitter line prefix.
 */
const MBOX_SPLIT_PREFIX = 'From - ';

/**
 * MBOX default splitter line incl. newline character (when date was not found).
 */
const MBOX_SPLIT_DEFAULT = "From - Mon Jan 1 11:11:11 1970\r\n";

/**
 * MBOX newline character
 */
const MBOX_NL = "\r\n";

/**
 * X-Mozilla-Status header name (excl. space after double-colon).
 *
 * http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h
 */
const X_MOZILLA_STATUS_PREFIX = 'X-Mozilla-Status:';

/**
 * X-Mozilla-Status2 header name (excl. space after double-colon).
 *
 * http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h
 */
const X_MOZILLA_STATUS2_PREFIX = 'X-Mozilla-Status2:';

/**
 * X-Mozilla-Keys header name (excl. space after double-colon).
 *
 * http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h
 */
const X_MOZILLA_KEYWORDS_PREFIX = 'X-Mozilla-Keys:';

/**
 * Minimal size of blanks-filled value of  X-Mozilla-Keys header.
 *
 * http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h
 */
const X_MOZILLA_KEYWORDS_MIN_LENGTH = '                                                                                '; // 80 chars
                                    /* 0---------10--------20--------30--------40--------50--------60--------70--------80 */

/**
 * MBOX Status flag for read message.
 */
const MSG_FLAG_READ = Ci.nsMsgMessageFlags.Read;

/**
 * MBOX Status flag for replied message.
 */
const MSG_FLAG_REPLIED = Ci.nsMsgMessageFlags.Replied;

/**
 * MBOX Status flag for flagged message.
 */
const MSG_FLAG_MARKED = Ci.nsMsgMessageFlags.Marked;

/**
 * MBOX Status flag for expunged message.
 */
const MSG_FLAG_EXPUNGED = Ci.nsMsgMessageFlags.Expunged;

/**
 * MBOX Status flag for forwarded message.
 */
const MSG_FLAG_FORWARDED = Ci.nsMsgMessageFlags.Forwarded;

/**
 * MBOX Status flag for new message.
 */
const MSG_FLAG_NEW = Ci.nsMsgMessageFlags.New;

/**
 * MBOX Status flag for message with attachment.
 */
const MSG_FLAG_ATTACHMENT = Ci.nsMsgMessageFlags.Attachment;


/** @type Components.interfaces.nsIConsoleService
 * Lazy loaded console service */
var console_service = null;
function log(msg) {
	if (console_service === null)
		console_service = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
	console_service.logStringMessage('TB: '+msg);
}

/**
 * Static class with utilities for importing data from The Bat! client.
 * 
 * @static
 */
TbTools = {
	
	/**
	 * Detect the location of The Bat! files.
	 * 
	 * @returns {String} Path to the The Bat! files. False, when not found or not installed.
	 */
	detectLocation: function() {
		
		var user_dir = RegTools.readStringValue(TB_USERDIR_REGKEY);
		
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
	 * Provides unified interfaces for logging messages for The Bat! importer module.
	 *
	 * @param {String} message Message to log.
	 */
	log: function(message) {
		log(message);
	}
	
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
	 * 
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
			if (!!(matches = line.match(/^\\\\([^\\]+)$/))) {
				// \\account_name
				dirname = matches[1];
			} else if (!!(matches = line.match(/^\\\\\\([^\\]+)$/))) {
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
	 * @param {Array} prev_dirnames Array of previous directory names.
	 * 
	 * @private
	 */
	_discoverMailboxes: function(dirpath, prev_dirnames) {
		prev_dirnames = (prev_dirnames || []).slice(); // get the copy of object so we’ll not overwrite the passed one
		
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
		
		prev_dirnames.push(dirpath_file.leafName);
		var displayname = prev_dirnames.join('/');
		
		if (mailbox_file.exists()) {
			// Add the result object.
			this._addMailboxToResults(mailbox_file.path, mailbox_file.fileSize, dirpath_file.leafName, displayname, true);
		} else if (subdirectories.length) {
			this._addMailboxToResults(null, 0, dirpath_file.leafName, displayname, false); // do not actually do the import, just create folder
		}
		
		++this._depth;
		for(var i = 0, subdirectories_length = subdirectories.length; i < subdirectories_length; ++i) {
			this._discoverMailboxes(subdirectories[i], prev_dirnames);
		}
		--this._depth;
		
	},
	
	/**
	 * @private
	 */
	_addMailboxToResults: function(filepath, filesize, dirname, relativepath, do_import) {
		var mailbox = {
			identifier: this._mailboxes.length,
			depth: this._depth,
			filepath: filepath,
			size: filesize,
			dirname: dirname,
			relativepath: relativepath,
			do_import: do_import
		};
		//log('Adding result [identifier: '+mailbox.identifier+'; depth: '+mailbox.depth+'; size:'+mailbox.size+'; filepath:'+mailbox.filepath+']');
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
	 * @property Read-only set of TBB flags for current message.
	 *
	 * Flags can be bitmasked with TBB constants.
	 */
	messageFlags: 0,
	
	/**
	 * @property Read-only received/created time for current message.
	 *
	 * Stored in format of Unix timestamp.
	 */
	receivedTimestamp: 0,
	
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
	
	/**
	 * @type Components.interfaces.nsIBufferedInputStream
	 */
	_bufstream: null,
	
	_filesize: 0,
	
	_curpos: 0,
	
	/**
	 * Returns current position in the file.
	 *
	 * @returns {Number} File position.
	 */
	get currentPosition() {
		return this._curpos;
	},
	
	/**
	 * Total length of current message.
	 */
	_messageLength: 0,
	
	/**
	 * Available length of message, which can be read.
	 */
	_messageLengthAvailable: 0,
	
	/**
	 * Iterates over the TBB file and returns e-mail messages for
	 * the work in Thunderbird.
	 *
	 * During iteration, iterator returns the index of current message.
	 */
	__iterator__: function() {
		this._openFile();
		
		//log('TBB reading started [size:'+this._filesize+'; pos:'+this._curpos+']');
		
		this._readFileHeader();
		
		var i = 0;
		while(this._bstream.available()) {
			this._readMessageHeader();
			yield i++; // Return the message index, starting at 0.
			
			// If the ugly developer didn’t read all the message, finish the reading before jumping to next message.
			if (this._messageLengthAvailable)
				this.messageReadBytes(this._messageLengthAvailable);
		}
		
		if (this._filesize != this._curpos)
			throw new Error('TBB was not read till the end [expected:'+this._filesize+'; read:'+this._curpos+']');
		
		this._closeFile();
		
		throw StopIteration;
	},
	
	/**
	 * Reads amount of bytes from the current message.
	 *
	 * When message is read completely, null is returned.
	 *
	 * @param {Number} max_length Maximum bytes to read.
	 * @returns {String} Read bytes.
	 */
	messageReadBytes: function(max_length) {
		var to_read = Math.min(this._messageLengthAvailable, max_length);
		
		if (to_read == 0)
			return null;
		
		var data = this._bstream.readBytes(to_read);
		var data_length = data.length;
		
		this._messageLengthAvailable -= data_length;
		this._curpos += data_length;
		
		return data;
	},
	
	/**
	 * Reads the TBB file header. Sets file pointer to the beginning of the first message.
	 * 
	 * @private
	 */
	_readFileHeader: function() {
		var bs = this._bstream;
		
		// Read first magic bytes - always same
		var magic_bytes = bs.read32();
		if (magic_bytes != TBB_GLOBAL_HEADER_START)
			throw new Error('Unexpected global start byte sequence of TBB file ['+magic_bytes+'], expected ['+TBB_GLOBAL_HEADER_START+']!');
		
		var header_length = this._endianSwap16(bs.read16());
		
		// header_length is sum of magic_bytes (4), header_length (2) and unkown_data (var)
		/*var skipHeaderData = */bs.readBytes(header_length - 4 - 2, null);
		
		this._curpos += header_length;
	},
	
	/**
	 * Starts reading one message from the TBB file.
	 *
	 * @private
	 */
	_readMessageHeader: function() {
		var bs = this._bstream;
		
		// 00…03 Magic number - always same
		var magic_bytes = bs.read32();
		if (magic_bytes != TBB_MAIL_HEADER_START)
			throw new Error('Unexpected message start byte sequence ['+magic_bytes+'], expected ['+TBB_GLOBAL_HEADER_START+']');
		
		// 04…07 Message header size (little endian)
		var header_length = this._endianSwap32(bs.read32());
		
		// 08…11 unknown
		// 12…15 Received time (unix timestamp, little endian)
		// 16…17 unknown (?id number?, ?display position?, little endian)
		// 18…19 unknown (?zeros?)
		// 20…23 Message status flag
		// 24…27 unknown (?zeros?)
		// 28…31 unknown (?zeros?) In older versions was color group of the message, but now this is stored elsewhere.
		// 32…35 Priority status (little endian)
		// 36…39 Size of the variable part (size of the message) (little endian)
		// 40…47 unknown (?zeros?)
		
		/* var skip08to11 = */ bs.readBytes(4, null);
		
		// 12…15 Received time (unix timestamp, little endian)
		this.receivedTimestamp = this._endianSwap32(bs.read32());
		
		/* var skip16to19 = */ bs.readBytes(4, null);
		
		// Read the message flags (TBB_FLAG_* bitfield)
		this.messageFlags = this._endianSwap32(bs.read32());
		
		/* var skip24to35 = */ bs.readBytes(12, null);
		
		var message_length = this._endianSwap32(bs.read32());
		
		// Skip rest of the header.
		// We already read 40 bytes (00…39)
		/* var skipRest = */ bs.readBytes(header_length - 40, null);
		
		this._messageLength = this._messageLengthAvailable = message_length;
		
		this._curpos += header_length;
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
	
	/**
	 * @private
	 */
	_openFile: function() {
		this._file = FileTools.openFile(this._filepath);
		
		if (!this._file.exists()) {
			throw new Error('File ['+this._filepath+'] does not exist!');
		}
		
		this._filesize = this._file.fileSize;
		
		this._istream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
		this._istream.init(this._file, 0x01 /* PR_RDONLY */, -1, false);
		
		this._bufstream = Cc['@mozilla.org/network/buffered-input-stream;1'].createInstance(Ci.nsIBufferedInputStream);
		this._bufstream.init(this._istream, 8192);
		
		/** @type Components.interfaces.nsIBinaryInputStream */
		this._bstream = Cc['@mozilla.org/binaryinputstream;1'].createInstance(Ci.nsIBinaryInputStream);
		this._bstream.setInputStream(this._bufstream);
	},
	
	/**
	 * @private
	 */
	_closeFile: function() {
		//log('Closing file');
		if (this._bstream) {
			this._bstream.close();
			this._bstream = null;
		}
		if (this._bufstream) {
			this._bufstream.close();
			this._bufstream = null;
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
 * @param {Function} flush_data_callback Function called when data are going to be flushed.
 * @param {Function} after_message_callback Function called after every message.
 * @param {Function} wants_parked_label_callback Optional: Callback returning the Parked label key.
 *
 * @constructor
 * @class ConvertTbbToMboxIterator
 */
function ConvertTbbToMboxIterator(message_iterator, flush_data_callback, after_message_callback, wants_parked_label_callback) {
	this._messageIterator = message_iterator;
	this._onFlushData = flush_data_callback;
	this._onAfterMessage = after_message_callback || function() {};
	this._onWantsParkedLabel = wants_parked_label_callback || function() { return false; };
}

ConvertTbbToMboxIterator.prototype = {
	
	/**
	 * @type Boolean
	 * Needs to be set to true, when converting outbox folder.
	 */
	isConvertingOutbox: false,
	
	/**
	 * @type TbbMessageIterator
	 */
	_messageIterator: null,
	
	/**
	 * @type Function
	 * Callback returning key for the Parked label.
	 *
	 * Function is called *first time* when name for the Parked label is required.
	 * When this function returns null, label is not being converted.
	 *
	 * string|null _onWantsParkedLabel()
	 */
	_onWantsParkedLabel: null,
	
	/**
	 * @type Function
	 * Callback for outputting the data.
	 *
	 * Function is called every time converter wants to output something.
	 *
	 * void _onFlushData(String output)
	 */
	_onFlushData: null,
	
	/**
	 * @type Function
	 * Callback for notifying about next message.
	 *
	 * Function is called every time *after* parsing new message (eg. _onFlushData preceeded this callback).
	 *
	 * void _onAfterMessage(Number index)
	 */
	_onAfterMessage: null,
	
	/**
	 * @type String
	 * Key for the Parked label.
	 *
	 * (String: The Parked label from the callback, Null: Was not requested yet, False: Do not store the label)
	 */
	_parkedLabelKey: null,
	
	/**
	 * @type String
	 * Buffer for reading lines.
	 */
	_buffer: '',
	
	/**
	 * @type Number
	 * Actual position in the buffer.
	 */
	_bufferPos: 0,
	
	/**
	 * @type Boolean
	 * True, when read whole message.
	 */
	_isEof: false,
	
	/**
	 * @type Boolean
	 * True, when buffer cannot be enlarged
	 */
	_isEofBuffer: false,
	
	_convertedEmails: 0,
	
	get convertedEmails() {
		return this._convertedEmails;
	},
	
	/**
	 * Loops over the inner iterator and converts the message to the
	 * Thunderbird format.
	 */
	convert: function() {
		// X-Mozilla-? header description:
		// http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgLocalFolderHdrs.h and
		// http://www.eyrich-net.org/mozilla/X-Mozilla-Status.html?en and
		// http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsMsgMessageFlags.idl
		
		this._convertedEmails = 0;
		
		var mi = this._messageIterator,
			line,
			line_start_c,
			from_date,
			headers_array,
			flags,
			status, status_x,
			status2, status2_x,
			keywords, keywords_x
		;
		
		var flush_data = this._onFlushData;
		
		for(var i in mi) {
			
			this._buffer = '';
			this._bufferPos = 0;
			this._isEof = this._isEofBuffer = false;
			
			//log('Message ['+i+'] start');
			
			// Parse headers
			headers_array = [];
			from_date = null;
			
			//log('Parsing headers');
			
			flags = mi.messageFlags;
			
			// Compose status
			status_x =
				  (flags & TBB_FLAG_READ ? MSG_FLAG_READ : 0)
				| (flags & TBB_FLAG_ANSWERED ? MSG_FLAG_REPLIED : 0)
				| (flags & TBB_FLAG_FLAGGED ? MSG_FLAG_MARKED : 0)
				| (flags & TBB_FLAG_DELETED ? MSG_FLAG_EXPUNGED : 0)
				| (flags & TBB_FLAG_FORWARDED ? MSG_FLAG_FORWARDED : 0);
			
			// mk: „New“ status is not being set.
			status2_x = 
				  (flags & TBB_FLAG_HAS_ATTACHMENT ? MSG_FLAG_ATTACHMENT : 0);
			
			// Compose keywords (parked label)
			// FIX: mk 2011-06-05 20:02:34: Not sent messages are marked as Parked in the Outbox folder.
			// Do not transfer the Parked flag for this folder.
			keywords_x = '';
			if (!this.isConvertingOutbox && (flags & TBB_FLAG_PARKED)) {
				if (this._parkedLabelKey === null) {
					this._parkedLabelKey = this._onWantsParkedLabel();
					if (!this._parkedLabelKey)
						this._parkedLabelKey = false;
				}
				if (this._parkedLabelKey) {
					keywords_x = this._parkedLabelKey;
				}
			}
			
			// Add the X-Mozilla-Status & X-Mozilla-Status2 headers
			status = ('0000'+(status_x).toString(16).toUpperCase()).substr(-4); // pad hexa number to 4 characters with zeros on left
			status2 = ('00000000'+(status2_x).toString(16).toUpperCase()).substr(-8); // pad hexa number to 8 characters with zeros on left
			keywords = (keywords_x+X_MOZILLA_KEYWORDS_PREFIX).substr(X_MOZILLA_KEYWORDS_PREFIX.length); // pad on right with spaces
			
			headers_array.push(X_MOZILLA_STATUS_PREFIX+' '+status+MBOX_NL);
			headers_array.push(X_MOZILLA_STATUS2_PREFIX+' '+status2+MBOX_NL);
			headers_array.push(X_MOZILLA_KEYWORDS_PREFIX+' '+keywords_x+MBOX_NL);
			
			line = this._readLine();
			for (line = this._readLine(); !this._isEof && line.trim(); line = this._readLine()) {
				line_start_c = line.charCodeAt(0);
				
				//// Just for debug…
				//if (line.match(/Subject:/)) log('MSG ['+line.trim()+']');
				
				// mk 2011-06-08: Instead of parsing Date header, which is not always present,
				// I decided to choose the receivedTimestamp value from TBB file, which seems to be
				// present everytime (even for Sent messages, where Date is missing).
				//if (line_start_c === 68 /* D */ && line.indexOf('Date: ') === 0) {
				//	// Found Date header
				//	from_date = new Date(line.substr(6).trim());
				//	if (from_date.getYear() === NaN)
				//		from_date = null;
				//}
				
				if (line_start_c === 88 /* X */ && line.indexOf('X-Mozilla-') === 0) {
					// Strip existing Mozilla headers as they could cause problems
					if (line.indexOf(X_MOZILLA_STATUS_PREFIX) === 0
						|| line.indexOf(X_MOZILLA_STATUS2_PREFIX) === 0
						|| line.indexOf(X_MOZILLA_KEYWORDS_PREFIX) === 0) {
						continue;
					}
					// else leave the header, because we do not know how important it is
				}
				headers_array.push(line);
			}
			headers_array.push(line); // add the last line
			
			// mk 2011-06-08: Use receivedTimestamp instead of Date header
			//
			// It seems that the timestamp is neither in UTC and neither in local timezone according
			// the timestamp parsing. The Bat probably uses own algorithm for casting between date and timestamp.
			//
			// This is visible on older messages, where „Received“ date in The Bat and
			// parsed date here can differ even for 3 hours.
			//
			// However, it is still better to have this value than nothing.
			from_date = new Date(mi.receivedTimestamp * 1000);
			
			//log('RCVD ['+mi.receivedTimestamp+'] ['+from_date.toString()+']');
			
			// Add the From header to the beginning
			headers_array.unshift(from_date !== null
				? (// From - Mon May 30 22:34:26 2011
					MBOX_SPLIT_PREFIX
					+ConvertTbbToMboxIterator.DAY_MAP[ from_date.getDay() ]
					+' '+ConvertTbbToMboxIterator.MONTH_MAP[ from_date.getMonth() ]
					+' '+(from_date.getDay() < 10 ? '0' : '')+from_date.getDay()
					+' '+(from_date.getHours() < 10 ? '0' : '')+from_date.getHours()
					+':'+(from_date.getMinutes() < 10 ? '0' : '')+from_date.getMinutes()
					+':'+(from_date.getSeconds() < 10 ? '0' : '')+from_date.getSeconds()
					+' '+from_date.getFullYear()
					+MBOX_NL)
				: MBOX_SPLIT_DEFAULT
			);
			
			flush_data(headers_array.join(''));
			
			// Parse body
			
			//log('Parsing body');
			
			while(false !== (line = this._readLine())) {
				// Put a space before the line which starts with 'From '
				if (line.charCodeAt(0) === 70 /* F */ && line.indexOf('From ') === 0) {
					line = ' '+line;
				}
				
				flush_data(line);
			}
			
			//log('Message ['+i+'] end');
			
			this._onAfterMessage(i);
			
			++this._convertedEmails;
		}
		
	},
	
	/**
	 * Reads one line from current message.
	 * 
	 * @returns {String} One line or False when there’s nothing more to read.
	 * @private
	 */
	_readLine: function() {
		
		// Sanity check - there’s nothing more to read in this message
		if (this._isEof)
			return false;
		
		var search_from_pos = this._bufferPos;
		while(true) {
			// Find \r or \n in the message
			var nl_pos = this._buffer.indexOf("\r", search_from_pos);
			if (nl_pos !== -1) {
				// Try to find \n after \r
				
				if (nl_pos === this._buffer.length-1) {
					// This is last char in the buffer... Enlarge buffer, so we can check for \n
					this._enlargeBuffer();
				}
				
				if (this._buffer.charCodeAt(nl_pos+1) === 10) {
					++nl_pos; // We found \r\n
				} // else: we found only \r
			} else {
				nl_pos = this._buffer.indexOf("\n", search_from_pos);
			}
			
			if (nl_pos !== -1)
				break; // We found newline
			
			// We didn’t found newline character.
			if (this._isEofBuffer) {
				// End of file. There’s nothing more to read except this last line
				// So return it and mark buffer closed
				//log('Nothing more');
				this._isEof = true;
				var line = this._buffer.substr(this._bufferPos);
				return line;
			}
			
			// We didn’t found nothing in the buffer and try again
			search_from_pos = this._buffer.length;
			this._enlargeBuffer();
		}
		
		// We found newline
		++nl_pos; // this is position *after* newline
		var line = this._buffer.substring(this._bufferPos, nl_pos);
		this._bufferPos = nl_pos;
		
		if (this._bufferPos > ConvertTbbToMboxIterator.READ_LINE_BUFFER) {
			//log('Shortening buffer ['+this._buffer.substr(0, this._bufferPos)+'↓'+this._buffer.substr(this._bufferPos)+']');
			this._buffer = this._buffer.substr(this._bufferPos);
			this._bufferPos = 0;
		}
		
		if (this._bufferPos === this._buffer.length) {
			this._enlargeBuffer();
			if (this._isEofBuffer)
				this._isEof = true;
		}
		
		return line;
	},
	
	/**
	 * Gets more data in the buffer.
	 *
	 * @private
	 */
	_enlargeBuffer: function() {
		//log('Enlarging buffer');
		
		var data = this._messageIterator.messageReadBytes(ConvertTbbToMboxIterator.READ_LINE_BUFFER);
		if (data !== null) {
			this._buffer += data;
			if (data.length != ConvertTbbToMboxIterator.READ_LINE_BUFFER)
				this._isEofBuffer = true;
		} else {
			this._isEof = true;
		}
	}
	
};

ConvertTbbToMboxIterator.READ_LINE_BUFFER = 8192;

// First day is Sunday, and it stars from 0.
ConvertTbbToMboxIterator.DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Yes, months are starting from 0!
ConvertTbbToMboxIterator.MONTH_MAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Static helper class for manipulation
 * with files.
 *
 * @static
 */
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

/**
 * Static helper class for manipulation with
 * Windows registry.
 *
 * @static
 */
RegTools = {
	
	/**
	 * Reads string value for given registry key
	 * 
	 * @param {String} key Fully qualified registry key ("HKCU\\Foo\\Bar\\Value").
	 * @returns {String} The value. If error happens during the read, NULL is returned.
	 *
	 * When error happens, NULL is returned.
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
		
		//log('RegTools: Read key ['+key+'] got value ['+value+']');
		
		return value;
	},
	
	/**
	 * Split whole path to parts.
	 * 
	 * @param {String} The whole registry key
	 * @returns {Array} Array with three items: root key constant, path, key name.
	 * @private
	 */
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

