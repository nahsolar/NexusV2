/* eslint-disable */
const {Client} = require('fnbr');

const client = new Client({
    auth: {
        killOtherTokens: false,
        deviceAuth: {
            deviceId: 'c9b4686d6c654712a4aadbaf17f5bb21',
            accountId: '7a83d3f5c9084298968585a811fefeb3',
            secret: 'DTIQ5U2HY6LVW5ZKRWNOFECVKUF4IT4Y'
        }
    },
    connectToXMPP: false,
    forceNewParty: false
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.displayName}`);

    setInterval(function() {
        client.party.me.setOutfit('EID_Accolades', [{ channel: 'Material', variant: 'Mat3' }], [])
    }, 2000);
});

client.login();