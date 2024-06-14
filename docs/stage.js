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
  const eventOverlay = document.getElementById('eventOverlay');
  let shakaPlayer = null;
  let ui = null;
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
    eventOverlay.style.display = 'none';

    shakaPlayer = new shaka.Player(video);

    // Customize UI
    const uiConfig = {
      'controlPanelElements': ['play_pause', 'time_and_duration', 'mute', 'volume', 'fullscreen', 'overflow_menu'],
      'overflowMenuButtons': ['captions', 'quality', 'language', 'picture_in_picture'],
      'addSeekBar': true,
    };

    if (ui) {
      ui.destroy();
    }

    ui = new shaka.ui.Overlay(shakaPlayer, video.parentElement, video);
    ui.configure(uiConfig);

    // Get the controls
    const controls = ui.getControls();

    // Custom time display function
    const updateCurrentTimeDisplay = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      const timeDisplay = controls.getControlsContainer().querySelector('.shaka-current-time');
      if (timeDisplay) {
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
      }
    };

    // Format time in mm:ss
    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Update the time display initially and every second
    setInterval(updateCurrentTimeDisplay, 1000);

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

        // Set interval to update active event highlighting and current time display
        setInterval(() => {
          highlightActiveEvent(result.events);
          showActiveEventOverlay(result.events);
          updateCurrentTimeDisplay();
        }, 1000); // Check every second
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
    // Sort events in ascending order with new events listed first
    events.sort((a, b) => new Date(b.start) - new Date(a.start));

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

  // Function to highlight the active event
  function highlightActiveEvent(events) {
    const currentTime = video.currentTime;

    Array.from(eventTableBody.rows).forEach((row, index) => {
      const event = events[index];
      const startTime = new Date(event.start).getTime() / 1000;
      const endTime = new Date(event.end).getTime() / 1000;

      if (currentTime >= startTime && currentTime <= endTime) {
        row.classList.add('highlighted');
      } else {
        row.classList.remove('highlighted');
      }
    });
  }

  // Function to show the active event overlay
  function showActiveEventOverlay(events) {
    const currentTime = video.currentTime;

    let activeEvent = null;
    events.forEach(event => {
      const startTime = new Date(event.start).getTime() / 1000;
      const endTime = new Date(event.end).getTime() / 1000;

      if (currentTime >= startTime && currentTime <= endTime) {
        activeEvent = event;
      }
    });

    if (activeEvent) {
      eventOverlay.textContent = `Active Event ID: ${activeEvent.id}`;
      eventOverlay.style.display = 'block';
    } else {
      eventOverlay.style.display = 'none';
    }
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
