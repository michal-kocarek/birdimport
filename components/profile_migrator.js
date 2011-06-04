/**
 * Import XPCOMUtils for setting the migrator component.
 */
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Ci = Components.interfaces;

function TheBatProfileMigrator() {
	
}

TheBatProfileMigrator.prototype = {
	
	// Properties for the XPCOM registration
	// classID generated randomly
	// contractID must start with http://mxr.mozilla.org/mozilla/source/mail/components/migration/public/nsMailMigrationCID.h
	classID: Components.ID('{1faf86b2-90b6-49ee-80ba-dd33612c1ba3}'),
	classDescription: 'The profile migrator for importing data from The Bat! client.',
	contractID: '@mozilla.org/profile/migrator;1?app=mail&type=thebat',
	
	// Interface we are implementing
	// nsIMailProfileMigrator definition taken
	// from http://mxr.mozilla.org/mozilla/source/mail/components/migration/public/nsIMailProfileMigrator.idl
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIMailProfileMigrator]),
	
	/**
	 * Copy user profile information to the current active profile.
	 *
	 * @param {Number} aItems List of data items to migrate. see above for values.
	 * @param {Components.interfaces.nsIProfileStartup} aStartup
	 * @param {String} aProfile profile to migrate from, if there is more than one.
	 * @returns {Null}
	 *
	 * // numbers for aItems described in constants in
	 * http://mxr.mozilla.org/mozilla/source/mail/components/migration/public/nsIMailProfileMigrator.idl
	 */
	migrate: function(aItems, aStartup, aProfile) {
		
	},
	
	/**
	 * A bit field containing profile items that this migrator offers for import.
	 * 
	 * @param {String} aProfile the profile that we are looking for available data to import
	 * @param {Boolean} aDoingStartup "true" if the profile is not currently being used.
	 * @returns {Number} bit field containing profile items (see above)
	 */
	getMigrateData: function(aProfile, aDoingStartup) {
		return Components.interfaces.nsIMailProfileMigrator.MAILDATA;
	},
	
	/**
	 * Whether or not there is any data that can be imported from this browser
	 * (i.e. whether or not it is installed, and there exists a user profile)
	 *
	 * @returns {Boolean}
	 */
	get sourceExists() {
		return true;
	},
	
	/**
	 * Whether or not the import source implementing this interface
	 * has multiple user profiles configured.
	 *
	 * @returns {Boolean}
	 */
	get sourceHasMultipleProfiles() {
		return false;
	},
	
	/**
	 * An enumeration of available profiles. If the import source does
	 * not support profiles, this attribute is null.
	 *
	 * @return {Components.interfaces.nsIArray} Returns array of profiles or null.
	 */
	get sourceProfiles() {
		return null;
	}
};

var components = [TheBatProfileMigrator];

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
