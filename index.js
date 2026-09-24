require("dotenv").config();

if (!process.env.TOKEN) {
    console.error("TOKEN is not configured.");
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error("CLIENT_ID is not configured.");
    process.exit(1);
}

const { isGuildAuthorized } = require("./systems/guildAuthorization");

const fs = require("node:fs");
const path = require("node:path");

const { Client, GatewayIntentBits } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

const { addToQueue } = require("./systems/tts");
const { formatMessage } = require("./systems/messageFormatter");

const {
    initializeEngine,
    shutdownEngine
} = require("./systems/ttsEngine");

const {
    executeCommand,
    parseMentionCommand
} = require("./systems/commandHandler");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const commands = new Map();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    commands.set(command.data.name, command);
}

client.once("clientReady", async () => {
    console.log("Marionette is online!");

    for (const guild of client.guilds.cache.values()) {
        if (isGuildAuthorized(guild.id)) {
            console.log(
                `Authorized server: ${guild.name} (${guild.id})`
            );

            continue;
        }

        console.log(
            `Unauthorized server detected: ${guild.name} (${guild.id})`
        );

        try {
            await guild.leave();

            console.log(
                `Left unauthorized server: ${guild.name} (${guild.id})`
            );
        } catch (error) {
            console.error(
                `Failed to leave unauthorized server: ${guild.name} (${guild.id})`,
                error
            );
        }
    }

    initializeEngine();
});

client.on("guildCreate", async guild => {
    if (isGuildAuthorized(guild.id)) {
        console.log(
            `Joined authorized server: ${guild.name} (${guild.id})`
        );

        return;
    }

    console.log(
        `Unauthorized server detected: ${guild.name} (${guild.id})`
    );

    try {
        await guild.leave();

        console.log(
            `Left unauthorized server: ${guild.name} (${guild.id})`
        );
    } catch (error) {
        console.error(
            `Failed to leave unauthorized server: ${guild.name} (${guild.id})`,
            error
        );
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;
    if (!isGuildAuthorized(interaction.guild.id)) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(
                "There was an error executing that command."
            );
        } else {
            await interaction.reply(
                "There was an error executing that command."
            );
        }
    }
});

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!isGuildAuthorized(message.guild.id)) return;

    const mentionCommand = parseMentionCommand(message, client);

    if (mentionCommand) {
        if (!mentionCommand.valid) {
            await message.reply(
                "Invalid Marionette command. Use `@Marionette help` to see the available commands."
            );

            return;
        }

        try {
            const result = await executeCommand(
                mentionCommand.command,
                {
                    guild: message.guild,
                    member: message.member,
                    engine: mentionCommand.args[0]
                }
            );

            await message.reply(result.message);
        } catch (error) {
            console.error("Marionette command error:", error);

            await message.reply(
                "There was an error executing that command."
            );
        }

        return;
    }

    if (!message.channel.isVoiceBased()) return;

    const voiceConnection = getVoiceConnection(
        message.guild.id
    );

    if (!voiceConnection) {
        console.log(
            "Marionette is not connected to a voice channel."
        );

        return;
    }

    console.log(
        `${message.author.username}: ${message.content}`
    );

    const speechParts = formatMessage(message);

    for (const speech of speechParts) {
        addToQueue(
            voiceConnection,
            message.guild.id,
            speech
        );
    }
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("Shutting down Marionette...");

    shutdownEngine();

    client.destroy();

    console.log("Marionette has shut down.");
    process.exit(0);
}

client.login(process.env.TOKEN);