# http.video
Repository containing **links** to tools, tips and tricks related to media
streaming. Taking inspiration from
[https://awesome.video](https://awesome.video) I wanted to share resources I use
regularly. 

Each sub-catagory will contain further documentation for *some* of the options and
arguments useful with each tool and a link to the repository to download or
access the tooling. 

**This repository will not host any scripts or tools.**

## [Media Preparation - *Encoding, Packaging & Encryption*](./docs/media-preparation/media-preparation.md) 
- [Bento4](https://github.com/axiomatic-systems/Bento4)
- [EventMessageTrack](https://github.com/unifiedstreaming/event-message-track)
- [FFmpeg](https://github.com/FFmpeg/FFmpeg)
- [fmp4-ingest](https://github.com/unifiedstreaming/fmp4-ingest)
- [GPAC](https://wiki.gpac.io/)
- [PyCpix](https://github.com/unifiedstreaming/pycpix)
- [Shaka Packager](https://github.com/shaka-project/shaka-packager)


## [Media Analysis & Conformance](./docs/analysis-conformance/analysis-conformance.md)
- [Akamai stream-validator](https://players.akamai.com/stream-validator)
- [Apple HLS Tools](https://developer.apple.com/documentation/http-live-streaming/using-apple-s-http-live-streaming-hls-tools)
- [Aximon DRM Decoders](https://tools.axinom.com/)
- [DASH-IF Conformance](https://conformance.dashif.org/)
- [DASH-IF Content Protection List](https://dashif.org/identifiers/content_protection/)
- [Dolby Stream Validator](https://ott.dolby.com/OnDelKits_dev/StreamValidator/Start_Here.html)
- [Epic Labs Video Comparator](https://github.com/epiclabs-io/epic-video-comparator)
- [EventMessageTrack](https://github.com/unifiedstreaming/event-message-track)
- [fmp4ingest](https://github.com/unifiedstreaming/fmp4-ingest)
- [Google DAI SDK for HTML5 Video Suite Inspector](https://googleads.github.io/googleads-ima-html5-dai/vsi/)
- [GPAC/MP4BOX](https://github.com/gpac/gpac/wiki/MP4Box)
- [M2AMedia SCTE35 Dump for MPEGTS](https://github.com/m2amedia/scte35dump)
- [Middleman SCTE35/104 Parser](https://tools.middleman.tv/scte35-parser)
- [ThreeFive (Scte35)](https://github.com/futzu/SCTE-35_threefive)
- [Thumbcoil Video Inspector](https://thumb.co.il/)
- [Unified Streaming Validator](https://validator.unified-streaming.com/)

## [Media Playback](./docs/media-playback/media-playback.md)
- [Akamai Players](https://players.akamai.com/players)
- [Chrome Media internals](chrome://media-internals)
- [dash.js](https://github.com/Dash-Industry-Forum/dash.js)
- [Eyevinn stream coruptor](https://github.com/Eyevinn/streaming-onboarding/blob/master/Stream-Corruptor.md)
- [Man in the middle proxy](https://github.com/mitmproxy/mitmproxy)
- [Shaka-player](https://github.com/shaka-project/shaka-player)
- [My dev players (dummpy repo for now)](./players/players.md)

## [Media Standards](./docs/standards/standards.md)
### Interoprability 
- [DASH-IF Interoperability Guidelines v5](https://dashif.org/guidelines/iop-v5/)
- [DASH-IF Live Media Ingest Protocol](https://dashif-documents.azurewebsites.net/Ingest/master/DASH-IF-Ingest.html)
- [Microsoft/Azure Smooth Streaming Live Ingest Specification](https://learn.microsoft.com/en-us/previous-versions/media-services/previous/media-services-fmp4-live-ingest-overview)
- [HTTP Live Streaming Overview (HLS)](https://developer.apple.com/documentation/http-live-streaming)
- [CTA-5005-A DASH-HLS Interoprability Specification](https://cdn.cta.tech/cta/media/media/resources/standards/cta-5005-a-final.pdf)
- [DVB A178-3 Targeted Advertisement Bluebook for DVB-DASH](https://dvb.org/?standard=dynamic-substitution-of-content-in-linear-broadcast-part-3-carriage-and-signalling-of-placement-opportunity-information-in-dvb-dash)

### Presentation formats
- ISO/IEC 23009-01 - MPEG DASH (Defines both the metadata structure and associated media format(s))
- IETF RFC8216 - HTTP Live Streming (HLS) (Defines both the metadata structure
  and some client/server requirements)

### Media Segmentation & Container Formats
- ISO/IEC 14496-12 - MPEG ISOBMFF 'MP4' (Defines the file format and structure)
- ISO/IEC 23000-19 - MPEG Common media application format (CMAF) for segmented media
- ISO/IEC 23001-18 - MPEG Event message track format for the ISO base media file format

### Compression & Sample Formats
- ISO/IEC 14496-10 - Defines the compressed video format for AVC/h264 
- ISO/IEC 23008-2 - Defines the compressed video format HEVC/h265 
- ISO/IEC 14496-3 - Defines the compressed audio format AAC 
- ISO/IEC 23008-3 - Defines the compressed audio format MPEG-H Audio a Next Generation Audio (NGA) codec
- ISO/IEC 14496-15 - Defines the carriage of AVC/HEVC in ISOBMFF 
- ISO/IEC 14496-30 - Defines formatting for text tracks webvtt or ttml
- ISO/IEC 23001-7 - Defines encryption of media supported for receiving devices
