const {
    getVoiceConnection,
    joinVoiceChannel
} = require("@discordjs/voice");

const {
    resetTTS,
    clearTTS,
    skipCurrent,
    getTTSStatus
} = require("./tts");

const {
    resetSpeaker
} = require("./messageFormatter");

const {
    getCurrentEngineInfo,
    setEngine
} = require("./ttsEngine");

const DOCUMENTS = {
    privacy:
        "https://rohitkewatgt.github.io/fatui-bot-arsenal/marionette/privacy.html",

    terms:
        "https://rohitkewatgt.github.io/fatui-bot-arsenal/marionette/terms.html"
};

const COMMANDS = new Set([
    "join",
    "leave",
    "skip",
    "clear",
    "status",
    "help",
    "documents",
    "engine"
]);

const VOICE_COMMANDS = new Set([
    "join",
    "leave",
    "skip",
    "clear",
    "status",
    "engine"
]);

function getHelpMessage() {
    return (
        "**Marionette — Help**\n\n" +

        "**Voice Commands**\n\n" +

        "`/join` or `@Marionette join`\n" +
        "Join the voice channel you are currently in.\n\n" +

        "`/leave` or `@Marionette leave`\n" +
        "Leave the voice channel and reset Marionette's TTS system.\n\n" +

        "`/tts-skip` or `@Marionette skip`\n" +
        "Skip the message currently being spoken.\n\n" +

        "`/tts-clear` or `@Marionette clear`\n" +
        "Stop the current speech and clear the entire TTS queue.\n\n" +

        "`/tts-status` or `@Marionette status`\n" +
        "View the current TTS engine, voice, playback status, and queue.\n\n" +

        "`/tts-engine <engine>` or `@Marionette engine <engine>`\n" +
        "Change the TTS engine used by Marionette. Available engines are Fish Audio and Piper.\n\n" +

        "**Information**\n\n" +

        "`/documents` or `@Marionette documents`\n" +
        "View Marionette's Privacy Policy and Terms of Service.\n\n" +

        "`/help` or `@Marionette help`\n" +
        "Show this help message."
    );
}

function getDocumentsMessage() {
    return (
        "**Marionette Documents**\n\n" +
        `[Privacy Policy](${DOCUMENTS.privacy})\n` +
        `[Terms of Service](${DOCUMENTS.terms})`
    );
}

async function join(member) {
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return {
            success: false,
            message: "You need to be in a voice channel first."
        };
    }

    joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });

    return {
        success: true,
        message: `Joined **${voiceChannel.name}**.`
    };
}

function leave(guildId) {
    const connection = getVoiceConnection(guildId);

    if (!connection) {
        return {
            success: false,
            message: "I'm not currently in a voice channel."
        };
    }

    resetTTS(guildId);
    resetSpeaker(guildId);

    connection.destroy();

    return {
        success: true,
        message: "Left the voice channel and reset TTS."
    };
}

function skip(guildId) {
    const skipped = skipCurrent(guildId);

    return {
        success: skipped,
        message: skipped
            ? "Skipped the current TTS message."
            : "Marionette isn't currently speaking."
    };
}

function clear(guildId) {
    clearTTS(guildId);

    return {
        success: true,
        message: "TTS queue cleared."
    };
}

function status(guildId) {
    const status = getTTSStatus(guildId);
    const engine = getCurrentEngineInfo(guildId);

    let response =
        "**Marionette TTS Status**\n\n" +
        `Engine: ${engine.name}\n` +
        `Voice: ${engine.voice}\n` +
        `Status: ${status.status}\n` +
        `Waiting messages: ${status.waitingMessages}\n` +
        `Prepared audio: ${status.preparedMessages}`;

    if (status.currentMessage) {
        response += `\nCurrent message: ${status.currentMessage.text}`;
    }

    return {
        success: true,
        message: response
    };
}

function checkVoiceAccess(member, guildId, command) {
    const userVoiceChannel = member?.voice?.channel;

    if (!userVoiceChannel) {
        return {
            allowed: false,
            message: "You need to be in a voice channel to use this command."
        };
    }

    // /join only requires the user to be in a voice channel.
    if (command === "join") {
        return {
            allowed: true
        };
    }

    const connection = getVoiceConnection(guildId);

    if (!connection) {
        return {
            allowed: false,
            message: "Marionette is not currently in a voice channel."
        };
    }

    if (connection.joinConfig.channelId !== userVoiceChannel.id) {
        return {
            allowed: false,
            message: "You must be in the same voice channel as Marionette to use this command."
        };
    }

    return {
        allowed: true
    };
}

function changeEngine(guildId, engineName) {
    const normalizedName = engineName?.toLowerCase();

    if (!normalizedName) {
        return {
            success: false,
            message:
                "Please specify an engine: `fish` or `piper`."
        };
    }

    if (!["fish", "piper"].includes(normalizedName)) {
        return {
            success: false,
            message:
                "Invalid TTS engine. Available engines: `fish` or `piper`."
        };
    }

     const changed = setEngine(guildId, normalizedName);

    if (!changed) {
        return {
            success: false,
            message:
                "Could not change the TTS engine."
        };
    }

    const engine = getCurrentEngineInfo(guildId);

    return {
        success: true,
        message:
            `TTS engine switched to **${engine.name}**.\n` +
            `Voice: ${engine.voice}`
    };
}

function executeCommand(command, context) {
    if (VOICE_COMMANDS.has(command)) {
        const access = checkVoiceAccess(
            context.member,
            context.guild.id,
            command
        );

        if (!access.allowed) {
            return {
                success: false,
                message: access.message
            };
        }
    }

       switch (command) {
        case "join":
            return join(context.member);

        case "leave":
            return leave(context.guild.id);

        case "skip":
            return skip(context.guild.id);

        case "clear":
            return clear(context.guild.id);

        case "status":
            return status(context.guild.id);

        case "engine":
            return changeEngine(
                context.guild.id,
                context.engine
            );

        case "help":
            return {
                success: true,
                message: getHelpMessage()
            };

        case "documents":
            return {
                success: true,
                message: getDocumentsMessage()
            };

        default:
            return {
                success: false,
                message:
                    "Unknown Marionette command. Use `@Marionette help` to see the available commands."
            };
    }
}

function parseMentionCommand(message, client) {
    const mentionPattern = new RegExp(
        `^<@!?${client.user.id}>\\s*(.*)$`,
        "s"
    );

    const match = message.content.match(mentionPattern);

    if (!match) {
        return null;
    }

    const commandText = match[1].trim();

    if (!commandText) {
        return {
            command: null,
            args: [],
            valid: false
        };
    }

    const parts = commandText.split(/\s+/);

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (!COMMANDS.has(command)) {
        return {
            command: null,
            args: [],
            valid: false
        };
    }

    if (command !== "engine" && args.length > 0) {
        return {
            command: null,
            args: [],
            valid: false
        };
    }

    if (command === "engine" && args.length !== 1) {
        return {
            command: null,
            args: [],
            valid: false
        };
    }

    return {
        command,
        args,
        valid: true
    };
}

module.exports = {
    COMMANDS,
    executeCommand,
    parseMentionCommand,
    getHelpMessage,
    getDocumentsMessage,
    checkVoiceAccess
};