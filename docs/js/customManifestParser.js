export class CustomManifestParser {
  constructor() {
    this.curId_ = 0;
    this.config_ = null;
  }

  configure(config) {
    this.config_ = config;
    console.log('Configuring custom manifest parser with config:', config);
  }

  async start(uri, playerInterface) {
    console.log('Starting custom manifest parser for URI:', uri);
    const type = shaka.net.NetworkingEngine.RequestType.MANIFEST;
    const request = {
      uris: [uri],
      method: 'GET',
      retryParameters: this.config_ ? this.config_.retryParameters : shaka.net.NetworkingEngine.defaultRetryParameters()
    };
    const response = await playerInterface.networkingEngine.request(type, request).promise;
    return this.loadManifest_(response.data);
  }

  stop() {
    console.log('Stopping custom manifest parser');
    return Promise.resolve();
  }

  loadManifest_(data) {
    const mpd = new DOMParser().parseFromString(data, 'application/xml');
    if (!mpd || !mpd.documentElement || mpd.documentElement.nodeName !== 'MPD') {
      throw new Error('Invalid MPD XML');
    }

    const timeline = new shaka.media.PresentationTimeline(null, 0);
    const duration = parseFloat(mpd.documentElement.getAttribute('mediaPresentationDuration') || '3600');
    timeline.setDuration(duration);

    const periods = mpd.getElementsByTagName('Period');
    const variants = [];
    const textStreams = [];
    const segmentTimelines = [];

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

        // Process SegmentTimeline
        const segmentTemplate = adaptationSet.querySelector('SegmentTemplate');
        if (segmentTemplate) {
          const timescale = parseFloat(segmentTemplate.getAttribute('timescale')) || 1;
          const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
          if (segmentTimeline) {
            const segments = [];
            Array.from(segmentTimeline.getElementsByTagName('S')).forEach((s) => {
              const d = parseFloat(s.getAttribute('d'));
              const t = parseFloat(s.getAttribute('t')) || (segments.length ? segments[segments.length - 1].t + segments[segments.length - 1].d : 0);
              const r = parseInt(s.getAttribute('r')) || 0;

              for (let i = 0; i <= r; i++) {
                const segmentTime = t + (d * i);
                const live_edge_time = new Date((segmentTime + d) / timescale * 1000).toISOString();
                segments.push({ d, t: segmentTime, r, live_edge_time });
              }
            });
            segmentTimelines.push({ adaptationSet, segments, timescale });
          }
        }
      });
    });

    console.log('Parsed SegmentTimelines:', segmentTimelines);

    return {
      presentationTimeline: timeline,
      minBufferTime: 5,  // seconds
      offlineSessionIds: [],
      variants: variants,
      textStreams: textStreams,
      segmentTimelines: segmentTimelines,
      type: mpd.documentElement.getAttribute('type') // dynamic or static
    };
  }

  loadVariant_(hasVideo, hasAudio) {
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
  }

  loadStream_(type) {
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
  }

  loadReference_(position, start, end, initSegmentReference) {
    const getUris = function() { return ['https://example.com/ref_' + position]; };
    return new shaka.media.SegmentReference(start, end, getUris, 0, null, initSegmentReference, 0, 0, Infinity);
  }

  async parseManifest(uri) {
    const response = await fetch(uri);
    const manifestText = await response.text();
    const mpd = new DOMParser().parseFromString(manifestText, 'application/xml');
    if (!mpd || !mpd.documentElement || mpd.documentElement.nodeName !== 'MPD') {
      throw new Error('Invalid MPD XML');
    }
    const minimumUpdatePeriod = parseFloat(mpd.documentElement.getAttribute('minimumUpdatePeriod') || '5'); // Default to 5 seconds if not specified
    const periods = mpd.getElementsByTagName('Period');
    const tracks = [];
    const events = [];
    const segmentTimelines = [];

    Array.from(periods).forEach((period) => {
      const adaptationSets = period.getElementsByTagName('AdaptationSet');
      Array.from(adaptationSets).forEach((adaptationSet) => {
        const mimeType = adaptationSet.getAttribute('mimeType') || 'n/a';
        let type = 'unknown';
        if (mimeType.includes('video')) type = 'video';
        else if (mimeType.includes('audio')) type = 'audio';
        else if (mimeType.includes('text')) type = 'subtitle';

        const segmentTemplate = adaptationSet.querySelector('SegmentTemplate');
        const timescale = segmentTemplate ? parseFloat(segmentTemplate.getAttribute('timescale')) || 1 : 1;

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
          type: type,
          segment_duration_seconds: segmentTemplate ? parseFloat(segmentTemplate.getAttribute('d')) / timescale : 'n/a'
        };

        const representations = adaptationSet.getElementsByTagName('Representation');
        Array.from(representations).forEach((representation) => {
          const bandwidth = representation.getAttribute('bandwidth') || 'n/a';

          console.log(`DASH Track: Type: ${type}, Bitrate: ${bandwidth}`);

          tracks.push({
            ...trackData,
            bitrate: bandwidth !== 'n/a' ? parseInt(bandwidth) : 'n/a', // Ensure bandwidth is parsed as integer
          });
        });

        // Process SegmentTimeline
        if (segmentTemplate) {
          const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
          if (segmentTimeline) {
            const segments = [];
            Array.from(segmentTimeline.getElementsByTagName('S')).forEach((s) => {
              const d = parseFloat(s.getAttribute('d'));
              const t = parseFloat(s.getAttribute('t')) || (segments.length ? segments[segments.length - 1].t + segments[segments.length - 1].d : 0);
              const r = parseInt(s.getAttribute('r')) || 0;

              for (let i = 0; i <= r; i++) {
                const segmentTime = t + (d * i);
                const live_edge_time = new Date((segmentTime + d) / timescale * 1000).toISOString();
                segments.push({ d, t: segmentTime, r, live_edge_time });
              }
            });
            segmentTimelines.push({ adaptationSet, segments, timescale });
          }
        }
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

    console.log('Parsed SegmentTimelines:', segmentTimelines);
    console.log('Parsed DASH manifest tracks:', tracks);
    console.log('Parsed DASH events:', events);
    return { tracks, events, minimumUpdatePeriod, segmentTimelines, type: mpd.documentElement.getAttribute('type') };
  }
}
