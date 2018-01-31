const BaseNode = require('../../lib/base-node');
const Joi = require('joi');

module.exports = function(RED) {
    const nodeOptions = {
        debug:  true,
        config: {
            name:      {},
            halt_if:   {},
            entity_id: {},
            server:    { isNode: true }
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

    class CurrentState  extends BaseNode {
        constructor(nodeDefinition) {
            super(nodeDefinition, RED, nodeOptions);
        }

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
                this.debug(`Get current state: halting processing due to current state of ${entity_id} matches "halt if state" option`);
                this.flashFlowHaltedStatus();
                return null;
            }

            this.node.send({ topic: entity_id, payload: currentState.state, data: currentState });
        }
    }

    RED.nodes.registerType('api-current-state', CurrentState);
};
