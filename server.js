var sip = require('sip');
var sys = require('sys');
var redis = require('redis');
var tropoapi = require('tropo-webapi');

//Trim leading and trailing whitespace from string values.
function trim(str) {
	return str.replace(/^\s+|\s+$/g, '');
}

sip.start({},function(request) {


	try {
				

		// Parse the URI in the reuqest header.
		var address = sip.parseUri(request.headers.to.uri);

		sys.puts('host: ' + address.host)
		var siphost = address.host

		// Create a redis client to manage the registration
		// info.
		var client = redis.createClient();

		sys.puts(trim(request.method) + ' received.');

		// Handle SIP Registrations.
		if (trim(request.method) == 'REGISTER') {
			var contact = request.headers.contact;

			// Store the registration info.
			if (Array.isArray(contact)
					&& contact.length
					&& (+(contact[0].params.expires
							|| request.headers.expires || 300)) > 0) {
				sys.puts('Registering user ' + request.headers.to.name + ' at ' + contact[0].uri);
				client.set(address.user, contact[0].uri);
			}

			// Remove the registration info.
			else {
				sys.puts('Logging off user ' + request.headers.to.name);
				client.del(address.user);
			}

			// Build the response.
			var response = sip.makeResponse(request, 200, 'OK');

			// Send the response to the SIP client
			sip.send(response);

		}


		// Handle SIP Invites.
		if (trim(request.method) == 'INVITE') {
			sip.send(sip.makeResponse(request, 100, 'Trying'));

			// Look up the registration info. for the user being
			// called.
			address = sip.parseUri(request.uri);
			sys.puts('host: ' + address.host);
			
			if (address.host == '127.0.0.1'){ // Our Registrar
			
			
				client.get(address.user, function(err, contact) {
					// If not found or error return 404.
					if (err || contact === null) {
						// sys.puts('User ' + address.user + ' is not found');
						// sip.send(sip.makeResponse(request, 404, 'Not Found'));
										
							sys.puts('Redirecting call to ' + address.user);
							var response = sip.makeResponse(request, 302, 'Moved Temporarily');
							// response.headers.contact = [ { uri : "sip:194@sip.teleku.com" }]; //works
							// response.headers.contact = [ { uri : "sip:chris@127.0.0.1" }]; //works
							// response.headers.contact = [ { uri : "sip:9991490318@sip.tropo.com" }];
							response.headers.contact = [ {uri: "sip:9991490318@sip.tropo.com?x-numbertodial=" + address.user } ];
							sip.send(response);
					
					}

					// Otherwise, send redirect with contact URI.
					else {
						sys.puts('User ' + address.user
								+ ' is found at ' + contact);
						sys.puts('contact ' + contact);
						var response = sip.makeResponse(request, 302, 'Moved Temporarily');
						response.headers.contact = [ { uri : contact } ];
						sip.send(response);
					}
				});
				
				// Close the Redis client
				client.quit();
				

			} else { // Host other than our Registrar
				sys.puts('Routing call to ' + request.uri);

				var response = sip.makeResponse(request, 180, 'Ringing');
				// response.headers.contact = [{uri: request.uri}];

				// var response = sip.makeResponse(request, 100, 'Trying');
				// response.headers.contact = [{uri: request.uri}];
				
				sip.send(response);
			
			}
		}

	}

	// Handle exceptions.	
	catch (e) {
		sip.send(sip.makeResponse(request, 500, 'Internal Server Error'));
		sys.debug('Exception ' + e + ' at ' + e.stack);
	}
	
});
