"use strict";

const i18n = require("../html/_data/i18n.js");

const SITE_ORIGIN = "https://controlsfreak.dev";
const PUBLIC_LOCALES = new Set(i18n.locales.map((entry) => entry.code));

function resolveLocale(value) {
    const candidate = typeof value === "string"
        ? value
        : value && typeof value.locale === "string"
            ? value.locale
            : i18n.defaultLocale;
    return PUBLIC_LOCALES.has(candidate) ? candidate : i18n.defaultLocale;
}

function getMessage(locale, key) {
    const selected = i18n.messages[resolveLocale(locale)];
    const value = String(key || "").split(".").reduce(
        (current, part) => current && current[part],
        selected
    );
    if (typeof value !== "string") {
        throw new Error(`Missing i18n message: ${resolveLocale(locale)}.${key}`);
    }
    return value;
}

function interpolate(message, values) {
    if (!values || typeof values !== "object") return message;
    return message.replace(/\{([A-Za-z][\w-]*)\}/g, (match, name) => {
        if (!Object.prototype.hasOwnProperty.call(values, name)) return match;
        return String(values[name]);
    });
}

function translate(locale, key, values) {
    return interpolate(getMessage(locale, key), values);
}

function splitUrlSuffix(value) {
    const match = String(value || "").match(/^([^?#]*)([?#][\s\S]*)?$/);
    return { pathname: match ? match[1] : "", suffix: match && match[2] ? match[2] : "" };
}

function stripLocalePrefix(pathname) {
    const match = String(pathname || "").match(/^\/([^/]+)(?=\/|$)/);
    if (!match || !PUBLIC_LOCALES.has(match[1])) return pathname;
    return String(pathname).slice(match[0].length) || "/";
}

function localePath(value, locale) {
    if (!value) return value;
    const selected = resolveLocale(locale);
    const raw = String(value);
    const isSiteUrl = raw === SITE_ORIGIN || raw.startsWith(`${SITE_ORIGIN}/`);
    if (!isSiteUrl && !raw.startsWith("/")) return raw;
    if (/^\/\//.test(raw)) return raw;

    const origin = isSiteUrl ? SITE_ORIGIN : "";
    const local = isSiteUrl ? raw.slice(SITE_ORIGIN.length) || "/" : raw;
    const { pathname, suffix } = splitUrlSuffix(local);
    const withoutLocale = stripLocalePrefix(pathname) || "/";
    const localized = selected === i18n.defaultLocale
        ? withoutLocale
        : withoutLocale === "/"
            ? `/${selected}/`
            : `/${selected}${withoutLocale}`;
    return origin + localized + suffix;
}

function translationKey(value) {
    if (!value) return "";
    const raw = String(value).replace(SITE_ORIGIN, "");
    const { pathname } = splitUrlSuffix(raw || "/");
    return stripLocalePrefix(pathname).replace(/\.html$/, "") || "/";
}

function localeFromCanonical(value) {
    const raw = String(value || "").replace(SITE_ORIGIN, "");
    const match = raw.match(/^\/([^/]+)(?:\/|$)/);
    return match && PUBLIC_LOCALES.has(match[1]) ? match[1] : i18n.defaultLocale;
}

function localizedCanonical(value, locale) {
    if (!value) return value;
    const localized = localePath(value, locale);
    return localized.startsWith("http") ? localized : SITE_ORIGIN + localized;
}

function cleanCanonical(value) {
    return String(value || "").replace(/\.html$/, "");
}

function localizedSequence(sequence, locale) {
    const selected = resolveLocale(locale);
    const output = {};
    Object.entries(sequence || {}).forEach(([key, links]) => {
        output[localePath(key, selected)] = {
            prev: links.prev ? localePath(links.prev, selected) : null,
            next: links.next ? localePath(links.next, selected) : null,
        };
    });
    return output;
}

module.exports = {
    SITE_ORIGIN,
    cleanCanonical,
    localeFromCanonical,
    localePath,
    localizedCanonical,
    localizedSequence,
    resolveLocale,
    stripLocalePrefix,
    translate,
    translationKey,
};
