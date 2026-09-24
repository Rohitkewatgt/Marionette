const fs = require("node:fs");
const path = require("node:path");

const configDirectory = path.join(__dirname, "..", "config");
const configPath = path.join(
    configDirectory,
    "authorized-guilds.json"
);

function loadAuthorizedGuilds() {
    if (!fs.existsSync(configPath)) {
        console.error(
            "Authorized guild configuration was not found."
        );

        return [];
    }

    try {
        const config = JSON.parse(
            fs.readFileSync(configPath, "utf8")
        );

        if (!Array.isArray(config.guilds)) {
            console.error(
                "Authorized guild configuration is invalid."
            );

            return [];
        }

        return config.guilds;
    } catch (error) {
        console.error(
            "Could not read authorized guild configuration:",
            error
        );

        return [];
    }
}

const authorizedGuilds = loadAuthorizedGuilds();

function isGuildAuthorized(guildId) {
    return authorizedGuilds.includes(guildId);
}

module.exports = {
    isGuildAuthorized
};