'use strict';
const debug = require('debug')('home-assistant:server-events');

const _int = {
    getSettings: function getSettings(config) {
        const settings = {}
        return settings;
    },
    setStatus: function setStatus(isConnected, node) {
        if (isConnected) { node.status({ fill: 'green', shape: 'ring', text: 'Connected' }); }
        else { node.status({ fill: 'red', shape: 'ring', text: 'Disconnected' }) }
    },
    getHandlers: function(node) {
        return {
            onEvent: (evt) => node.send({ event_type: evt.event_type, topic: evt.event_type, payload: evt}),
            onClose: ()    => _int.setStatus(false, node),
            onOpen:  ()    => _int.setStatus(true, node),
            onError: (err) => _int.setStatus(false, node)
        }
    }
};


module.exports = function(RED) {
    function EventsAll(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        _int.node = node;
        node.settings = _int.getSettings(config);

        node.server = RED.nodes.getNode(config.server);
        _int.setStatus(false, node);
        const handlers = _int.getHandlers(node);

        // If the event source was setup start listening for events
        if (node.server) {
            const eventsClient = node.server.events;

            eventsClient.on('ha_events:all',   handlers.onEvent);
            eventsClient.on('ha_events:close', handlers.onClose);
            eventsClient.on('ha_events:open',  handlers.onOpen);
            eventsClient.on('ha_events:error', handlers.onError);

            this.on('close', function(done) {
                eventsClient.removeListener('ha_events:all',   handlers.onEvent);
                eventsClient.removeListener('ha_events:close', handlers.onClose);
                eventsClient.removeListener('ha_events:open',  handlers.onOpen);
                eventsClient.removeListener('ha_events:error', handlers.onError);
                done();
            });
        }
    }

    RED.nodes.registerType('server-events', EventsAll);
};
