# Bird Import

Source code of the Thunderbird add-on for importing The Bat! e-mails.

## Install

Add-on has a [Mozilla Add-ons repository](https://addons.mozilla.org/thunderbird/addon/birdimport/). You do not have to pack by yourself. Just get it from there.

## Documentation

See http://brainbox.cz/birdimport/ for more info.

## Contact & Contribute

**Any feedback appreciated.** Would love to hear it worked, and expecting the stones thrown on my head when it failed. (Please carve the bug report in the stone before throwing.)

## Under the hood

The add-on hooks (overlays) the Thunderbird Import dialog. It has a XPCOM component for importing The Bat! e-mails. This component is registered after opening the Import dialog thus allowing user to select this type of import.

The Bat! TBB storage files are parsed by the plugin, and the e-mails are then imported to Thunderbird using exposed interfaces.

It was fun to make this. None of the import logic is documented on MDC, so [MXR](http://mxr.mozilla.org/comm-central/source/mailnews/import/) was my friend.