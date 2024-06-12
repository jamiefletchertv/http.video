# Shaka

<!DOCTYPE html>
<html>
  <head>
    <!-- Shaka Player compiled library: -->
    <script type="text/javascript" src="https://unpkg.com/shaka-player@4.3.7/dist/shaka-player.compiled.js"></script>
  </head>
  <body>
    <select id="ddlViewBy">
      <option value="https://virtual-channel.unified-streaming.com/demo_channel-stable.isml/.mpd">VC</option>
      <option value="https://demo.unified-streaming.com/k8s/live/stable/scte35.isml/.mpd">Live SCTE35</option>
    </select>
    <video id="video"
           width="640"
           poster="//shaka-player-demo.appspot.com/assets/poster.jpg"
           controls autoplay>
    </video>
    <!-- Your application source: -->
    <script>
        // https://harmonicinc-com.github.io/shaka-player/latest/docs/api/tutorial-basic-usage.html
        // https://www.cdnpkg.com/shaka-player/file/shaka-player.compiled.js/
        // https://github.com/shaka-project/shaka-player/blob/v2.3.x/demo/common/controls.js

      
        let manifestUri = 'https://demo.unified-streaming.com/k8s/live/stable/scte35.isml/.mpd';
        
        var e = document.getElementById("ddlViewBy");
        function onChange() {
          let manifestUri = e.value;
          var text = e.options[e.selectedIndex].text;
          console.log(manifestUri, text);
          load();
        }
        e.onchange = onChange;
        onChange();
        

        function load(){
            var videoElement = document.getElementById('video');
            videoElement.pause();
            videoElement.removeAttribute('src'); // empty source
            initApp();
            videoElement.load();
        }

        function initApp() {
          // Install built-in polyfills to patch browser incompatibilities.
          shaka.polyfill.installAll();

          // Check to see if the browser supports the basic APIs Shaka needs.
          if (shaka.Player.isBrowserSupported()) {
            // Everything looks good!
            initPlayer();
          } else {
            // This browser does not have the minimum set of APIs we need.
            console.error('Browser not supported!');
          }
        }

        async function initPlayer() {
          // Create a Player instance.
          let video = document.getElementById('video');
          let player = new shaka.Player(video);

          // Attach player to the window to make it easy to access in the JS console.
          window.player = player;

          // Listen for error events.
          player.addEventListener('error', onErrorEvent);

          // Try to load a manifest.
          // This is an asynchronous process.
          try {
            await player.load(manifestUri);
            // This runs if the asynchronous load is successful.
            console.log('The video has now been loaded!');
            console.log('manifestURI is -', manifestUri);
          } catch (e) {
            // onError is executed if the asynchronous load fails.
            onError(e);
          }
        }

        function onErrorEvent(event) {
          // Extract the shaka.util.Error object from the event.
          onError(event.detail);
        }

        function onError(error) {
          // Log the error.
          console.error('Error code', error.code, 'object', error);
        }

        document.addEventListener('DOMContentLoaded', initApp);
    </script>
  </body>
</html>
