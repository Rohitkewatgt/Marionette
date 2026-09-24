const fs = require("node:fs");
const path = require("node:path");

const piper = require("./piper");
const fish = require("./fish");

const configDirectory = path.join(__dirname, "..", "config");
const configPath = path.join(
    configDirectory,
    "tts-config.json"
);

const DEFAULT_ENGINE = "fish";

const engines = {
    piper: {
        module: piper,
        displayName: "Piper",
        voice: "Cori"
    },
    fish: {
        module: fish,
        displayName: "Fish Audio",
        voice: "Sandrone"
    }
};

function loadConfig() {
    if (!fs.existsSync(configPath)) {
        return {
            guilds: {}
        };
    }

    try {
        const config = JSON.parse(
            fs.readFileSync(configPath, "utf8")
        );

        if (!config.guilds || typeof config.guilds !== "object") {
            return {
                guilds: {}
            };
        }

        return config;
    } catch (error) {
        console.error(
            "Could not read TTS configuration:",
            error
        );

        return {
            guilds: {}
        };
    }
}

let config = loadConfig();

function getCurrentEngineName(guildId) {
    return config.guilds[guildId]?.engine || DEFAULT_ENGINE;
}

function getCurrentEngineInfo(guildId) {
    const engineName = getCurrentEngineName(guildId);
    const engine = engines[engineName];

    return {
        name: engine.displayName,
        voice: engine.voice
    };
}

function updatePiperState() {
    const anyGuildUsesPiper = Object.values(config.guilds).some(
        guildConfig => guildConfig.engine === "piper"
    );

    if (anyGuildUsesPiper) {
        piper.startPiper();
    } else {
        piper.stopPiper();
    }
}

function setEngine(guildId, engineName) {
    const normalizedName = engineName?.toLowerCase();

    if (!guildId || !engines[normalizedName]) {
        return false;
    }

    config.guilds[guildId] = {
        engine: normalizedName
    };

    saveConfig();
    updatePiperState();

    console.log(
        `TTS engine for guild ${guildId} switched to: ${normalizedName}`
    );

    return true;
}

async function synthesize(guildId, text) {
    const engineName = getCurrentEngineName(guildId);
    const engine = engines[engineName];

    return engine.module.synthesize(text);
}

function initializeEngine() {
    updatePiperState();
}

function saveConfig() {
    if (!fs.existsSync(configDirectory)) {
        fs.mkdirSync(configDirectory, {
            recursive: true
        });
    }

    fs.writeFileSync(
        configPath,
        JSON.stringify(config, null, 4)
    );
}

function shutdownEngine() {
    piper.stopPiper();
}

module.exports = {
    synthesize,
    getCurrentEngineName,
    getCurrentEngineInfo,
    setEngine,
    initializeEngine,
    shutdownEngine
};