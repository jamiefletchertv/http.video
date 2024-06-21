export async function parseHlsManifest(manifestUri) {
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

export async function parseHlsEvents(manifestUri) {
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
