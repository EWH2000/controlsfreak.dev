"use strict";

const { localePath, resolveLocale } = require("./i18n.js");

function sameKeys(actual, expected, label) {
    const a = [...actual].sort();
    const e = [...expected].sort();
    if (JSON.stringify(a) !== JSON.stringify(e)) {
        throw new Error(`${label} keys differ: expected [${e.join(", ")}], got [${a.join(", ")}]`);
    }
}

function sameList(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${label} differs: expected [${expected.join(", ")}], got [${actual.join(", ")}]`);
    }
}

function validateTranslatedMarkup(source, translated, label) {
    const tags = (value) => [...String(value).matchAll(/<(\/)?([a-z][\w:-]*)\b[^>]*>/gi)]
        .map((match) => `${match[1] ? "/" : ""}${match[2].toLowerCase()}`);
    const code = (value) => [...String(value).matchAll(/<code>([\s\S]*?)<\/code>/gi)]
        .map((match) => match[1]);
    const links = (value) => [...String(value).matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)]
        .map((match) => localePath(match[2], "en"));
    sameList(tags(translated), tags(source), `${label} HTML tags`);
    sameList(code(translated), code(source), `${label} code identifiers`);
    sameList(links(translated), links(source), `${label} links`);
}

function localizeMarkupLinks(value, locale) {
    return String(value).replace(
        /(\bhref\s*=\s*)(["'])(.*?)\2/gi,
        (match, prefix, quote, href) => `${prefix}${quote}${localePath(href, locale)}${quote}`
    );
}

function localizeQuiz(questions, locale, slug, translations) {
    const selected = resolveLocale(locale);
    if (!Array.isArray(questions)) return questions;

    if (selected === "en") {
        return questions.map((question) => ({
            ...question,
            learnMore: question.learnMore ? {
                ...question.learnMore,
                href: localePath(question.learnMore.href, selected),
            } : undefined,
        }));
    }

    const overlay = translations && translations[selected] && translations[selected][slug];
    if (!overlay || typeof overlay !== "object") {
        throw new Error(`Missing quiz translation overlay: ${selected}/${slug}`);
    }

    sameKeys(Object.keys(overlay), questions.map((question) => question.id), `${selected}/${slug} questions`);

    return questions.map((question) => {
        const translated = overlay[question.id];
        const required = ["prompt", "explain"];
        if (question.snippet) required.push("snippet");
        if (question.learnMore) required.push("learnMoreLabel");
        if (question.choices) required.push("choices");
        sameKeys(Object.keys(translated), required, `${selected}/${slug}/${question.id}`);

        const localizedPrompt = localizeMarkupLinks(translated.prompt, selected);
        const localizedExplain = localizeMarkupLinks(translated.explain, selected);
        const localized = {
            ...question,
            prompt: localizedPrompt,
            explain: localizedExplain,
        };
        validateTranslatedMarkup(question.prompt, localizedPrompt, `${selected}/${slug}/${question.id}/prompt`);
        validateTranslatedMarkup(question.explain, localizedExplain, `${selected}/${slug}/${question.id}/explain`);
        if (question.snippet) localized.snippet = localizeMarkupLinks(translated.snippet, selected);
        if (question.snippet) {
            validateTranslatedMarkup(question.snippet, localized.snippet, `${selected}/${slug}/${question.id}/snippet`);
        }
        if (question.learnMore) {
            localized.learnMore = {
                ...question.learnMore,
                href: localePath(question.learnMore.href, selected),
                label: translated.learnMoreLabel,
            };
        }
        if (question.choices) {
            sameKeys(
                Object.keys(translated.choices),
                question.choices.map((choice) => choice.id),
                `${selected}/${slug}/${question.id} choices`
            );
            localized.choices = question.choices.map((choice) => ({
                ...choice,
                text: localizeMarkupLinks(translated.choices[choice.id], selected),
            }));
            question.choices.forEach((choice) => {
                validateTranslatedMarkup(
                    choice.text,
                    localized.choices.find((item) => item.id === choice.id).text,
                    `${selected}/${slug}/${question.id}/choices/${choice.id}`
                );
            });
        }
        return localized;
    });
}

module.exports = { localizeQuiz };
