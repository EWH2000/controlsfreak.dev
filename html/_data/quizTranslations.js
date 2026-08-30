"use strict";

const fs = require("fs");
const path = require("path");
const i18n = require("./i18n.js");

const root = path.join(__dirname, "quiz-translations");
const output = Object.fromEntries(
    i18n.locales
        .map(({ code }) => code)
        .filter((code) => code !== i18n.defaultLocale)
        .map((code) => [code, {}])
);

Object.keys(output).forEach((locale) => {
    const dir = path.join(root, locale);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
        .filter((file) => file.endsWith(".js"))
        .sort()
        .forEach((file) => {
            output[locale][path.basename(file, ".js")] = require(path.join(dir, file));
        });
});

module.exports = output;
