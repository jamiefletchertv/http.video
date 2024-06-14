document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('video');
  const manifestSelector = document.getElementById('manifestSelector');
  const playButton = document.getElementById('playButton');
  const feedback = document.getElementById('feedback');
  const trackTable = document.getElementById('trackTable');
  const trackTableBody = trackTable.querySelector('tbody');
  const trackTableHead = trackTable.querySelector('thead');
  const eventTable = document.getElementById('eventTable');
  const eventTableBody = eventTable.querySelector('tbody');
  let shakaPlayer = null;
  let updateInterval = null;

  // Play button click event
  playButton.addEventListener('click', () => {
    const manifestUri = manifestSelector.value;
    loadPlayer(manifestUri);
    feedback.textContent = `Active Player: Shaka Player`;
  });

  // Load the player with the manifest URI
  async function loadPlayer(manifestUri) {
    // Stop the video and clear any existing player instance
    if (shakaPlayer) {
      await shakaPlayer.destroy();
      shakaPlayer = null;
    }

    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }

    trackTable.style.display = 'none';
    trackTableBody.innerHTML = '';
    eventTable.style.display = 'none';
    eventTableBody.innerHTML = '';

    shakaPlayer = new shaka.Player(video);
    try {
      await shakaPlayer.load(manifestUri);
      video.play();

      if (manifestUri.endsWith('.mpd')) {
        const parser = new CustomManifestParser();
        const result = await parser.parseManifest(manifestUri);
        updateTrackTable(result.tracks);
        updateEventTable(result.events);

        const minimumUpdatePeriod = result.minimumUpdatePeriod || 5; // Default to 5 seconds if not specified
        updateInterval = setInterval(async () => {
          const updatedResult = await parser.parseManifest(manifestUri);
          updateTrackTable(updatedResult.tracks);
          updateEventTable(updatedResult.events);
        }, minimumUpdatePeriod * 1000);
      } else if (manifestUri.endsWith('.m3u8')) {
        const tracks = await parseHlsManifest(manifestUri);
        updateTrackTable(tracks);
        const events = await parseHlsEvents(manifestUri);
        updateEventTable(events);
      }
    } catch (e) {
      console.error('Error loading manifest:', e);
    }
  }

  // Function to update the track table
  function updateTrackTable(tracks) {
    const columns = new Set();
    tracks.forEach(track => {
      Object.keys(track).forEach(key => columns.add(key));
    });

    trackTableHead.innerHTML = '<tr></tr>';
    const headerRow = trackTableHead.querySelector('tr');
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.charAt(0).toUpperCase() + column.slice(1);
      headerRow.appendChild(th);
    });

    trackTableBody.innerHTML = '';
    tracks.forEach(track => {
      const row = trackTableBody.insertRow();
      columns.forEach(column => {
        const cell = row.insertCell();
        cell.textContent = track[column] || 'n/a';
      });
    });
    trackTable.style.display = '';
  }

  // Function to update the event table
  function updateEventTable(events) {
    eventTableBody.innerHTML = '';
    events.forEach(event => {
      const row = eventTableBody.insertRow();
      row.insertCell().textContent = event.id || 'n/a';
      row.insertCell().textContent = event.start || 'n/a';
      row.insertCell().textContent = event.end || 'n/a';
      row.insertCell().textContent = event.duration || 'n/a';
    });
    eventTable.style.display = events.length ? '' : 'none';
  }

  // Custom Manifest Parser for extracting metadata
  function CustomManifestParser() {
    this.curId_ = 0;
    this.config_ = null;
  }

  CustomManifestParser.prototype.configure = function(config) {
    this.config_ = config;
    console.log('Configuring custom manifest parser with config:', config);
  };

  CustomManifestParser.prototype.start = async function(uri, playerInterface) {
    console.log('Starting custom manifest parser for URI:', uri);
    const type = shaka.net.NetworkingEngine.RequestType.MANIFEST;
    const request = {
      uris: [uri],
      method: 'GET',
      retryParameters: this.config_ ? this.config_.retryParameters : shaka.net.NetworkingEngine.defaultRetryParameters()
    };
    const response = await playerInterface.networkingEngine.request(type, request).promise;
    return this.loadManifest_(response.data);
  };

  CustomManifestParser.prototype.stop = function() {
    console.log('Stopping custom manifest parser');
    return Promise.resolve();
  };

  CustomManifestParser.prototype.loadManifest_ = function(data) {
    const mpd = new DOMParser().parseFromString(data, 'application/xml');
    const timeline = new shaka.media.PresentationTimeline(null, 0);
    const duration = parseFloat(mpd.querySelector('MPD').getAttribute('mediaPresentationDuration') || '3600');
    timeline.setDuration(duration);

    const periods = mpd.getElementsByTagName('Period');
    const variants = [];
    const textStreams = [];

    Array.from(periods).forEach((period) => {
      const adaptationSets = period.getElementsByTagName('AdaptationSet');
      Array.from(adaptationSets).forEach((adaptationSet) => {
        const mimeType = adaptationSet.getAttribute('mimeType') || 'n/a';
        let type = 'unknown';
        if (mimeType.includes('video')) type = 'video';
        else if (mimeType.includes('audio')) type = 'audio';
        else if (mimeType.includes('text')) type = 'text';

        if (type === 'video' || type === 'audio') {
          const variant = this.loadVariant_(type === 'video', type === 'audio');
          variants.push(variant);
        } else if (type === 'text') {
          const textStream = this.loadStream_('text');
          textStreams.push(textStream);
        }
      });
    });

    return {
      presentationTimeline: timeline,
      minBufferTime: 5,  // seconds
      offlineSessionIds: [],
      variants: variants,
      textStreams: textStreams
    };
  };

  CustomManifestParser.prototype.loadVariant_ = function(hasVideo, hasAudio) {
    console.assert(hasVideo || hasAudio);

    return {
      id: this.curId_++,  // globally unique ID
      language: 'en',
      primary: false,
      audio: hasAudio ? this.loadStream_('audio') : null,
      video: hasVideo ? this.loadStream_('video') : null,
      bandwidth: 8000,  // bits/sec, audio+video combined
      allowedByApplication: true,  // always initially true
      allowedByKeySystem: true   // always initially true
    };
  };

  CustomManifestParser.prototype.loadStream_ = function(type) {
    const getUris = function() { return ['https://example.com/init']; };
    const initSegmentReference = new shaka.media.InitSegmentReference(getUris, 0, null);

    const index = new shaka.media.SegmentIndex([
      this.loadReference_(0, 0, 10, initSegmentReference),
      this.loadReference_(1, 10, 20, initSegmentReference),
      this.loadReference_(2, 20, 30, initSegmentReference),
    ]);

    const id = this.curId_++;
    return {
      id: id,  // globally unique ID
      originalId: id, // original ID from manifest, if any
      createSegmentIndex: function() { return Promise.resolve(); },
      segmentIndex: index,
      mimeType: type == 'video' ? 'video/webm' : (type == 'audio' ? 'audio/webm' : 'text/vtt'),
      codecs: type == 'video' ? 'vp9' : (type == 'audio' ? 'vorbis' : ''),
      frameRate: type == 'video' ? 24 : undefined,
      pixelAspectRatio: type == 'video' ? 4 / 3 : undefined,
      bandwidth: 4000,  // bits/sec
      width: type == 'video' ? 640 : undefined,
      height: type == 'video' ? 480 : undefined,
      kind: type == 'text' ? 'subtitles' : undefined,
      channelsCount: type == 'audio' ? 2 : undefined,
      encrypted: false,
      drmInfos: [],
      keyIds: new Set(),
      language: 'en',
      label: 'my_stream',
      type: type,
      primary: false,
      trickModeVideo: null,
      emsgSchemeIdUris: null,
      roles: [],
      audioSamplingRate: type == 'audio' ? 44100 : null,
      closedCaptions: new Map(),
    };
  };

  CustomManifestParser.prototype.loadReference_ = function(position, start, end, initSegmentReference) {
    const getUris = function() { return ['https://example.com/ref_' + position]; };
    return new shaka.media.SegmentReference(start, end, getUris, 0, null, initSegmentReference, 0, 0, Infinity);
  };

  CustomManifestParser.prototype.parseManifest = async function(uri) {
    const response = await fetch(uri);
    const manifestText = await response.text();
    const mpd = new DOMParser().parseFromString(manifestText, 'application/xml');
    const minimumUpdatePeriod = parseFloat(mpd.querySelector('MPD').getAttribute('minimumUpdatePeriod') || '5'); // Default to 5 seconds if not specified
    const periods = mpd.getElementsByTagName('Period');
    const tracks = [];
    const events = [];

    Array.from(periods).forEach((period) => {
      const adaptationSets = period.getElementsByTagName('AdaptationSet');
      Array.from(adaptationSets).forEach((adaptationSet) => {
        const mimeType = adaptationSet.getAttribute('mimeType') || 'n/a';
        let type = 'unknown';
        if (mimeType.includes('video')) type = 'video';
        else if (mimeType.includes('audio')) type = 'audio';
        else if (mimeType.includes('text')) type = 'subtitle';

        const trackData = {
          id: adaptationSet.getAttribute('id') || 'n/a',
          group: adaptationSet.getAttribute('group') || 'n/a',
          contentType: adaptationSet.getAttribute('contentType') || 'n/a',
          lang: adaptationSet.getAttribute('lang') || 'n/a',
          minBandwidth: adaptationSet.getAttribute('minBandwidth') || 'n/a',
          maxBandwidth: adaptationSet.getAttribute('maxBandwidth') || 'n/a',
          audioSamplingRate: adaptationSet.getAttribute('audioSamplingRate') || 'n/a',
          width: adaptationSet.getAttribute('width') || 'n/a',
          height: adaptationSet.getAttribute('height') || 'n/a',
          frameRate: adaptationSet.getAttribute('frameRate') || 'n/a',
          mimeType: mimeType,
          type: type
        };

        const representations = adaptationSet.getElementsByTagName('Representation');
        Array.from(representations).forEach((representation) => {
          const bandwidth = representation.getAttribute('bandwidth') || 'n/a';

          console.log(`DASH Track: Type: ${type}, Bitrate: ${bandwidth}`);

          tracks.push({
            ...trackData,
            bitrate: bandwidth !== 'n/a' ? parseInt(bandwidth) : 'n/a' // Ensure bandwidth is parsed as integer
          });
        });
      });

      const eventStreams = period.getElementsByTagName('EventStream');
      Array.from(eventStreams).forEach((eventStream) => {
        const timescale = parseFloat(eventStream.getAttribute('timescale')) || 1;
        const streamEvents = eventStream.getElementsByTagName('Event');
        Array.from(streamEvents).forEach((event) => {
          const presentationTime = parseFloat(event.getAttribute('presentationTime')) || 0;
          const duration = parseFloat(event.getAttribute('duration')) || 0;
          const startTimeInSeconds = presentationTime / timescale;
          const endTimeInSeconds = (presentationTime + duration) / timescale;

          // Create ISO strings for start and end times
          const startDate = new Date(startTimeInSeconds * 1000).toISOString();
          const endDate = new Date(endTimeInSeconds * 1000).toISOString();

          // Calculate duration
          const durationInSeconds = endTimeInSeconds - startTimeInSeconds;
          const durationHours = Math.floor(durationInSeconds / 3600);
          const durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
          const durationSeconds = (durationInSeconds % 60).toFixed(6);
          const durationString = `${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(9, '0')}`;

          const messageData = event.textContent;
          console.log(`DASH Event: ID: ${event.getAttribute('id')}, Start: ${startDate}, End: ${endDate}, Duration: ${durationString}, Message: ${messageData}`);

          events.push({
            id: event.getAttribute('id') || 'n/a',
            start: startDate,
            end: endDate,
            duration: durationString
          });
        });
      });
    });

    console.log('Parsed DASH manifest tracks:', tracks);
    console.log('Parsed DASH events:', events);
    return { tracks, events, minimumUpdatePeriod };
  };


  // Custom function to parse HLS manifest
  async function parseHlsManifest(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const lines = manifestText.split('\n');

    const tracks = [];
    let currentTrack = {};

    lines.forEach(line => {
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const attrs = line.split(',');
        attrs.forEach(attr => {
          const [key, value] = attr.split('=');
          if (key === 'BANDWIDTH') {
            currentTrack.bitrate = parseInt(value);
          }
          if (key === 'AVERAGE-BANDWIDTH') {
            currentTrack.avgBitrate = parseInt(value);
          }
          if (key === 'CODECS') {
            currentTrack.codec = value.replace(/"/g, '');
          }
          if (key === 'RESOLUTION') {
            const [width, height] = value.split('x');
            currentTrack.width = width;
            currentTrack.height = height;
          }
          if (key === 'FRAME-RATE') {
            currentTrack.frameRate = value;
          }
          if (key === 'VIDEO-RANGE') {
            currentTrack.videoRange = value;
          }
        });
        currentTrack.type = 'video';
        tracks.push(currentTrack);
        currentTrack = {};
      } else if (line.startsWith('#EXT-X-MEDIA') && line.includes('TYPE=AUDIO')) {
        const attrs = line.split(',');
        const audioTrack = {};
        attrs.forEach(attr => {
          const [key, value] = attr.split('=');
          if (key === 'GROUP-ID') {
            audioTrack.groupId = value.replace(/"/g, '');
          }
          if (key === 'LANGUAGE') {
            audioTrack.language = value.replace(/"/g, '');
          }
          if (key === 'NAME') {
            audioTrack.name = value.replace(/"/g, '');
          }
          if (key === 'CHANNELS') {
            audioTrack.channels = value.replace(/"/g, '');
          }
          if (key === 'DEFAULT') {
            audioTrack.default = value === 'YES';
          }
          if (key === 'AUTOSELECT') {
            audioTrack.autoSelect = value === 'YES';
          }
        });
        audioTrack.type = 'audio';
        tracks.push(audioTrack);
      }
    });

    console.log('Parsed HLS manifest tracks:', tracks);
    return tracks;
  }

  // Parse HLS events (EXT-X-DATERANGE)
  async function parseHlsEvents(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const lines = manifestText.split('\n');

    const events = [];

    lines.forEach(line => {
      if (line.startsWith('#EXT-X-DATERANGE')) {
        const attrs = line.split(',');
        const event = {};
        attrs.forEach(attr => {
          const [key, value] = attr.split('=');
          if (key === 'ID') {
            event.id = value.replace(/"/g, '');
          }
          if (key === 'START-DATE') {
            event.start = value.replace(/"/g, '');
          }
          if (key === 'END-DATE') {
            event.end = value.replace(/"/g, '');
          }
          if (key === 'DURATION') {
            event.duration = value.replace(/"/g, '');
          }
        });
        events.push(event);
      }
    });

    console.log('Parsed HLS events:', events);
    return events;
  }

});
