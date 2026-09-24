require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const { REST, Routes } = require("discord.js");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

async function deployCommands() {
    try {
        console.log(
            `Refreshing ${commands.length} application commands...`
        );

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            { body: commands }
        );

        console.log("Commands registered successfully!");
    } catch (error) {
        console.error(error);
    }
}

deployCommands();