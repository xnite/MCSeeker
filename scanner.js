var Scanner = require('evilscan');
var status = require('minecraft-status').MinecraftServerListPing;
var mc = require('mineflayer');
var fs = require('fs');
//var mcClient = require('minecraft-protocol');
process.params = (require('commandos')).parse(process.argv);
var MINECRAFT_DEFAULT_PORT = '25565-25566';
var SCAN_MIN_PLAYERS = (process.params['min-players'] || 0); 
var SCAN_OPTS_HOSTS = (process.params['ip']||'0.0.0.0/0').toString();
var SCAN_OPTS_PORTS = (process.params['port'] || MINECRAFT_DEFAULT_PORT).toString();
var SCAN_OPTS_OUTPUT_CSV = (process.params['out']||null);
var CLIENT_TOKEN;

if(process.params['quiet'] && !SCAN_OPTS_OUTPUT_CSV)
{
	console.log("Error:\tYou have asked for --quiet output, but did not specify an --out file. This scan is pointless!\nRefusing to run a pointless operation.");
	process.exit(1);
}

if(process.params['enable-client'] && !process.params['client-token'])
{
	const https = require('https');

	https.get("https://api.thealtening.com/free/generate", res => {
		let data = [];
		res.on('data', chunk => {
			data.push(chunk);
		});

		res.on('end', () => {
			var fullBuffer = Buffer.concat(data);
			var output;
			try {
				output = JSON.parse((fullBuffer || '{}').toString());
			} catch(e) {
				console.log(fullBuffer.toString());
			}
			
			CLIENT_TOKEN = ((output||{}).token||null);
			console.log(CLIENT_TOKEN||"No token!");
		});
	}).on('error', err => {
		//console.log('Error: ', err.message);
	});
}

console.log("Scanning ports " + SCAN_OPTS_PORTS + " on " + SCAN_OPTS_HOSTS);

var options = {
	target: SCAN_OPTS_HOSTS,
	port: SCAN_OPTS_PORTS,
	states: 'O',
	banner: false,
	concurrency: 255
}
var scan = new Scanner(options);

function placeTabs(string)
{
	var count = Math.floor(string.length / 4);
	for(i=0; i <= count;  i++)
	{
		string += "\t";
	}
	if(count <= 1)
	{
		string += "\t\t";
	}
	return string;
}

scan.on('result', function(data){
	//console.log(data);
	status.ping(757, data.ip, data.port, (process.params['timeout']||15)*1000).then(function(pingRes){
		if (pingRes.players.online >= SCAN_MIN_PLAYERS && (!process.params['max-players'] || (process.params['max-players'] && pingRes.players.max <= process.params['max-players'])))
		{
			var theText = data.ip + ":" + data.port + "\t" + pingRes.version.name + "\t" + pingRes.players.online + " of " + pingRes.players.max + " players";
			if(process.params['show-desc'])
			{
				theText += "\t"+pingRes.description.text;
			}
			if (SCAN_OPTS_OUTPUT_CSV)
			{
				fs.appendFileSync(SCAN_OPTS_OUTPUT_CSV, data.ip+":"+data.port+","+pingRes.version.name.replace(/\,/g, '+')+","+pingRes.players.online+"/"+pingRes.players.max+"\n");
			}
			if(!process.params['quiet'])
			{
				console.log(theText);
			}
		}
		if(process.params['enable-client'] && (CLIENT_TOKEN||process.params['client-token']))
		{
			var client = mc.createBot({
				host: data.ip,   // optional
				port: data.port,         // optional
				token: (CLIENT_TOKEN||process.params['client-token']),
				auth: 'mojang', // optional; by default uses mojang, if using a microsoft account, set to 'microsoft'
				protocol: pingRes.version.protocol
			});
			client.on('chat', function (packet) {
				// Listen for chat messages and echo them back.
				var jsonMsg = JSON.parse(packet.message);
				if (jsonMsg.translate == 'chat.type.announcement' || jsonMsg.translate == 'chat.type.text') {
					var username = jsonMsg.with[0].text;
					var msg = jsonMsg.with[1];
					if (username === client.username) return;
					console.log(msg);
					//client.write('chat', { message: msg.text });
					client.end("Logout");
				}
			});
		}
	}).catch(function(error){
		//console.log(error);
	})
})

scan.on('error', err => {
    //console.log(err.toString());
});

scan.on('done', () => {
    console.log("Scan finished!");
});
scan.run();