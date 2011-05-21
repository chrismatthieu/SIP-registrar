say("Tropo is transferring your call");

transfer(currentCall.getHeader("x-sbc-numbertodial"), { playvalue: "http://hosting.tropo.com/13539/www/audio/prefetch2.mp3", playrepeat: "5"});
