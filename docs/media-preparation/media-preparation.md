# Media Preparation - *Encoding, Packaging & Encryption* 

## [Bento4](https://github.com/axiomatic-systems/Bento4)
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

### Examples
```bash
# Example 1
# This allows you to extract the XML data from the uuid box of of an ISOBMFF file. 
mp4extract --payload-only 'uuid[0]' stream1-1234567.ismv

# Example 2
# Dump the isobmff file format, boxes and values in a json format.
mp4dump --verbosity 3 --format json stream1-1234567.ismv

```

## [EventMessageTrack](https://github.com/unifiedstreaming/event-message-track)

## [FFmpeg](https://github.com/FFmpeg/FFmpeg)

## [fmp4-ingest](https://github.com/unifiedstreaming/fmp4-ingest)

## [GPAC](https://wiki.gpac.io/)

## [PyCpix](https://github.com/unifiedstreaming/pycpix)

## [Shaka Packager](https://github.com/shaka-project/shaka-packager)