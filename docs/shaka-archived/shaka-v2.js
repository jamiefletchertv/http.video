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
      shakaPlayer.destroy();
      shakaPlayer = null;
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
        const tracks = await parseDashManifest(manifestUri);
        updateTrackTable(tracks);
        const events = await parseDashEvents(manifestUri);
        updateEventTable(events);
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

  // Parse DASH manifest using Shaka Player's built-in parser
  async function parseDashManifest(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const mpd = new DOMParser().parseFromString(manifestText, 'application/xml');

    const periods = mpd.getElementsByTagName('Period');
    const tracks = [];

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
    });

    console.log('Parsed DASH manifest tracks:', tracks);
    return tracks;
  }

  // Parse DASH events
  async function parseDashEvents(manifestUri) {
    const response = await fetch(manifestUri);
    const manifestText = await response.text();
    const mpd = new DOMParser().parseFromString(manifestText, 'application/xml');

    const events = [];
    const eventStreams = mpd.getElementsByTagName('EventStream');
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

    console.log('Parsed DASH events:', events);
    return events;
  }

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
