"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "quiz-translations");
const output = { ko: {} };

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
