# GW2 to Teamspeak 3 registration system

## Introduction

Ts3Bot is a stand alone nodejs application that observes clients connecting to your Teamspeak3 server. It provides a fully automated way for users to register with your Teamspeak3 server and grants/revokes permissions accordingly. User data is stored on the system's mongoDB and checked against the Guild Wars 2 API (https://wiki.guildwars2.com/wiki/API:2) to ensure every client has the appropriate permissions.

## How does it work?

Once the system is running and connected to your Teamspeak 3 server it registers to the server notify event. Every time a client connects to your Teamspeak 3 server an event is emitted by your server and captured by the system. New clients will be greeted and ask to register. Registered users will be re-validated in the background and only get asked to register again once their API-key is invalid. If valid client data changes it gets automatically updated on reconnect to your Teamspeak 3 server.

## User object stored in mongodb
```javascript
{
	"_id" : ObjectId("57f663e3a71e38bcaf9ad8bc"),
	"client_unique_id" : "bGpkyIgkhT/VygxNaII/v5UTP3E=",
	"client_nickname" : "ιмpυlѕe",
	"last_seen" : "2016-10-19T15:55:00.487Z",
	"gw2_api_key" : "915AEE3C-F92F-6D4C-8B08-BD33AE5A62EA27401ACD-6003-4FC2-A3B8-BC0808AC8C6B",
	"gw2_account_id" : "7A2FB987-5E65-E111-809D-78E7D1936EF0",
	"gw2_account_world" : "2003",
	"gw2_account_name" : "Impulse.2750",
	"gw2_guilds" : "[\"E28AE939-E856-450D-9300-96BE64777B74\",\"498E966F-0FB0-42A4-A3FD-C899D0EB766E\",\"ECBC561A-7FD9-E411-A278-AC162DC0070D\",\"FE8D9048-17D1-4A73-AE0A-D4D9D431E2C1\",\"EA63C348-6B0D-4428-B440-0E0528DB5516\"]",
	"gw2_account_created" : "2012-04-25T20:55:00Z",
	"gw2_access" : "HeartOfThorns",
	"gw2_commander" : true
}
```
## Dependencies

- node (https://nodejs.org/)
- npm (https://www.npmjs.com/)
- node-teamspeak (https://github.com/gwTumm/node-teamspeak)
- mongodb (https://www.mongodb.org/)
- PM2 (https://www.npmjs.com/package/pm2)
- expressjs (http://expressjs.com/)

## Installation

- Download and install 'Node.js' and 'npm'.
- Download the source files.
- (Optional) unpack if you downloaded the *.zip archive.
- Navigate to its root folder (*/ts3bot).
- Use 'npm' to install all dependencies.
- Configure './ts3bot/config.json'.
- Start the application using PM2.
