var Scanner = require('evilscan');
var status = require('minecraft-status').MinecraftServerListPing;
var mc = require('mineflayer');
var fs = require('fs');
var maxmind;
//var mcClient = require('minecraft-protocol');
process.params = (require('commandos')).parse(process.argv);
var MINECRAFT_DEFAULT_PORT = '25565-25566';
var SCAN_MIN_PLAYERS = (process.params['min-players'] || 0); 
var SCAN_OPTS_HOSTS = (process.params['ip']||'0.0.0.0/0').toString();
var SCAN_OPTS_PORTS = (process.params['port'] || MINECRAFT_DEFAULT_PORT).toString();
var SCAN_OPTS_OUTPUT_CSV = (process.params['out']||null);
var CLIENT_TOKEN;

if(process.params['geo-ip'])
{
	if (!fs.existsSync("./GeoLite2.mmdb"))
	{
		if(!process.params['maxmind-key'])
		{
			return console.log("NO MAXMIND DOWNLOAD KEY WAS PROVIDED! CANNOT DOWNLOAD THE DATABASE WITHOUT A KEY!");
		}
		return require('https').get("https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key="+ process.params['maxmind-key'] +"&suffix=tar.gz", function(resp){
			const zlib = require('zlib');
			const tar = require('tar-stream');
			
			const tarFile = fs.createWriteStream("./GeoLite2.tar");
			const dbfile = fs.createWriteStream('./GeoLite2.mmdb');
			resp.pipe(zlib.createGunzip()).pipe(tarFile);

			tarFile.on("close", function(){
				console.log("Wrote tar to disk. Extracting DB file...");
				var extract = tar.extract();
				extract.on('entry', function(header, stream, next){
					if (header.name.match(/.*?\.mmdb/))
					{
						stream.pipe(dbfile);
						dbfile.on('close', function(){
							fs.unlinkSync("./GeoLite2.tar");
							console.log("Extracted GeoIP database. Please rerun your scan to continue.");
							return process.exit(0);
						})
					} else {
						return next();
					}
						stream.resume();
					});
				fs.createReadStream("./GeoLite2.tar").pipe(extract);
			})
		});
	}
	maxmind = require('maxmind');
}

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
				theText += "\t"+pingRes.description.text.replace(/\n/g, ' ');
			}
			if (SCAN_OPTS_OUTPUT_CSV)
			{
				var line;
				switch(process.params['format']||'csv')
				{
					case "txt":
						line = data.ip + ":" + data.port + "\t" + pingRes.version.name.replace(/\,/g, '+');
						if (process.params['log-desc']) {
							line += "\t" + pingRes.description.text.replace(/\n/g, ' ');
						}
						break;
					case "txt-connect-only":
						line = data.ip + ":" + data.port;
						break;
					case "csv":
					default:
						line = data.ip + ":" + data.port + "," + pingRes.version.name.replace(/\,/g, '+') + "," + pingRes.players.online + "/" + pingRes.players.max;
						if (process.params['log-desc']) {
							line += "," + pingRes.description.text.replace(/\n/g, ' ').replace(/\,/g, ';');
						}
				}
				if(process.params['geo-ip'])
				{
					maxmind.open('./GeoLite2.mmdb').then(function(geoip){
						var geoLoc = geoip.get(data.ip);
						var geoText = geoLoc.country.iso_code;
						if (process.params['geo-coords']) {
							geoText += " (" + geoLoc.location.latitude + "," + geoLoc.location.longitude + ")";
						}
						switch (process.params['format'] || 'csv')
						{
							case "txt":
								line += " " + geoText;
							case "csv":
								line += "," + geoText;
							default:
								break;
						}
						fs.appendFileSync(SCAN_OPTS_OUTPUT_CSV, line + "\n");
					}).catch(function(err){
						console.log(err);
					});
				} else {
					fs.appendFileSync(SCAN_OPTS_OUTPUT_CSV, line);
				}
			}
			if(!process.params['quiet'])
			{
				if (process.params['geo-ip'])
				{
					maxmind.open('./GeoLite2.mmdb').then(function (geoip) {
						var geoLoc = geoip.get(data.ip);
						var geoText = geoLoc.country.iso_code;
						if(process.params['geo-coords'])
						{
							geoText += " (" + geoLoc.location.latitude + "," + geoLoc.location.longitude + ")";
						}
						console.log("[" + geoText + "] " + theText);
					}).catch(function (err) {
						console.log(err);
					});
				} else {
					console.log(theText);
				}
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