// BACnet enumeration data — the single source for three consumers:
//
//   1. /tools/bacnet-objects.html — Nunjucks renders the three
//      .ref-table-dense tables from these arrays at build time.
//   2. /tools/bacnet-ip-converter.html — the Object ID tab injects
//      `objectTypeNames` via {{ bacnetEnums.objectTypeNames |
//      safeScriptJson | safe }} for its type-name readout.
//   3. head.njk — the definedTermSetJsonLd filter emits a
//      DefinedTermSet per `termSets:` frontmatter entry from the
//      same arrays, so the structured data can't drift from the
//      visible tables.
//
// Transcribed from ASHRAE 135 (Object_Type / Property_Identifier /
// Units enumerations). Every id->name was verified 2026-07-13 against
// two open implementations independent of bacnet-stack — BACpypes3
// (maintained by an ASHRAE SSPC-135 committee member) and BACnet4J —
// with the tail object types corroborated against the ASHRAE 135
// addenda that introduced them (57-59 Add. aq / 135-2016, 60 Add. bd,
// 61-62 Add. bi / 135-2020, 63-64 Add. ca to 135-2020, folded into
// 135-2024). id->name is the spec-defined part; desc is site-authored
// editorial. Name and desc strings render with `| safe` (they are
// site-authored, never user input) — escape & and < by hand if a
// future entry ever needs them.

const objectTypes = [
    { id: 0, name: 'Analog Input (AI)', desc: 'A sensed analog value coming in — temperature, pressure, humidity.' },
    { id: 1, name: 'Analog Output (AO)', desc: 'A commandable analog value going out — valve, damper, VFD speed.' },
    { id: 2, name: 'Analog Value (AV)', desc: 'An analog value living in software — a setpoint or calculated number.' },
    { id: 3, name: 'Binary Input (BI)', desc: 'A sensed two-state value coming in — a status or switch contact.' },
    { id: 4, name: 'Binary Output (BO)', desc: 'A commandable two-state output — a relay or start/stop command.' },
    { id: 5, name: 'Binary Value (BV)', desc: 'A two-state value living in software — a mode flag or enable.' },
    { id: 6, name: 'Calendar', desc: 'A list of dates and date ranges that schedules reference.' },
    { id: 7, name: 'Command', desc: 'Writes a set of values to many objects from one write.' },
    { id: 8, name: 'Device', desc: 'The controller itself — one per device, holding its identity and capabilities.' },
    { id: 9, name: 'Event Enrollment', desc: 'Defines an alarm/event condition and who gets notified.' },
    { id: 10, name: 'File', desc: 'A file reachable through BACnet file services.' },
    { id: 11, name: 'Group', desc: 'A read-back bundle of properties from other objects.' },
    { id: 12, name: 'Loop', desc: 'A built-in PID control loop.' },
    { id: 13, name: 'Multi-state Input (MSI)', desc: 'A sensed enumerated state coming in.' },
    { id: 14, name: 'Multi-state Output (MSO)', desc: 'A commandable enumerated state going out.' },
    { id: 15, name: 'Notification Class', desc: 'Routes event notifications to recipients with priorities.' },
    { id: 16, name: 'Program', desc: 'An executing control program inside the device.' },
    { id: 17, name: 'Schedule', desc: 'A weekly + exception schedule that writes a value on time.' },
    { id: 18, name: 'Averaging', desc: 'Records the min, max, and average of a sampled property.' },
    { id: 19, name: 'Multi-state Value (MSV)', desc: 'An enumerated state living in software.' },
    { id: 20, name: 'Trend Log', desc: 'Records samples of a property over time.' },
    { id: 21, name: 'Life Safety Point', desc: 'A fire / life-safety point.' },
    { id: 22, name: 'Life Safety Zone', desc: 'A fire / life-safety zone.' },
    { id: 23, name: 'Accumulator', desc: 'A pulse / meter accumulator — kWh, gallons, pulses.' },
    { id: 24, name: 'Pulse Converter', desc: 'Scales accumulator pulses into engineering units.' },
    { id: 25, name: 'Event Log', desc: 'Records event notifications over time.' },
    { id: 26, name: 'Global Group', desc: 'A read-back bundle spanning several devices.' },
    { id: 27, name: 'Trend Log Multiple', desc: 'Logs several properties on one shared timebase.' },
    { id: 28, name: 'Load Control', desc: 'Sheds electrical load on demand.' },
    { id: 29, name: 'Structured View', desc: 'A tree node for organizing objects — folders.' },
    { id: 30, name: 'Access Door', desc: 'A physical access-control door.' },
    { id: 31, name: 'Timer', desc: 'A countdown timer that changes state and can fire writes when it expires.' },
    { id: 32, name: 'Access Credential', desc: 'An access-control credential — the card or fob identity.' },
    { id: 33, name: 'Access Point', desc: 'An access-control decision point — a reader and the door it grants.' },
    { id: 34, name: 'Access Rights', desc: 'Which credentials pass which access points, and when.' },
    { id: 35, name: 'Access User', desc: 'The person (or role) a set of credentials belongs to.' },
    { id: 36, name: 'Access Zone', desc: 'An area bounded by access-controlled doors, with occupancy state.' },
    { id: 37, name: 'Credential Data Input', desc: 'Reads raw credential data from a reader — card number, PIN.' },
    { id: 38, name: 'Network Security', desc: 'Legacy network-security configuration (deprecated by later editions).' },
    { id: 39, name: 'BitString Value', desc: 'A bit-string value living in software.' },
    { id: 40, name: 'CharacterString Value', desc: 'A text-string value living in software.' },
    { id: 41, name: 'DatePattern Value', desc: 'A recurring date pattern — e.g. every second Tuesday.' },
    { id: 42, name: 'Date Value', desc: 'A single calendar-date value.' },
    { id: 43, name: 'DateTimePattern Value', desc: 'A recurring date-and-time pattern.' },
    { id: 44, name: 'DateTime Value', desc: 'A single date-and-time value.' },
    { id: 45, name: 'Integer Value', desc: 'A signed whole-number value living in software.' },
    { id: 46, name: 'Large Analog Value', desc: 'A double-precision analog value — numbers a 32-bit float would round.' },
    { id: 47, name: 'OctetString Value', desc: 'A raw byte-string value.' },
    { id: 48, name: 'Positive Integer Value', desc: 'An unsigned whole-number value living in software.' },
    { id: 49, name: 'TimePattern Value', desc: 'A recurring time-of-day pattern.' },
    { id: 50, name: 'Time Value', desc: 'A single time-of-day value.' },
    { id: 51, name: 'Notification Forwarder', desc: 'Re-routes event notifications onward to other recipients.' },
    { id: 52, name: 'Alert Enrollment', desc: "Funnels a device's internal alerts into one notification point." },
    { id: 53, name: 'Channel', desc: 'Fans one written value out to a group of property references.' },
    { id: 54, name: 'Lighting Output', desc: 'A dimmable lighting channel.' },
    { id: 55, name: 'Binary Lighting Output', desc: 'An on/off lighting channel.' },
    { id: 56, name: 'Network Port', desc: "A network interface's configuration — IP, MS/TP, BACnet/SC." },
    { id: 57, name: 'Elevator Group', desc: 'A bank of lifts or escalators monitored as one group.' },
    { id: 58, name: 'Escalator', desc: "An escalator's status and faults." },
    { id: 59, name: 'Lift', desc: "An elevator car's status, position, and faults." },
    { id: 60, name: 'Staging', desc: 'Maps an analog Present_Value onto on/off stages via configured thresholds — equipment staging.' },
    { id: 61, name: 'Audit Log', desc: 'Records who changed what — an audit trail of operations.' },
    { id: 62, name: 'Audit Reporter', desc: 'Generates the audit notifications an Audit Log records.' },
    { id: 63, name: 'Color', desc: 'A color command for color-capable lighting.' },
    { id: 64, name: 'Color Temperature', desc: 'A correlated-color-temperature command for tunable-white lighting.' },
];

// Ascending by id. Every id->name verified 2026-07-13 against BACpypes3
// + BACnet4J (both independent of bacnet-stack); property-identifier
// numbers are stable across 135 editions.
const propertyIds = [
    { id: 4, name: 'Active_Text', desc: "The display text for a binary object's active state." },
    { id: 11, name: 'APDU_Timeout', desc: 'Milliseconds the device waits for a reply before retrying.' },
    { id: 17, name: 'Notification_Class', desc: "Which Notification Class object routes this object's events." },
    { id: 22, name: 'COV_Increment', desc: 'The smallest change that triggers a Change-of-Value notification.' },
    { id: 25, name: 'Deadband', desc: 'How far back inside the limits a value must come before returning to normal.' },
    { id: 28, name: 'Description', desc: 'Free-text description of the object.' },
    { id: 30, name: 'Device_Address_Binding', desc: 'The device-instance → network-address bindings the device has learned.' },
    { id: 31, name: 'Device_Type', desc: 'Free text describing the attached hardware — e.g. the sensor type.' },
    { id: 35, name: 'Event_Enable', desc: 'Which transitions (to-offnormal / to-fault / to-normal) send notifications.' },
    { id: 36, name: 'Event_State', desc: 'normal / fault / offnormal / high-limit / low-limit.' },
    { id: 38, name: 'Exception_Schedule', desc: "The Schedule object's override entries — holidays and one-offs." },
    { id: 40, name: 'Feedback_Value', desc: 'The proven value an output compares against its command for feedback alarms.' },
    { id: 44, name: 'Firmware_Revision', desc: "The device's firmware version string." },
    { id: 45, name: 'High_Limit', desc: 'The high alarm limit for limit-enabled objects.' },
    { id: 46, name: 'Inactive_Text', desc: "The display text for a binary object's inactive state." },
    { id: 52, name: 'Limit_Enable', desc: 'Enables high-limit and low-limit alarming independently.' },
    { id: 56, name: 'Local_Date', desc: "The device's current date." },
    { id: 57, name: 'Local_Time', desc: "The device's current time." },
    { id: 58, name: 'Location', desc: 'Free text saying where the device is installed.' },
    { id: 59, name: 'Low_Limit', desc: 'The low alarm limit for limit-enabled objects.' },
    { id: 62, name: 'Max_APDU_Length_Accepted', desc: 'The largest message the device can receive.' },
    { id: 63, name: 'Max_Info_Frames', desc: 'MS/TP: how many messages a node may initiate per token hold.' },
    { id: 64, name: 'Max_Master', desc: 'MS/TP: the highest master address the token search will poll.' },
    { id: 65, name: 'Max_Pres_Value', desc: 'The highest Present_Value the object supports.' },
    { id: 66, name: 'Minimum_Off_Time', desc: 'Short-cycle protection — seconds an output must stay off.' },
    { id: 67, name: 'Minimum_On_Time', desc: 'Short-cycle protection — seconds an output must stay on.' },
    { id: 69, name: 'Min_Pres_Value', desc: 'The lowest Present_Value the object supports.' },
    { id: 70, name: 'Model_Name', desc: "The device's model string." },
    { id: 72, name: 'Notify_Type', desc: 'Whether the object issues alarms or events.' },
    { id: 73, name: 'Number_Of_APDU_Retries', desc: 'How many times the device re-sends an unanswered request.' },
    { id: 74, name: 'Number_Of_States', desc: 'How many states a multi-state object defines.' },
    { id: 75, name: 'Object_Identifier', desc: "The object's type + instance number — e.g. analog-input, 4." },
    { id: 76, name: 'Object_List', desc: "The device's list of all its objects — read during discovery." },
    { id: 77, name: 'Object_Name', desc: 'A text name, unique within the device.' },
    { id: 79, name: 'Object_Type', desc: "The object's enumerated type — see the Object Types tab." },
    { id: 81, name: 'Out_Of_Service', desc: 'True decouples Present_Value from the physical I/O for testing.' },
    { id: 84, name: 'Polarity', desc: 'normal / reverse for binary objects — physical vs. logical sense.' },
    { id: 85, name: 'Present_Value', desc: 'The live value — the property you read and write most.' },
    { id: 87, name: 'Priority_Array', desc: '16 command slots; the lowest-numbered (highest-priority) non-null slot wins (commandable objects).' },
    { id: 88, name: 'Priority_For_Writing', desc: 'The command priority (1–16) a Schedule writes at.' },
    { id: 97, name: 'Protocol_Services_Supported', desc: 'The bitmap of BACnet services the device implements.' },
    { id: 98, name: 'Protocol_Version', desc: 'The BACnet protocol version — 1 on everything fielded.' },
    { id: 103, name: 'Reliability', desc: 'Why a value is untrustworthy — over-range, open-loop, no-fault.' },
    { id: 104, name: 'Relinquish_Default', desc: 'The value used when every priority slot is null.' },
    { id: 107, name: 'Segmentation_Supported', desc: 'Whether the device can segment long messages, and in which direction.' },
    { id: 110, name: 'State_Text', desc: 'The array of state names for a multi-state object.' },
    { id: 111, name: 'Status_Flags', desc: '{ in-alarm, fault, overridden, out-of-service }.' },
    { id: 112, name: 'System_Status', desc: 'operational / download-in-progress / non-operational and friends.' },
    { id: 113, name: 'Time_Delay', desc: 'Seconds a condition must persist before the event transition fires.' },
    { id: 117, name: 'Units', desc: 'The engineering-units enumeration — see the Eng. Units tab.' },
    { id: 120, name: 'Vendor_Identifier', desc: "The manufacturer's assigned BACnet vendor ID number." },
    { id: 121, name: 'Vendor_Name', desc: "The manufacturer's name." },
    { id: 123, name: 'Weekly_Schedule', desc: "The Schedule object's normal Monday-to-Sunday program." },
    { id: 139, name: 'Protocol_Revision', desc: 'Which revision of ASHRAE 135 the device implements.' },
    { id: 141, name: 'Record_Count', desc: 'Trend Log: how many records the buffer holds right now.' },
    { id: 145, name: 'Total_Record_Count', desc: 'Trend Log: how many records have ever been collected.' },
    { id: 152, name: 'Active_COV_Subscriptions', desc: 'The COV subscriptions the device is currently serving.' },
    { id: 155, name: 'Database_Revision', desc: "Bumps whenever the device's object database changes — a re-discovery cue." },
    { id: 371, name: 'Property_List', desc: 'The list of properties an object actually has (newer-revision devices).' },
    { id: 372, name: 'Serial_Number', desc: "The device's serial number (newer-revision devices)." },
];

// Grouped by domain (the table's Domain column), ascending by id
// within each group. `symbol` renders as a parenthetical after the
// spec name and makes symbol searches ("°C", "kW") hit the filter.
// Every id->name verified 2026-07-13 against BACnet4J + BACpypes3
// (independent of bacnet-stack); ids 63/121 carry the current ASHRAE
// 135 names (kelvin / delta-kelvin), which superseded degrees-Kelvin.
// The symbol / group fields are editorial, not spec data.
const engineeringUnits = [
    // Temperature
    { id: 62, name: 'degrees-Celsius', symbol: '°C', group: 'Temperature' },
    { id: 63, name: 'kelvin', symbol: 'K', group: 'Temperature' },
    { id: 64, name: 'degrees-Fahrenheit', symbol: '°F', group: 'Temperature' },
    { id: 65, name: 'degree-days-Celsius', group: 'Temperature' },
    { id: 66, name: 'degree-days-Fahrenheit', group: 'Temperature' },
    { id: 120, name: 'delta-degrees-Fahrenheit', symbol: 'Δ°F', group: 'Temperature' },
    { id: 121, name: 'delta-kelvin', symbol: 'ΔK', group: 'Temperature' },
    // Humidity & enthalpy
    { id: 23, name: 'joules-per-kilogram-dry-air', symbol: 'J/kg', group: 'Humidity & enthalpy' },
    { id: 24, name: 'btus-per-pound-dry-air', symbol: 'Btu/lb', group: 'Humidity & enthalpy' },
    { id: 28, name: 'grams-of-water-per-kilogram-dry-air', symbol: 'g/kg', group: 'Humidity & enthalpy' },
    { id: 29, name: 'percent-relative-humidity', symbol: '%RH', group: 'Humidity & enthalpy' },
    // Pressure
    { id: 53, name: 'pascals', symbol: 'Pa', group: 'Pressure' },
    { id: 54, name: 'kilopascals', symbol: 'kPa', group: 'Pressure' },
    { id: 55, name: 'bars', symbol: 'bar', group: 'Pressure' },
    { id: 56, name: 'pounds-force-per-square-inch', symbol: 'psi', group: 'Pressure' },
    { id: 58, name: 'inches-of-water', symbol: 'in. w.c.', group: 'Pressure' },
    { id: 59, name: 'millimeters-of-mercury', symbol: 'mmHg', group: 'Pressure' },
    { id: 61, name: 'inches-of-mercury', symbol: 'inHg', group: 'Pressure' },
    // Flow
    { id: 84, name: 'cubic-feet-per-minute', symbol: 'CFM', group: 'Flow' },
    { id: 85, name: 'cubic-meters-per-second', symbol: 'm³/s', group: 'Flow' },
    { id: 87, name: 'liters-per-second', symbol: 'L/s', group: 'Flow' },
    { id: 88, name: 'liters-per-minute', symbol: 'L/min', group: 'Flow' },
    { id: 89, name: 'us-gallons-per-minute', symbol: 'gpm', group: 'Flow' },
    { id: 135, name: 'cubic-meters-per-hour', symbol: 'm³/h', group: 'Flow' },
    // Volume
    { id: 79, name: 'cubic-feet', symbol: 'ft³', group: 'Volume' },
    { id: 80, name: 'cubic-meters', symbol: 'm³', group: 'Volume' },
    { id: 82, name: 'liters', symbol: 'L', group: 'Volume' },
    { id: 83, name: 'us-gallons', symbol: 'gal', group: 'Volume' },
    // Electrical
    { id: 2, name: 'milliamperes', symbol: 'mA', group: 'Electrical' },
    { id: 3, name: 'amperes', symbol: 'A', group: 'Electrical' },
    { id: 4, name: 'ohms', symbol: 'Ω', group: 'Electrical' },
    { id: 5, name: 'volts', symbol: 'V', group: 'Electrical' },
    { id: 8, name: 'volt-amperes', symbol: 'VA', group: 'Electrical' },
    { id: 9, name: 'kilovolt-amperes', symbol: 'kVA', group: 'Electrical' },
    { id: 11, name: 'volt-amperes-reactive', symbol: 'var', group: 'Electrical' },
    { id: 12, name: 'kilovolt-amperes-reactive', symbol: 'kvar', group: 'Electrical' },
    { id: 15, name: 'power-factor', group: 'Electrical' },
    { id: 122, name: 'kilohms', symbol: 'kΩ', group: 'Electrical' },
    // Power
    { id: 34, name: 'watts-per-square-foot', symbol: 'W/ft²', group: 'Power' },
    { id: 35, name: 'watts-per-square-meter', symbol: 'W/m²', group: 'Power' },
    { id: 47, name: 'watts', symbol: 'W', group: 'Power' },
    { id: 48, name: 'kilowatts', symbol: 'kW', group: 'Power' },
    { id: 49, name: 'megawatts', symbol: 'MW', group: 'Power' },
    { id: 50, name: 'btus-per-hour', symbol: 'Btu/h', group: 'Power' },
    { id: 51, name: 'horsepower', symbol: 'hp', group: 'Power' },
    { id: 52, name: 'tons-refrigeration', symbol: 'tons', group: 'Power' },
    { id: 157, name: 'kilo-btus-per-hour', symbol: 'MBH', group: 'Power' },
    // Energy
    { id: 19, name: 'kilowatt-hours', symbol: 'kWh', group: 'Energy' },
    { id: 20, name: 'btus', symbol: 'Btu', group: 'Energy' },
    { id: 21, name: 'therms', group: 'Energy' },
    { id: 22, name: 'ton-hours', group: 'Energy' },
    { id: 146, name: 'megawatt-hours', symbol: 'MWh', group: 'Energy' },
    { id: 147, name: 'kilo-btus', symbol: 'kBtu', group: 'Energy' },
    // Frequency & speed
    { id: 27, name: 'hertz', symbol: 'Hz', group: 'Frequency & speed' },
    { id: 104, name: 'revolutions-per-minute', symbol: 'RPM', group: 'Frequency & speed' },
    // Mass & mass flow
    { id: 39, name: 'kilograms', symbol: 'kg', group: 'Mass & mass flow' },
    { id: 40, name: 'pounds-mass', symbol: 'lb', group: 'Mass & mass flow' },
    { id: 44, name: 'kilograms-per-hour', symbol: 'kg/h', group: 'Mass & mass flow' },
    { id: 45, name: 'pounds-mass-per-minute', symbol: 'lb/min', group: 'Mass & mass flow' },
    { id: 46, name: 'pounds-mass-per-hour', symbol: 'lb/h', group: 'Mass & mass flow' },
    // Velocity
    { id: 74, name: 'meters-per-second', symbol: 'm/s', group: 'Velocity' },
    { id: 77, name: 'feet-per-minute', symbol: 'fpm', group: 'Velocity' },
    // Length & area
    { id: 0, name: 'square-meters', symbol: 'm²', group: 'Length & area' },
    { id: 1, name: 'square-feet', symbol: 'ft²', group: 'Length & area' },
    { id: 30, name: 'millimeters', symbol: 'mm', group: 'Length & area' },
    { id: 31, name: 'meters', symbol: 'm', group: 'Length & area' },
    { id: 32, name: 'inches', symbol: 'in', group: 'Length & area' },
    { id: 33, name: 'feet', symbol: 'ft', group: 'Length & area' },
    // Light
    { id: 36, name: 'lumens', symbol: 'lm', group: 'Light' },
    { id: 37, name: 'luxes', symbol: 'lx', group: 'Light' },
    { id: 38, name: 'foot-candles', symbol: 'fc', group: 'Light' },
    // Time
    { id: 70, name: 'days', group: 'Time' },
    { id: 71, name: 'hours', symbol: 'h', group: 'Time' },
    { id: 72, name: 'minutes', symbol: 'min', group: 'Time' },
    { id: 73, name: 'seconds', symbol: 's', group: 'Time' },
    // General
    { id: 95, name: 'no-units', group: 'General' },
    { id: 96, name: 'parts-per-million', symbol: 'ppm', group: 'General' },
    { id: 97, name: 'parts-per-billion', symbol: 'ppb', group: 'General' },
    { id: 98, name: 'percent', symbol: '%', group: 'General' },
];

module.exports = {
    objectTypes,
    propertyIds,
    engineeringUnits,
    // Derived slim map for the converter's Object ID tab — id → name
    // only, so the page ships no desc payload it doesn't use.
    objectTypeNames: Object.fromEntries(objectTypes.map(t => [t.id, t.name])),
};
