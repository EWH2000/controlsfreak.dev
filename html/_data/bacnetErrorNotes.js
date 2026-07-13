// BACnet error/reject/abort field descriptions — HAND-AUTHORED,
// human-reviewed. The companion to the GENERATED html/_data/bacnetErrors.js
// (enum id → name); this file is the curated field-meaning of each value,
// overlaid onto the enum by /tools/bacnet-error-codes.html at build time by
// NAME (so a regenerated enum can't silently break the mapping).
//
// Keyed by the enum `name` (the hyphenated spelling in bacnetErrors.js).
// Only the field-common values carry a description; the long tail (BACnet/SC
// transport, HTTP/TLS/DNS, OAuth-scope error codes) is left name-only, same
// discipline as the units decoder. Strings render with `| safe` — keep them
// plain text, no HTML tags, no & or < characters.
//
// These descriptions were drafted and adversarially cross-checked for
// BACnet-semantics accuracy, but ASHRAE 135 is the authority — treat as a
// field aid, verify against the standard for exact normative wording.

const classes = {
    "device": "Device-level refusal: it's busy, mid-configuration, or has an operational problem and cannot service the request; usually transient, so retry.",
    "object": "The target object is the problem: unknown-object (wrong instance number), wrong type, or a create or delete the device forbids; verify the object-id.",
    "property": "The addressed property is at fault: unknown-property, write-access-denied (read-only), value-out-of-range, or a wrong datatype or array index.",  // medium — Corrected gloss: write-access-denied means read-only/write-protected, not 'not commandable' (a distinct priority-array concept).
    "resources": "Device is out of memory or space: no room to create the object, add a list element, or store the value; often a full points or objects table.",
    "security": "Security check failed: bad password, authentication failure, incompatible security levels, or a key or encryption error blocked the request.",
    "services": "The service request is malformed: missing or inconsistent parameters, invalid tag encoding, or a parameter out of range; usually a client or stack bug.",
    "vt": "Virtual Terminal session errors: unknown VT class or session, none available, or already closed; a legacy text-terminal feature you'll rarely see.",
    "communication": "Message-transport problems: comms disabled by DCC, a duplicate or incomplete message, or an unknown network or route; check DCC state and routing.",
};

const codes = {
    "other": "Catch-all the device returns when no specific code fits; the real cause is vendor-defined, so check the device's own log or manual.",
    "configuration-in-progress": "Device is mid-download or commissioning and can't service the request; retry once the config or program load finishes.",
    "device-busy": "Device is temporarily overloaded, often mid-backup, restore, or program load; back off and retry in a few seconds.",
    "file-access-denied": "File-object read or write refused; usually a permissions issue or the file is locked open by a backup or restore.",
    "inconsistent-parameters": "Service arguments conflict with each other, like a mismatched array size or bad option combo; fix the request the tool built.",
    "invalid-data-type": "Written value's datatype doesn't match the property, such as a real into an enum or integer; correct the datatype in the write.",
    "missing-required-parameter": "The request PDU left out a mandatory field; a malformed client request, so check the tool or driver encoding.",
    "no-space-for-object": "Device's object database is full, so CreateObject fails; delete unused objects or you've hit the device's object limit.",
    "no-space-to-write-property": "Property storage is full, often when adding to a list like a schedule or group; free space or trim existing entries.",
    "property-is-not-a-list": "AddListElement or RemoveListElement was used on a property that isn't a list; wrong service for that property.",
    "object-deletion-not-permitted": "Object can't be deleted because it's built-in, like the Device object or a fixed I/O point; only dynamic objects delete.",
    "object-identifier-already-exists": "CreateObject asked for an instance number already in use; pick an unused instance for that object type.",
    "operational-problem": "Device has an internal fault blocking the operation; check its health and alarms, and it may need a reboot.",
    "read-access-denied": "The property exists but reading it is blocked; you lack the rights or security level to read that property.",
    "service-request-denied": "The target device refused the service on its own policy, state, or security grounds; the request was well-formed, so check that device, not the network.",  // medium — All 3 lenses refuted the router/BBMD attribution; this is the target device's application-layer refusal.
    "timeout": "No reply within the APDU timeout; a comms problem like wrong MAC or network number, a dead device, or MS/TP token loss.",
    "unknown-object": "The referenced object doesn't exist on the device; wrong object type or instance, or it was deleted — a rename won't do it, references are by id.",  // medium — One lens refuted 'renamed'; objects are addressed by identifier, not name.
    "unknown-property": "The object doesn't support that property id; wrong property or a proprietary one this device doesn't implement.",
    "unsupported-object-type": "CreateObject asked for an object type the device doesn't implement; check the PICS for supported types.",
    "value-out-of-range": "Written value is outside the property's allowed range, like a bad priority, COV increment, or setpoint; clamp it to range.",
    "write-access-denied": "Property is read-only or not writable now, such as an input's Present_Value or a command-priority conflict.",
    "invalid-array-index": "Array index is past the property's size, or index 0 misused; read the array length before indexing into it.",
    "cov-subscription-failed": "Device couldn't set up the COV subscription, usually its subscription table is full; free a slot or fall back to polling.",
    "not-cov-property": "Subscribed change-of-value on a property that doesn't support it; only ones like Present_Value or Status_Flags qualify.",
    "optional-functionality-not-supported": "Device doesn't implement that optional service or feature; check its BIBBs or PICS before relying on it.",
    "datatype-not-supported": "The datatype used isn't one the device accepts for that property or operation; re-encode with a supported type.",
    "duplicate-name": "The Object_Name is already taken on this device; names must be unique per device, so choose another.",
    "duplicate-object-id": "The object-identifier collides with an existing object; that instance is already assigned on the device.",
    "property-is-not-an-array": "An array index was used on a scalar property; drop the index and read or write the value whole.",
    "unknown-device": "A responding gateway or proxy doesn't recognize the referenced device instance; a true dead route instead shows up as a network Reject or a timeout, not this.",  // low — Lenses split 2 accept/1 refute; reworded to the application-layer reading since a router's dead route emits a network Reject, not this code.
    "value-not-initialized": "Property holds no value yet, typically an empty priority-array slot or a point that was never written.",
    "unknown-subscription": "Referenced a COV subscription that no longer exists; it expired or was never created, so resubscribe.",
    "busy": "Device can't service the request at the moment; wait briefly and retry.",
    "communication-disabled": "DeviceCommunicationControl has silenced the device's traffic; send a DCC enable or wait out its timer to restore comms.",
    "success": "No error; the positive result code confirming the operation completed.",
    "access-denied": "Request refused on authorization grounds; you lack the rights, common with BACnet/SC or key-based security.",
};

const reject = {
    "other": "Catch-all reject for a parse-level rejection that fits none of the defined codes; grab the raw APDU with a sniffer to see what tripped it.",
    "buffer-overflow": "Request exceeded the receiver's decode buffer, so it couldn't be fully decoded and was rejected; usually an oversized APDU to a device with a small Max-APDU.",  // medium — Fixed the draft's false 'dropped before parsing' — a Reject PDU is returned, so it is rejected/not-serviced, not silently discarded.
    "inconsistent-parameters": "Each argument decoded fine but they contradict one another, so the request can't be honored; a combination the service won't accept together.",
    "invalid-parameter-data-type": "An argument's encoded type isn't what the service expects, like a Real where an Unsigned belongs; usually an encoder bug on the sender.",
    "invalid-tag": "A context or application tag is wrong or misplaced, so the decoder lost the byte stream; classic hand-rolled or buggy encoder symptom.",
    "missing-required-parameter": "A mandatory argument for the service wasn't present; the sender omitted a required field the decoder needs to proceed.",
    "parameter-out-of-range": "An argument decoded but its value sits outside the range that field allows, such as an index or choice beyond the service's limits.",
    "too-many-arguments": "The request carried more arguments than the service defines; extra trailing parameters the decoder didn't expect to find.",
    "undefined-enumeration": "An enumerated argument held a value not defined for that enum; often a newer or proprietary code the receiver can't map.",
    "unrecognized-service": "The PDU parsed but the device doesn't implement that service choice; the requested service simply isn't supported here.",
    "invalid-data-encoding": "The bytes decode but do not form a legal encoding for their datatype — malformed at the datatype level, not just a bad tag. A later-edition reason older stacks will not send.",  // medium — owner-corrected: it IS reject reason 10 per bacnet-stack (later edition), not a data bug
};

const abort = {
    "other": "Catch-all when no listed reason fits; the device tore down the transaction without saying why, so a packet capture is your only lead.",
    "buffer-overflow": "Receiver ran out of buffer space mid-transaction, usually a segmented message too big for a small device to reassemble; cut APDU size or segment count.",
    "invalid-apdu-in-this-state": "A segment or ACK the state machine wasn't expecting — often a stale duplicate retransmit, or a client reusing an invoke ID before its prior transaction closed.",  // medium — Fixed misleading two-masters example; invoke IDs are scoped to the client-server pair, reframed as one client recycling an ID early.
    "preempted-by-higher-priority-task": "Device intentionally abandoned this lower-priority transaction for more urgent internal work like reinitialization; uncommon, and not a load or slot issue.",  // medium — Reframed from slot-exhaustion (that's out-of-resources) to an intentional priority decision; genuinely uncommon in the field.
    "segmentation-not-supported": "The reply won't fit one APDU and this device can't segment; ask for less — smaller ReadPropertyMultiple or ReadRange chunks.",
    "security-error": "A BACnet network-security check failed — bad signature, key mismatch, or replayed message; verify keys and time sync across the secured devices.",
    "insufficient-security": "Message came in below the security level this operation requires; the peer must sign or encrypt to the policy minimum before the device will proceed.",
    "window-size-out-of-range": "The proposed segmentation window size fell outside the legal 1 to 127, or beyond what this device accepts — a botched segment-ACK negotiation.",
    "application-exceeded-reply-time": "The application layer took too long to build the response and the transaction was torn down; slow backend, blocked point, or an overloaded controller.",
    "out-of-resources": "Device has no free state-machine slots, memory, or handles left to continue; common on small controllers under heavy polling — throttle or stagger polls.",
    "tsm-timeout": "Transaction state machine timed out waiting for the next segment or ACK; usually a dropped packet, an offline peer, or MS/TP token loss.",
    "apdu-too-long": "The APDU exceeds the receiver's Max APDU Length Accepted and can't be segmented; shrink the request or response, or enable segmentation.",
};

module.exports = { classes, codes, reject, abort };
