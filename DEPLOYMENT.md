# Marionette Deployment

## Oracle Server

User: `ubuntu`
Project directory: `/home/ubuntu/Marionette`

SSH:

Use the Oracle SSH private key stored locally on the deployment machine.

Example:

ssh -i "<path-to-oracle-private-key>" ubuntu@<ORACLE_SERVER_IP>

## PM2

Check Marionette:

pm2 status

Restart Marionette:

pm2 restart marionette

View recent logs:

pm2 logs marionette --lines 30

Stop Marionette:

pm2 stop marionette

Start Marionette:

pm2 start marionette

PM2 is configured to start automatically when the Oracle VM boots.

## Updating Marionette

After making and testing changes locally:

1. Commit and push the changes to GitHub.
2. Connect to Oracle using the SSH command above.
3. Enter the project:

cd ~/Marionette

4. Pull the latest changes:

git pull

5. If package.json or package-lock.json changed, install dependencies:

npm install

6. Restart Marionette:

pm2 restart marionette

7. Verify that it is online:

pm2 status

8. Test the changed functionality in Discord.

## Server Reboot

PM2 is configured to start automatically after an Ubuntu reboot.

Reboot:

sudo reboot

After reconnecting:

pm2 status

Marionette should appear as online.

## Important Files

.env
- Contains secrets and API credentials.
- Never commit this file.
- It is ignored by Git.

.venv/
- Contains the server's Python virtual environment for Piper.
- It is ignored by Git.

audio/
- Contains temporary generated TTS audio.
- It is ignored by Git.

## Troubleshooting

Check Marionette status:

pm2 status

Check recent logs:

pm2 logs marionette --lines 30

Check PM2 service:

systemctl status pm2-ubuntu --no-pager

Check Git state:

git status

Check for available updates:

git pull

Restart Marionette:

pm2 restart marionette