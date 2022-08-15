var AirTunes = require('../lib/'),
    spawn = require('child_process').spawn,
    argv = require('optimist')
      .usage('Usage: $0 --host [host] --port [num] --ffmpeg [path] --file [path] --volume [num] --password [string] --mode [mode] --airplay2 [1/0] --debug [mode] --ft [featuresHexes] --sf [statusFlags] --et [encryptionTypes] --cn [audioCodecs]')
      .default('port', 5002)
      .default('volume', 50)
      .default('ffmpeg', 'E:\\ffmpeg-20180122-2e96f52-win64-shared\\bin\\ffmpeg.exe')
      .default('file', 'http://radio.plaza.one/mp3_low')
      .default('ft',"0x7F8AD0,0x38BCF46")
      .default('sf',"0x98404")
      .default('cn',"0,1,2,3")
      .default('et',"0,3,5")
      .demand(['host'])
      .argv;
const fetch = require('electron-fetch').default
console.log('adding device: ' + argv.host + ':' + argv.port);
var airtunes = new AirTunes();
argv.txt = [
  `cn=${argv.cn}`,
  'da=true',
  `et=${argv.et}`,
  `ft=${argv.ft}`,
  `sf=${argv.sf}`,
  'md=0,1,2',
  'am=AudioAccessory5,1',
  'pk=lolno',
  'tp=UDP',
  'vn=65537',
  'vs=610.20.41',
  'ov=15.4.1',
  'vv=2'
]
// argv.txt = [
//   'acl=0',
//   'deviceid=nah',
//   'features=0x7F8AD0,0x38BCF46',
//   'rsf=0x3',
//   'fv=p20.T-KSU2EUABC-2002.0',
//   'at=0x1',
//   'flags=0xc4',
//   'model=UAU7000',
//   'company=Samsung',
//   'manufacturer=Samsung',
//   'serialNumber=wasd',
//   'protovers=1.1',
//   'srcvers=377.30.02',
//   'pi=none',
//   'psi=wasd',
//   'gid=wasd',
//   'gcgl=0',
//   'pk=no'
// ]
var device = airtunes.add(argv.host, argv);

// when the device is online, spawn ffmpeg to transcode the file
device.on('status', function(status) {
  console.log('status: ' + status);

  if(status === 'need_password'){
    device.setPasscode(argv.password);
  }

  if(status !== 'ready')
    return;

  if(status == 'ready') {
      setInterval(()=>{
        fetch("https://api.plaza.one/status")
        .then((res) => res.json()).then((radiostatus) => {
          airtunes.setTrackInfo(device.key, radiostatus.song.title, radiostatus.song.artist, radiostatus.song.album )
          fetch(radiostatus.song.artwork_src)
          .then((res) => res.buffer())
          .then((buffer) => {
            airtunes.setArtwork(device.key, buffer, "image/jpeg");
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

  var ffmpeg = spawn(argv.ffmpeg, [
    '-i', argv.file,
    '-acodec', 'pcm_s16le',
    '-f', 's16le',        // PCM 16bits, little-endian
    '-ar', '44100',       // Sampling rate
    '-ac', 2,             // Stereo
    'pipe:1'              // Output on stdout
  ]);

  // pipe data to AirTunes
  ffmpeg.stdout.pipe(airtunes);

  // detect if ffmpeg was not spawned correctly
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', function(data) {
    if(/^execvp\(\)/.test(data)) {
      console.log('failed to start ' + argv.ffmpeg);
      process.exit(1);
    }
  });
});

// monitor buffer events
airtunes.on('buffer', function(status) {
  console.log('buffer ' + status);

  // after the playback ends, give some time to AirTunes devices
  if(status === 'end') {
    console.log('playback ended, waiting for AirTunes devices');
    setTimeout(function() {
      airtunes.stopAll(function() {
        console.log('end');
        process.exit();
      });
    }, 2000);
  }
});
