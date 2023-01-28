var spawn = require('child_process').spawn
var airtunes = spawn("airtunes2.exe");
const fetch = require('electron-fetch').default
var { WebSocket } = require('ws');
var ffmpeg = spawn('C:\\ffmpeg\\bin\\ffmpeg.exe', [
    '-i', 'http://radio.plaza.one/mp3_low',
    '-acodec', 'pcm_s16le',
    '-f', 's16le',        // PCM 16bits, little-endian
    '-ar', '44100',       // Sampling rate
    '-ac', 2,             // Stereo
    'pipe:1'              // Output on stdout
]);

  // pipe data to AirTunes
ffmpeg.stdout.pipe(airtunes.stdin);

  // detect if ffmpeg was not spawned correctly
ffmpeg.stderr.setEncoding('utf8');
ffmpeg.stderr.on('data', function(data) {
    if(/^execvp\(\)/.test(data)) {
      console.log('failed to start ' + argv.ffmpeg);
      process.exit(1);
    }
});
setTimeout(()=>{
const ws = new WebSocket('ws://localhost:8980');
airtunes.stdout.pipe(process.stdout);
airtunes.stderr.pipe(process.stdout);
ws.on('error', console.error);

ws.on('open', function open() {
  ws.send(JSON.stringify({"type":"addDevices",
       "host":"192.168.100.12",
       "args":{"port":7000,
       "volume":20, "airplay2": true ,
       //"txt":["cn=0,1,2,3","da=true","et=0,3,5","ft=0x4A7FCA00,0xBC354BD0","sf=0xa0404","md=0,1,2","am=AudioAccessory5,1","pk=lolno","tp=UDP","vn=65537","vs=670.6.2","ov=16.2","vv=2"],
       "txt":["cn=0,1,2,3","da=true","et=0,3,5","ft=0x4A7FCA00,0xBC354BD0","sf=0x80484","md=0,1,2","am=AudioAccessory5,1","pk=lol","tp=UDP","vn=65537","vs=670.6.2","ov=16.2","vv=2"],
       "debug":true,
       "forceAlac":false}}))
});


ws.on('message', function message(data) {
  console.log('received: %s', data);
  data = JSON.parse(data)
  if (data.status == "ready"){
    setInterval(()=>{
      fetch("https://api.plaza.one/status")
      .then((res) => res.json()).then((radiostatus) => {
        ws.send(JSON.stringify(      
            {"type":"setTrackInfo",
            "devicekey": data.key,
            "artist": radiostatus.song.artist,
            "album": radiostatus.song.album,
            "name": radiostatus.song.title}
        ))
        fetch(radiostatus.song.artwork_src)
        .then((res) => res.buffer())
        .then((buffer) => {
          ws.send(JSON.stringify(      
            {"type":"setArtwork",
            "devicekey": data.key,
            "contentType" : "image/jpeg",
            "artwork": buffer.toString('hex')}
          ))
        })
        .catch((err) => {
          console.log(err);
        });
      })
      .catch((err) => {
        console.log(err);
      });    
    },10000)
  }
});
}, 1000);
