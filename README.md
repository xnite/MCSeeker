# What is this?
This scans for MineCraft servers... really really fast!

# Getting Started
* Clone this repository somewhere.
* Run `npm install` from within this directory.

## Usage
Run `node ./scanner.js [options] --ip <ip range>`

### Examples
`node ./scanner.js --ip 192.168.1.0/24 --port 25565-25569 --show-desc --min-players 1 --max-players 100 --out report.csv`
`node ./scanner.js --ip 192.168.1.0/24 --port 25565-25569 --show-desc --min-players 1 --max-players 100 --version '1.8.*' --out 1.8.x-servers.csv`
`node ./scanner.js --ip 192.168.1.0/24 --port 25565-25569 --show-desc --min-players 1 --max-players 100 --version '*forge*' --out forge-servers.csv`
### CLI Options
* `--ip <ip>` - IP Address or Range of IP Addresses with CIDR notation (eg- 192.168.1.0/24)
* `--port <ports>` - Ports to look for minecraft servers on. (Default: `25565-25566`)
* `--min-players <count>` - Minimum number of players.
* `--max-players <count>` - Maximum player count.
* `--version <glob expression>` - Glob expression to filter version (eg- `1.19.*`, or `1.1*.*`). (Default: `*`)
* `--conc <howmany>` - How many concurrent connections to use for scanning. (Default is 256)

#### Output Options
* `--show-desc` - Enable showing of server description in output.
* `--quiet` - Silence terminal output.


#### Output File Options
* `--out <filename>` - Output to CSV file (Can be opened as a spreadsheet in MS Office, Google Docs, etc.)
* `--format <csv|txt|txt-connect-only>` - Output format (`txt-connect-only` for `ip:port` list format)
* `--log-desc` - Output server discription to output file.

#### Geo Location
* `--geo-ip` - Use IP Geolocation database.
* `--geo-coords` - Add geo-coordinates to output.
* `--maxmind-key` - Provide a key for maxmind database download.

## By really fast, I mean really fast!
	# time node ./scanner.js --ip 135.148.60.0/24 --show-desc --quiet --out example.csv
	Scanning ports 25565-25566 on 135.148.60.0/24
	Scan finished!

	real    0m3.183s
	user    0m0.825s
	sys     0m0.334s
	# cat example.csv | wc -l
	85
In this example it took `3.183` seconds to scan `255` IP addresses, and find `85` MineCraft servers. At this speed, a full `/16` (`123.45.0.0 - 123.45.255.255`) will take about `13.5` minutes to scan.

## Limitations
* Fails to scan more than a /10 without kicking the bucket... so you should probably stick to that or smaller ranges.
* Working on a Minecraft bot client... doesn't work though... you can see how badly it doesn't work by using `--enable-client` flag... it is totally broken. **Don't use it**.