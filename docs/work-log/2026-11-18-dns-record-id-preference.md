# Make technical DNS record IDs optional — 2026-11-18

DNS-11 / REQ-049. Under the maintainer's delegated model choices,choose
hidden-by-default technical identifiers with an explicit display preference.
The record list retains ID-based keys,search,action payloads and permission
gates; only the extra line under record names is conditional on the setting.
Use existing UI preference normalization/local/server synchronization and keep
the default false for older or invalid settings. Reset restores that default.
The labelled checkbox is available on both desktop and mobile.

Locked terminology reference a65a4dfeb92a59df4a80a737a20bcbf8558793ff;
both localization guides read. No API/SDK or DNS mutation behavior changes.
Exact focused checks,browser matrix,CI and paired deployment are separate
pending gates. Browser data/session are isolated fixtures,not live records.
