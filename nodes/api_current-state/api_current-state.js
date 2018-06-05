const BaseNode = require('../../lib/base-node');
const Joi = require('joi');

module.exports = function(RED) {
    const nodeOptions = {
        debug:  true,
        config: {
            name:             {},
            halt_if:          {},
            override_topic:   {},
            override_payload: {},
            entity_id:        {},
            server:           { isNode: true }
        },
        input: {
            entity_id: {
                messageProp: 'payload.entity_id',
                configProp:  'entity_id', // Will be used if value not found on message,
                validation:  {
                    haltOnFail: true,
                    schema:     Joi.string()    // Validates on message if exists, Joi will also attempt coercion
                }
            }
        }
    };

    class CurrentStateNode  extends BaseNode {
        constructor(nodeDefinition) {
            super(nodeDefinition, RED, nodeOptions);
        }

        /* eslint-disable camelcase */
        onInput({ parsedMessage, message }) {
            const entity_id = parsedMessage.entity_id.value;
            const logAndContinueEmpty = (logMsg) => { this.node.warn(logMsg); return ({ payload: {}}) };

            if (!entity_id) return logAndContinueEmpty('entity ID not set, cannot get current state, sending empty payload');

            const { states } = this.nodeConfig.server.homeAssistant;
            if (!states) return logAndContinueEmpty('local state cache missing, sending empty payload');

            const currentState = states[entity_id];
            if (!currentState) return logAndContinueEmpty(`entity could not be found in cache for entity_id: ${entity_id}, sending empty payload`);

            const shouldHaltIfState = this.nodeConfig.halt_if && (currentState.state === this.nodeConfig.halt_if);
            if (shouldHaltIfState) {
                const debugMsg = `Get current state: halting processing due to current state of ${entity_id} matches "halt if state" option`;
                this.debug(debugMsg);
                this.debugToClient(debugMsg);
                return null;
            }

            // default switches to true if undefined (backward compatibility)
            const override_topic = this.nodeConfig.override_topic !== false;
            const override_payload = this.nodeConfig.override_payload !== false;

            if (override_topic)   message.topic = entity_id;
            if (override_payload) message.payload = currentState.state;

            message.data = currentState;
            this.node.send(message);
        }
    }

    RED.nodes.registerType('api-current-state', CurrentStateNode);
};
