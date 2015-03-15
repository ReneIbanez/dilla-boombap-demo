// Set up the dilla object
var Dilla = require('dilla');
var audioContext = new AudioContext();
var dilla = new Dilla(audioContext, {
  'tempo': 88
});

// Display playback position
var position = document.getElementById('position');
var play = document.getElementById('play');
var stop = document.getElementById('stop');
function draw () {
  position.innerText = dilla.position();

  if (dilla.clock._state.playing) {
    play.className = 'control hidden';
    stop.className = 'control';
  }
  else {
    play.className = 'control';
    stop.className = 'control hidden';
  }
  window.requestAnimationFrame(draw);
}
play.addEventListener('click', dilla.start.bind(dilla));
stop.addEventListener('click', dilla.stop.bind(dilla));

// Object to hold our sound buffers
var sounds = {};

// Load a sound and make it playable buffer
function loadSound (name, done) {
  var request = new XMLHttpRequest();
  request.open('GET', 'sounds/' + name + '.wav', true);
  request.responseType = 'arraybuffer';
  request.onload = function soundWasLoaded () {
    audioContext.decodeAudioData(request.response, function (buffer) {
      sounds[name] = buffer;
      done();
    });
  }
  request.send();
}

// The names of the sounds we'll be using
var soundNames = [
  'kick', 'snare', 'hihat',
  'plong1', 'plong2',
  'string1', 'string2', 'string3',
  'bass'
];

// Load all sounds, and then start the playback
function loadNextSound () {
  var soundName = soundNames.shift();
  if (!soundName) return start();
  loadSound(soundName, loadNextSound);
}

// Start playback and drawing the current position
function start () {
  var loading = document.getElementById('loading');
  loading.parentNode.removeChild(loading);
  draw();
  dilla.start();
}

// Add master compressor
var compressor = audioContext.createDynamicsCompressor();
compressor.threshold.value = -15;
compressor.knee.value = 30;
compressor.ratio.value = 12;
compressor.reduction.value = -20;
compressor.attack.value = 0;
compressor.release.value = 0.25;

// Add master reverb
var Reverb = require('soundbank-reverb')
var reverb = Reverb(audioContext)
reverb.time = 1;
reverb.wet.value = 0.1;
reverb.dry.value = 1;
reverb.filterType = 'highpass'
reverb.cutoff.value = 1000 //Hz

// Connect them to our output
compressor.connect(reverb);
reverb.connect(audioContext.destination);

// Object to hold reference to our sound buffer
// sources, so we can fade out or stop playback
var sources = {};

// The most important function, starts or stops a sound buffer
function onStep (step) {

  if (step.event === 'start') {
    var source = audioContext.createBufferSource();
    source.buffer = sounds[step.id];
    source.playbackRate.value = step.args[3] || 1;

    var gainNode = source.gainNode = audioContext.createGain();
    var gainVolume = step.args[2] || 1;

    source.connect(gainNode);
    gainNode.connect(compressor);

    if (step.id === 'bass') {
      source.gainNode.gain.setValueAtTime(0, step.time);
      source.gainNode.gain.linearRampToValueAtTime(gainVolume, step.time + 0.01);  
    }
    else {
      gainNode.gain.value = gainVolume;
    }
   
    source.start(step.time); 
    sources[step.id + step.args[0]] = source;
  }
  else if (step.event === 'stop') {
    var source = sources[step.id + step.args[0]];
    if (source) {
      sources[step.id + step.args[0]] = null;
      if (step.id === 'bass') {
        var gainVolume = step.args[2] || 1;
        source.gainNode.gain.setValueAtTime(gainVolume, step.time);
        source.gainNode.gain.linearRampToValueAtTime(0, step.time + 0.01);  
      } else {
        source.stop(step.time);  
      }
    }
  }
}

// Attach the onStep callback to the "step" event
dilla.on('step', onStep);

// The notes for our kick
dilla.set('kick', [
  ['1.1.01'],
  ['1.1.51', null, 0.8],
  ['1.2.88'],
  ['1.3.75'],
  ['1.4.72', null, 0.7],
  ['2.1.51', null, 0.7],
  ['2.3.51', null, 0.8],
  ['2.3.88']
]);

dilla.set('snare', [
  ['1.1.91'],
  ['1.3.91'],
  ['2.1.91'],
  ['2.4.03']
]);

dilla.set('hihat', [
  ['*.1.01', null, 0.7],
  ['*.2.01', null, 0.8],
  ['*.3.01', null, 0.7],
  ['*.4.01', null, 0.8],
  ['*.4.53', null, 0.6]
]);

dilla.set('plong1', [
  ['1.1.01', 95]
]);

dilla.set('plong2', [
  ['1.4.90', 60, 0.4],
  ['2.1.52', 60, 0.7]
]);

dilla.set('string1', [
  ['1.3.75', 90, 0.6],
  ['1.4.52', 90, 0.2],
  ['2.3.25', 70, 0.6],
  ['2.4.01', 85, 0.3],
  ['2.4.75', 85, 0.1]
]);

dilla.set('string2', [
  ['2.2.50', 70, 0.6]
]);

dilla.set('string3', [
  ['1.2.05', 45, 0.6],
  ['1.2.51', 45, 0.4],
  ['1.3.05', 45, 0.2],
  ['1.3.51', 45, 0.05],
  ['2.2.05', 45, 0.6]
]);

dilla.set('bass', [
  ['1.1.01', 60, 0.8, 0.55],
  ['1.2.72', 15, 0.5, 0.55],
  ['1.3.02', 40, 0.8, 0.55],
  ['1.4.01', 40, 0.6, 0.64],
  ['1.4.51', 100, 0.8, 0.74],
  ['2.3.51', 60, 0.8, 0.46],
  ['2.4.51', 40, 0.8, 0.52]
]);

// Start loading the sounds, sets it all off
loadNextSound();