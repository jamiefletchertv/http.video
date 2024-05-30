<!-- omit in toc -->
# Media Preparation - *Encoding, Packaging & Encryption* 

<!-- omit in toc -->
## Table of Contents
- [Bento4](#bento4)
- [EventMessageTrack](#eventmessagetrack)
- [FFmpeg](#ffmpeg)
- [fmp4ingest](#fmp4ingest)
- [GPAC](#gpac)
- [PyCpix](#pycpix)
- [Shaka Packager](#shaka-packager)


## [Bento4]
The Bento4 SDK includes several command-line applications/tools that are built using the SDK API. These include:

|app name       | description
|---------------|------------------
|mp4info	    | displays high level info about an MP4 file, including all tracks and codec details                                                              
|mp4dump	    | displays the entire atom/box structure of an MP4 file                                                                                           
|mp4edit	    | add/insert/remove/replace atom/box items of an MP4 file                                                                                         
|mp4extract	    | extracts an atom/box from an MP4 file                                                                                                           
|mp4encrypt	    | encrypts an MP4 file (multiple encryption schemes are supported)                                                                                
|mp4decrypt	    | decrypts an MP4 file (multiple encryption schemes are supported)                                                                                
|mp4dcfpackager | encrypts a media file into an OMA DCF file                                                                                                      
|mp4compact	    | converts ‘stsz’ tables into ‘stz2′ tables to create more compact MP4 files                                                                      
|mp4fragment    | creates a fragmented MP4 file from a non-fragmented one or re-fragments an already-fragmented file                                              
|mp4split	    | splits a fragmented MP4 file into discrete files                                                                                                
|mp4tag	        | show/edit MP4 metadata (iTunes-style and others)                                                                                                
|mp4mux	        | multiplexes one or more elementary streams (H264, AAC) into an MP4 file                                                                         
|mp42aac	    | extract a raw AAC elementary stream from an MP4 file                                                                                            
|mp42avc	    | extract a raw AVC/H.264 elementary stream from an MP4 file                                                                                      
|mp42hls	    | converts an MP4 file to an HLS (HTTP Live Streaming) presentation, including the generation of the segments and .m3u8 playlist.
|mp42ts	        | converts an MP4 file to an MPEG2-TS file.
|mp4-dash	    | creates an MPEG DASH output from one or more MP4 files, including encryption.                                                                   
|mp4-dash-clone	| creates a local clone of a remote or local MPEG DASH presentation, optionally encrypting the segments as they are cloned.


<!-- omit in toc -->
<!--
### Example Usage
```bash
# Example 1
# This allows you to extract the XML data from the uuid box of of an ISOBMFF file. 
mp4extract --payload-only 'uuid[0]' stream1-1234567.ismv

# Example 2
# Dump the isobmff file format, boxes and values in a json format.
mp4dump --verbosity 3 --format json stream1-1234567.ismv
```
-->

> [!NOTE]
> The `mp4split` binary is the same name as the Unified-Packager command used
> for static packaging but an entirely different product. 


___
## [EventMessageTrack]
This repository was created as a reference implimentation for the ISO/IEC
23001-18 defines the Event Message Track format specification. 

The tooling in this repository can be used to create, format, extract DASH Event
Messages oftern used for the carrage of SCTE35 signalling in SSAI workflows. 


|app name       | description
|---------------|------------------
|dash_event_fmp4| Convert MPD events in an EventStream Element with optionally added attributes @startTime and @endTime to fragmented (CMAF based) event message track. If the duration is not known from the mpd you need to set it in the Manifest EventStream@endTime, as the cmaf event track needs to have a duration.
|fmp4_dash_event | Program for converting an event track (CMAF based) back to XML format based on EventStream
|gen_avails | Program for creating an event track (CMAF based) and XML representation of periodic splice inserts to signal ad breaks. generates an avail event message track of 600 seconds, with 2 second segments and slots of 30 seconds every 180 seconds. The avails use the splice insert command from SCTE-35
|print_event_samples | prints the contents of event samples (emib, emeb) etc... of an event track
|generate_example | Small program to create examples of Event message track sample formatting. It prints random events to the std::out. Subsequently it prints the Event message track samples formatting. Examples are for illustrative purpose and written to std::out.


<!-- omit in toc -->
<!--
### Example Usage
```bash
dash_event_fmp4 in.mpd out_event_track.cmfm track_id target_segment_duration (0=entire track)

fmp4_dash_event in_event_track.cmfm out.mpd warning does only work for CMAF based event tracks

gen_avail_track track_duration[ms] segment_duration[ms] slot_duration[ms] avail_interval[ms]
gen_avail_track 600000 2000 30000 180000
```
-->

> [!WARNING]
> This repository is dependency for the `fmp4-ingest` set of tools and therefore
> may also required to be built alongside.

> [!NOTE]
> This repository requires its documentation to be clean up since Rufael has
> left Unified Streaming.


___
## [FFmpeg]
FFmpeg is a collection of libraries and tools to process multimedia content such as audio, video, subtitles and related metadata.

| library name       | description
|---------------|------------------
|libavcodec | provides implementation of a wider range of codecs.
|libavformat | implements streaming protocols, container formats and basic I/O access.
|libavutil | includes hashers, decompressors and miscellaneous utility functions.
|libavfilter | provides means to alter decoded audio and video through a directed graph of connected filters.
|libavdevice | provides an abstraction to access capture and playback devices.
|libswresample | implements audio mixing and resampling routines.
|libswscale | implements color conversion and scaling routines.

| app name       | description
|---------------|------------------
|ffmpeg | is a command line toolbox to manipulate, convert and stream multimedia content.
|ffplay | is a minimalistic multimedia player.
|ffprobe | is a simple analysis tool to inspect multimedia content.


<!-- omit in toc -->
<!-- 
### Example Usage
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
ffprobe -v quiet -show_frames -show_entries frame=pict_type input.mp4 | grep -E -o "[I|B|P]" >> /tmp/output.csv
# Iframe decode times
ffprobe -select_streams v  -show_frames -show_entries frame=pkt_pts_time,pict_type,key_frame banjara_dref.mp4 > output

ffmpeg -report -re -f lavfi -i smptehdbars=size=1280x720 -f lavfi  -i anullsrc -filter_complex "drawbox=y=25: x=iw/2-iw/6.2: c=0x00000000@1: w=iw/3.05: h=36: t=fill, drawtext=timecode_rate=25: timecode='$(date -u +%H\\:%M\\:%S)\\:$(($(gdate +%3N)/25))': tc24hmax=1: fontsize=32: x=(w-tw)/2+tw/2: y=30: fontcolor=white" -g 48  -r 25 -keyint_min 48 -c:v libx264  -c:a aac  -map 0:v  -map 1:a  -fflags +genpts  -movflags isml+frag_keyframe -f ismv  $PUB_POINT_URI
```
-->
___
## [fmp4ingest]
This repository was created as a reference implimentation for the [DASH-IF Live
Media Ingest
Protocol](https://dashif-documents.azurewebsites.net/Ingest/master/DASH-IF-Ingest.html)
and contains a set of tools to enable ingesting and manipulation of cmaf tracks
to be delivered to a processing entiry.

|app name       | description
|---------------|------------------
|fmp4_init | retrieve the init fragment or CMAF Header from a fmp4 file
|fmp4dump | print the contents of an fmp4 file to the cout, including scte markers
|fmp4ingest | Push a stream in real time to publishing point
|push_markers | Pushes SCTE35 ad opportunity markers with regular ad intervals and webvtt text track with `--announce` allows sending the segments in advance, `--avail` option works interval[ms] break_duration[ms] `--splice_immediate` allows setting splice immediate flag


<!-- omit in toc -->
<!--
### Example Usage
```bash
fmp4ingest -r -u http://localhost/pubpoint/channel1.isml 1.cmfv 2.cmfv 3.cmft
fmp4ingest --initialization -init.m4s --media -0-I-$Number$.m4s -r -u http://localhost/pubpoint/channel1.isml 1.cmfv 2.cmfv 3.cmft
push_markers --announce 1000 --seg_dur 1920 --vtt --avail 19200 9600 -u http://localhost/test/test.isml
```
-->

> [!WARNING]
> This repository is dependency for the `EventMessageTrack` set of tools and therefore
> may also required to be built alongside.

> [!NOTE]
> This repository requires its documentation to be clean up since Rufael has
> left Unified Streaming.

___
## [GPAC]
The multimedia packager available in GPAC is called `MP4Box`. It is mostly designed for processing ISOBMF files (e.g. MP4, 3GP), but can also be used to import/export media from container files like AVI, MPG, MKV, MPEG-2 TS. 

|app name       | description
|---------------|------------------
| MP4Box | Packager used for processing ISOBMF files (e.g. MP4, 3GP)


<!-- omit in toc -->
<!--
### Example Usage
```bash
MP4Box -std -diso input.mp4 
mp4box -dsap 1 input.mp4
```
-->

## [PyCpix]
## [Shaka Packager]


<!----------- 
Reference Links - NOTE this block must be copied to the foot of each page for useage globally 
---------->
<!-- Local -->
[Media Preparation - *Encoding, Packaging & Encryption*]:./docs/media-preparation/media-preparation
[Media Analysis & Conformance]:./docs/analysis-conformance/analysis-conformance
[Media Playback]:./docs/media-playback/media-playback
[Media Standards]:./docs/standards/standards
[My dev players (dummpy repo for now)]:./players/players

<!-- External -->
<!-- Media Preparation -->
[EventMessageTrack]:https://github.com/unifiedstreaming/event-message-track
[Bento4]:https://github.com/axiomatic-systems/Bento4
[FFmpeg]:https://github.com/FFmpeg/FFmpeg
[fmp4-ingest]:https://github.com/unifiedstreaming/fmp4-ingest
[GPAC]:https://wiki.gpac.io/
[PyCpix]:https://github.com/unifiedstreaming/pycpix
[Shaka Packager]:https://github.com/shaka-project/shaka-packager

<!-- Media Analysis & Conformance -->
[Akamai stream-validator]:https://players.akamai.com/stream-validator
[Apple HLS Tools]:https://developer.apple.com/documentation/http-live-streaming/using-apple-s-http-live-streaming-hls-tools
[Aximon DRM Decoders]:https://tools.axinom.com/
[DASH-IF Conformance]:https://conformance.dashif.org/
[DASH-IF Content Protection List]:https://dashif.org/identifiers/content_protection/
[Dolby Stream Validator]:https://ott.dolby.com/OnDelKits_dev/StreamValidator/Start_Here.html
[Epic Labs Video Comparator]:https://github.com/epiclabs-io/epic-video-comparator
[EventMessageTrack]:https://github.com/unifiedstreaming/event-message-track
[fmp4ingest]:https://github.com/unifiedstreaming/fmp4-ingest
[Google DAI SDK for HTML5 Video Suite Inspector]:https://googleads.github.io/googleads-ima-html5-dai/vsi/
[GPAC/MP4BOX]:https://github.com/gpac/gpac/wiki/MP4Box
[M2AMedia SCTE35 Dump for MPEGTS]:https://github.com/m2amedia/scte35dump
[Middleman SCTE35/104 Parser]:https://tools.middleman.tv/scte35-parser
[ThreeFive (Scte35)]:https://github.com/futzu/SCTE-35_threefive
[Thumbcoil Video Inspector]:https://thumb.co.il/
[Unified Streaming Validator]:https://validator.unified-streaming.com/

<!-- Media Analysis & Conformance -->
[Akamai Players]:https://players.akamai.com/players
[Chrome Media internals]:chrome://media-internals
[dash.js]:https://github.com/Dash-Industry-Forum/dash.js
[Eyevinn stream coruptor]:https://github.com/Eyevinn/streaming-onboarding/blob/master/Stream-Corruptor.md
[Man in the middle proxy]:https://github.com/mitmproxy/mitmproxy
[Shaka-player]:https://github.com/shaka-project/shaka-player
[My dev players (dummpy repo for now)]:./players/players.md

<!-- Media Standards - Interoprability -->  
[DASH-IF Interoperability Guidelines v5]:https://dashif.org/guidelines/iop-v5/
[DASH-IF Live Media Ingest Protocol]:https://dashif-documents.azurewebsites.net/Ingest/master/DASH-IF-Ingest.html
[Microsoft/Azure Smooth Streaming Live Ingest Specification]:https://learn.microsoft.com/en-us/previous-versions/media-services/previous/media-services-fmp4-live-ingest-overview
[HTTP Live Streaming Overview (HLS)]:https://developer.apple.com/documentation/http-live-streaming
[CTA-5005-A DASH-HLS Interoprability Specification]:https://cdn.cta.tech/cta/media/media/resources/standards/cta-5005-a-final.pdf
[DVB A178-3 Targeted Advertisement Bluebook for DVB-DASH]:https://dvb.org/?standard=dynamic-substitution-of-content-in-linear-broadcast-part-3-carriage-and-signalling-of-placement-opportunity-information-in-dvb-dash

<!-- Media Standards - Presentation formats --> 
[ISO/IEC 23009-01]:https://www.iso.org/standard/83314.html
[IETF RFC8216]:https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis

<!-- Media Standards - Segmentation & Container Formats -->
[ISO/IEC 14496-12]:https://www.iso.org/standard/83102.html
[ISO/IEC 23000-19]:https://www.iso.org/standard/85623.html
[ISO/IEC 23001-18]:https://www.iso.org/standard/82529.html

<!-- Media Standards - Compression & Sample Formats -->
[ISO/IEC 14496-10]:https://www.iso.org/standard/83529.html
[ISO/IEC 23008-2]:https://www.iso.org/standard/85457.html
[ISO/IEC 14496-3]:https://www.iso.org/standard/76383.html
[ISO/IEC 23008-3]:https://www.iso.org/standard/83525.html
[ISO/IEC 14496-15]:https://www.iso.org/standard/83336.html
[ISO/IEC 14496-30]:https://www.iso.org/standard/75394.html
[ISO/IEC 23001-7]:https://iso.org/standard/84637.html

<!-- Media Standards - Groups -->
[3GPP]:https://www.3gpp.org/
[Alliance for Open media]:https://aomedia.org/
[ATSC]:https://www.atsc.org/
[CP2PA]:https://c2pa.org/
[CTA-Wave]:https://github.com/cta-wave
[DASH-IF]:https://dashif.org/
[DVB]:https://dvb.org/
[HbbTV]:https://www.hbbtv.org/
[ISO]:https://www.iso.org/home.html
[ITU]:https://www.itu.int/en/Pages/default.aspx
[MP4 Registration Authority]:https://mp4ra.org/
[MPEG]:https://www.mpeg.org/about-mpeg/
[SCTE]:https://www.scte.org/
[SMPTE]:https://www.smpte.org/
[SVTA]:https://www.svta.org/
[W3C]:https://www.w3.org/

<!-- 3rd Party Resource -->
[https://awesome.video]:https://awesome.video
