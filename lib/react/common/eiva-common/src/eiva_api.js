/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $String = $util.global.String;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const eiva = $root.eiva = (() => {

    /**
     * Namespace eiva.
     * @exports eiva
     * @namespace
     */
    const eiva = {};

    eiva.ClientMessage = (function() {

        /**
         * Properties of a ClientMessage.
         * @typedef {Object} eiva.ClientMessage.$Properties
         * @property {eiva.CreateTaskRequest.$Properties|null} [createTask] ClientMessage createTask
         * @property {eiva.StopTaskRequest.$Properties|null} [stopTask] ClientMessage stopTask
         * @property {eiva.SubscribeTaskRequest.$Properties|null} [subscribeTask] ClientMessage subscribeTask
         * @property {eiva.Ping.$Properties|null} [ping] ClientMessage ping
         * @property {"createTask"|"stopTask"|"subscribeTask"|"ping"} [payload] ClientMessage payload
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ClientMessage.
         * @memberof eiva
         * @interface IClientMessage
         * @augments eiva.ClientMessage.$Properties
         * @deprecated Use eiva.ClientMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a ClientMessage.
         * @typedef {{
         *   createTask?: eiva.CreateTaskRequest.$Shape|null;
         *   stopTask?: eiva.StopTaskRequest.$Shape|null;
         *   subscribeTask?: eiva.SubscribeTaskRequest.$Shape|null;
         *   ping?: eiva.Ping.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ payload?: undefined; createTask?: null; stopTask?: null; subscribeTask?: null; ping?: null }|{ payload?: "createTask"; createTask: eiva.CreateTaskRequest.$Shape; stopTask?: null; subscribeTask?: null; ping?: null }|{ payload?: "stopTask"; createTask?: null; stopTask: eiva.StopTaskRequest.$Shape; subscribeTask?: null; ping?: null }|{ payload?: "subscribeTask"; createTask?: null; stopTask?: null; subscribeTask: eiva.SubscribeTaskRequest.$Shape; ping?: null }|{ payload?: "ping"; createTask?: null; stopTask?: null; subscribeTask?: null; ping: eiva.Ping.$Shape })
         * )} eiva.ClientMessage.$Shape
         */

        /**
         * Constructs a new ClientMessage.
         * @memberof eiva
         * @classdesc Represents a ClientMessage.
         * @constructor
         * @param {eiva.ClientMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ClientMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ClientMessage createTask.
         * @member {eiva.CreateTaskRequest.$Properties|null|undefined} createTask
         * @memberof eiva.ClientMessage
         * @instance
         */
        ClientMessage.prototype.createTask = null;

        /**
         * ClientMessage stopTask.
         * @member {eiva.StopTaskRequest.$Properties|null|undefined} stopTask
         * @memberof eiva.ClientMessage
         * @instance
         */
        ClientMessage.prototype.stopTask = null;

        /**
         * ClientMessage subscribeTask.
         * @member {eiva.SubscribeTaskRequest.$Properties|null|undefined} subscribeTask
         * @memberof eiva.ClientMessage
         * @instance
         */
        ClientMessage.prototype.subscribeTask = null;

        /**
         * ClientMessage ping.
         * @member {eiva.Ping.$Properties|null|undefined} ping
         * @memberof eiva.ClientMessage
         * @instance
         */
        ClientMessage.prototype.ping = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ClientMessage payload.
         * @member {"createTask"|"stopTask"|"subscribeTask"|"ping"|undefined} payload
         * @memberof eiva.ClientMessage
         * @instance
         */
        $Object.defineProperty(ClientMessage.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["createTask", "stopTask", "subscribeTask", "ping"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ClientMessage instance using the specified properties.
         * @function create
         * @memberof eiva.ClientMessage
         * @static
         * @param {eiva.ClientMessage.$Properties=} [properties] Properties to set
         * @returns {eiva.ClientMessage} ClientMessage instance
         * @type {{
         *   (properties: eiva.ClientMessage.$Shape): eiva.ClientMessage & eiva.ClientMessage.$Shape;
         *   (properties?: eiva.ClientMessage.$Properties): eiva.ClientMessage;
         * }}
         */
        ClientMessage.create = function(properties) {
            return new ClientMessage(properties);
        };

        /**
         * Encodes the specified ClientMessage message. Does not implicitly {@link eiva.ClientMessage.verify|verify} messages.
         * @function encode
         * @memberof eiva.ClientMessage
         * @static
         * @param {eiva.ClientMessage.$Properties} message ClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.createTask != null && $Object.hasOwnProperty.call(message, "createTask"))
                $root.eiva.CreateTaskRequest.encode(message.createTask, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.stopTask != null && $Object.hasOwnProperty.call(message, "stopTask"))
                $root.eiva.StopTaskRequest.encode(message.stopTask, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.subscribeTask != null && $Object.hasOwnProperty.call(message, "subscribeTask"))
                $root.eiva.SubscribeTaskRequest.encode(message.subscribeTask, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping"))
                $root.eiva.Ping.encode(message.ping, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ClientMessage message, length delimited. Does not implicitly {@link eiva.ClientMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.ClientMessage
         * @static
         * @param {eiva.ClientMessage.$Properties} message ClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ClientMessage message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.ClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.ClientMessage & eiva.ClientMessage.$Shape} ClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.ClientMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.createTask = $root.eiva.CreateTaskRequest.decode(reader, reader.uint32(), $undefined, _depth + 1, message.createTask);
                        message.payload = "createTask";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.stopTask = $root.eiva.StopTaskRequest.decode(reader, reader.uint32(), $undefined, _depth + 1, message.stopTask);
                        message.payload = "stopTask";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.subscribeTask = $root.eiva.SubscribeTaskRequest.decode(reader, reader.uint32(), $undefined, _depth + 1, message.subscribeTask);
                        message.payload = "subscribeTask";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.ping = $root.eiva.Ping.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ping);
                        message.payload = "ping";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ClientMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.ClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.ClientMessage & eiva.ClientMessage.$Shape} ClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ClientMessage message.
         * @function verify
         * @memberof eiva.ClientMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ClientMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.createTask != null && $Object.hasOwnProperty.call(message, "createTask")) {
                properties.payload = 1;
                {
                    let error = $root.eiva.CreateTaskRequest.verify(message.createTask, _depth + 1);
                    if (error)
                        return "createTask." + error;
                }
            }
            if (message.stopTask != null && $Object.hasOwnProperty.call(message, "stopTask")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.StopTaskRequest.verify(message.stopTask, _depth + 1);
                    if (error)
                        return "stopTask." + error;
                }
            }
            if (message.subscribeTask != null && $Object.hasOwnProperty.call(message, "subscribeTask")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.SubscribeTaskRequest.verify(message.subscribeTask, _depth + 1);
                    if (error)
                        return "subscribeTask." + error;
                }
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.Ping.verify(message.ping, _depth + 1);
                    if (error)
                        return "ping." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ClientMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.ClientMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.ClientMessage} ClientMessage
         */
        ClientMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.ClientMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.ClientMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.ClientMessage();
            if (object.createTask != null) {
                if (!$util.isObject(object.createTask))
                    throw $TypeError(".eiva.ClientMessage.createTask: object expected");
                message.createTask = $root.eiva.CreateTaskRequest.fromObject(object.createTask, _depth + 1);
            }
            if (object.stopTask != null) {
                if (!$util.isObject(object.stopTask))
                    throw $TypeError(".eiva.ClientMessage.stopTask: object expected");
                message.stopTask = $root.eiva.StopTaskRequest.fromObject(object.stopTask, _depth + 1);
            }
            if (object.subscribeTask != null) {
                if (!$util.isObject(object.subscribeTask))
                    throw $TypeError(".eiva.ClientMessage.subscribeTask: object expected");
                message.subscribeTask = $root.eiva.SubscribeTaskRequest.fromObject(object.subscribeTask, _depth + 1);
            }
            if (object.ping != null) {
                if (!$util.isObject(object.ping))
                    throw $TypeError(".eiva.ClientMessage.ping: object expected");
                message.ping = $root.eiva.Ping.fromObject(object.ping, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a ClientMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.ClientMessage
         * @static
         * @param {eiva.ClientMessage} message ClientMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ClientMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.createTask != null && $Object.hasOwnProperty.call(message, "createTask")) {
                object.createTask = $root.eiva.CreateTaskRequest.toObject(message.createTask, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "createTask";
            }
            if (message.stopTask != null && $Object.hasOwnProperty.call(message, "stopTask")) {
                object.stopTask = $root.eiva.StopTaskRequest.toObject(message.stopTask, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "stopTask";
            }
            if (message.subscribeTask != null && $Object.hasOwnProperty.call(message, "subscribeTask")) {
                object.subscribeTask = $root.eiva.SubscribeTaskRequest.toObject(message.subscribeTask, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "subscribeTask";
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                object.ping = $root.eiva.Ping.toObject(message.ping, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "ping";
            }
            return object;
        };

        /**
         * Converts this ClientMessage to JSON.
         * @function toJSON
         * @memberof eiva.ClientMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ClientMessage.prototype.toJSON = function() {
            return ClientMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ClientMessage
         * @function getTypeUrl
         * @memberof eiva.ClientMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ClientMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.ClientMessage";
        };

        return ClientMessage;
    })();

    eiva.CreateTaskRequest = (function() {

        /**
         * Properties of a CreateTaskRequest.
         * @typedef {Object} eiva.CreateTaskRequest.$Properties
         * @property {string|null} [requirement] CreateTaskRequest requirement
         * @property {string|null} [systemSettings] CreateTaskRequest systemSettings
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a CreateTaskRequest.
         * @memberof eiva
         * @interface ICreateTaskRequest
         * @augments eiva.CreateTaskRequest.$Properties
         * @deprecated Use eiva.CreateTaskRequest.$Properties instead.
         */

        /**
         * Shape of a CreateTaskRequest.
         * @typedef {eiva.CreateTaskRequest.$Properties} eiva.CreateTaskRequest.$Shape
         */

        /**
         * Constructs a new CreateTaskRequest.
         * @memberof eiva
         * @classdesc Represents a CreateTaskRequest.
         * @constructor
         * @param {eiva.CreateTaskRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const CreateTaskRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * CreateTaskRequest requirement.
         * @member {string} requirement
         * @memberof eiva.CreateTaskRequest
         * @instance
         */
        CreateTaskRequest.prototype.requirement = "";

        /**
         * CreateTaskRequest systemSettings.
         * @member {string} systemSettings
         * @memberof eiva.CreateTaskRequest
         * @instance
         */
        CreateTaskRequest.prototype.systemSettings = "";

        /**
         * Creates a new CreateTaskRequest instance using the specified properties.
         * @function create
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {eiva.CreateTaskRequest.$Properties=} [properties] Properties to set
         * @returns {eiva.CreateTaskRequest} CreateTaskRequest instance
         * @type {{
         *   (properties: eiva.CreateTaskRequest.$Shape): eiva.CreateTaskRequest & eiva.CreateTaskRequest.$Shape;
         *   (properties?: eiva.CreateTaskRequest.$Properties): eiva.CreateTaskRequest;
         * }}
         */
        CreateTaskRequest.create = function(properties) {
            return new CreateTaskRequest(properties);
        };

        /**
         * Encodes the specified CreateTaskRequest message. Does not implicitly {@link eiva.CreateTaskRequest.verify|verify} messages.
         * @function encode
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {eiva.CreateTaskRequest.$Properties} message CreateTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateTaskRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.requirement != null && $Object.hasOwnProperty.call(message, "requirement") && message.requirement !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.requirement);
            if (message.systemSettings != null && $Object.hasOwnProperty.call(message, "systemSettings") && message.systemSettings !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.systemSettings);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified CreateTaskRequest message, length delimited. Does not implicitly {@link eiva.CreateTaskRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {eiva.CreateTaskRequest.$Properties} message CreateTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CreateTaskRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a CreateTaskRequest message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.CreateTaskRequest & eiva.CreateTaskRequest.$Shape} CreateTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateTaskRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.CreateTaskRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.requirement = value;
                        else
                            delete message.requirement;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.systemSettings = value;
                        else
                            delete message.systemSettings;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a CreateTaskRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.CreateTaskRequest & eiva.CreateTaskRequest.$Shape} CreateTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CreateTaskRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CreateTaskRequest message.
         * @function verify
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CreateTaskRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.requirement != null && $Object.hasOwnProperty.call(message, "requirement"))
                if (!$util.isString(message.requirement))
                    return "requirement: string expected";
            if (message.systemSettings != null && $Object.hasOwnProperty.call(message, "systemSettings"))
                if (!$util.isString(message.systemSettings))
                    return "systemSettings: string expected";
            return null;
        };

        /**
         * Creates a CreateTaskRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.CreateTaskRequest} CreateTaskRequest
         */
        CreateTaskRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.CreateTaskRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.CreateTaskRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.CreateTaskRequest();
            if (object.requirement != null)
                if (typeof object.requirement !== "string" || object.requirement.length)
                    message.requirement = $String(object.requirement);
            if (object.systemSettings != null)
                if (typeof object.systemSettings !== "string" || object.systemSettings.length)
                    message.systemSettings = $String(object.systemSettings);
            return message;
        };

        /**
         * Creates a plain object from a CreateTaskRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {eiva.CreateTaskRequest} message CreateTaskRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CreateTaskRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.requirement = "";
                object.systemSettings = "";
            }
            if (message.requirement != null && $Object.hasOwnProperty.call(message, "requirement"))
                object.requirement = message.requirement;
            if (message.systemSettings != null && $Object.hasOwnProperty.call(message, "systemSettings"))
                object.systemSettings = message.systemSettings;
            return object;
        };

        /**
         * Converts this CreateTaskRequest to JSON.
         * @function toJSON
         * @memberof eiva.CreateTaskRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CreateTaskRequest.prototype.toJSON = function() {
            return CreateTaskRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CreateTaskRequest
         * @function getTypeUrl
         * @memberof eiva.CreateTaskRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CreateTaskRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.CreateTaskRequest";
        };

        return CreateTaskRequest;
    })();

    eiva.StopTaskRequest = (function() {

        /**
         * Properties of a StopTaskRequest.
         * @typedef {Object} eiva.StopTaskRequest.$Properties
         * @property {string|null} [taskId] StopTaskRequest taskId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a StopTaskRequest.
         * @memberof eiva
         * @interface IStopTaskRequest
         * @augments eiva.StopTaskRequest.$Properties
         * @deprecated Use eiva.StopTaskRequest.$Properties instead.
         */

        /**
         * Shape of a StopTaskRequest.
         * @typedef {eiva.StopTaskRequest.$Properties} eiva.StopTaskRequest.$Shape
         */

        /**
         * Constructs a new StopTaskRequest.
         * @memberof eiva
         * @classdesc Represents a StopTaskRequest.
         * @constructor
         * @param {eiva.StopTaskRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const StopTaskRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * StopTaskRequest taskId.
         * @member {string} taskId
         * @memberof eiva.StopTaskRequest
         * @instance
         */
        StopTaskRequest.prototype.taskId = "";

        /**
         * Creates a new StopTaskRequest instance using the specified properties.
         * @function create
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {eiva.StopTaskRequest.$Properties=} [properties] Properties to set
         * @returns {eiva.StopTaskRequest} StopTaskRequest instance
         * @type {{
         *   (properties: eiva.StopTaskRequest.$Shape): eiva.StopTaskRequest & eiva.StopTaskRequest.$Shape;
         *   (properties?: eiva.StopTaskRequest.$Properties): eiva.StopTaskRequest;
         * }}
         */
        StopTaskRequest.create = function(properties) {
            return new StopTaskRequest(properties);
        };

        /**
         * Encodes the specified StopTaskRequest message. Does not implicitly {@link eiva.StopTaskRequest.verify|verify} messages.
         * @function encode
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {eiva.StopTaskRequest.$Properties} message StopTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StopTaskRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified StopTaskRequest message, length delimited. Does not implicitly {@link eiva.StopTaskRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {eiva.StopTaskRequest.$Properties} message StopTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StopTaskRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a StopTaskRequest message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.StopTaskRequest & eiva.StopTaskRequest.$Shape} StopTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StopTaskRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.StopTaskRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a StopTaskRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.StopTaskRequest & eiva.StopTaskRequest.$Shape} StopTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StopTaskRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StopTaskRequest message.
         * @function verify
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StopTaskRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            return null;
        };

        /**
         * Creates a StopTaskRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.StopTaskRequest} StopTaskRequest
         */
        StopTaskRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.StopTaskRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.StopTaskRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.StopTaskRequest();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            return message;
        };

        /**
         * Creates a plain object from a StopTaskRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {eiva.StopTaskRequest} message StopTaskRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StopTaskRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.taskId = "";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            return object;
        };

        /**
         * Converts this StopTaskRequest to JSON.
         * @function toJSON
         * @memberof eiva.StopTaskRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StopTaskRequest.prototype.toJSON = function() {
            return StopTaskRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for StopTaskRequest
         * @function getTypeUrl
         * @memberof eiva.StopTaskRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        StopTaskRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.StopTaskRequest";
        };

        return StopTaskRequest;
    })();

    eiva.SubscribeTaskRequest = (function() {

        /**
         * Properties of a SubscribeTaskRequest.
         * @typedef {Object} eiva.SubscribeTaskRequest.$Properties
         * @property {string|null} [taskId] SubscribeTaskRequest taskId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SubscribeTaskRequest.
         * @memberof eiva
         * @interface ISubscribeTaskRequest
         * @augments eiva.SubscribeTaskRequest.$Properties
         * @deprecated Use eiva.SubscribeTaskRequest.$Properties instead.
         */

        /**
         * Shape of a SubscribeTaskRequest.
         * @typedef {eiva.SubscribeTaskRequest.$Properties} eiva.SubscribeTaskRequest.$Shape
         */

        /**
         * Constructs a new SubscribeTaskRequest.
         * @memberof eiva
         * @classdesc Represents a SubscribeTaskRequest.
         * @constructor
         * @param {eiva.SubscribeTaskRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SubscribeTaskRequest = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * SubscribeTaskRequest taskId.
         * @member {string} taskId
         * @memberof eiva.SubscribeTaskRequest
         * @instance
         */
        SubscribeTaskRequest.prototype.taskId = "";

        /**
         * Creates a new SubscribeTaskRequest instance using the specified properties.
         * @function create
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {eiva.SubscribeTaskRequest.$Properties=} [properties] Properties to set
         * @returns {eiva.SubscribeTaskRequest} SubscribeTaskRequest instance
         * @type {{
         *   (properties: eiva.SubscribeTaskRequest.$Shape): eiva.SubscribeTaskRequest & eiva.SubscribeTaskRequest.$Shape;
         *   (properties?: eiva.SubscribeTaskRequest.$Properties): eiva.SubscribeTaskRequest;
         * }}
         */
        SubscribeTaskRequest.create = function(properties) {
            return new SubscribeTaskRequest(properties);
        };

        /**
         * Encodes the specified SubscribeTaskRequest message. Does not implicitly {@link eiva.SubscribeTaskRequest.verify|verify} messages.
         * @function encode
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {eiva.SubscribeTaskRequest.$Properties} message SubscribeTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeTaskRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SubscribeTaskRequest message, length delimited. Does not implicitly {@link eiva.SubscribeTaskRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {eiva.SubscribeTaskRequest.$Properties} message SubscribeTaskRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubscribeTaskRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a SubscribeTaskRequest message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.SubscribeTaskRequest & eiva.SubscribeTaskRequest.$Shape} SubscribeTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeTaskRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.SubscribeTaskRequest(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SubscribeTaskRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.SubscribeTaskRequest & eiva.SubscribeTaskRequest.$Shape} SubscribeTaskRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubscribeTaskRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SubscribeTaskRequest message.
         * @function verify
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SubscribeTaskRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            return null;
        };

        /**
         * Creates a SubscribeTaskRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.SubscribeTaskRequest} SubscribeTaskRequest
         */
        SubscribeTaskRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.SubscribeTaskRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.SubscribeTaskRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.SubscribeTaskRequest();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            return message;
        };

        /**
         * Creates a plain object from a SubscribeTaskRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {eiva.SubscribeTaskRequest} message SubscribeTaskRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SubscribeTaskRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.taskId = "";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            return object;
        };

        /**
         * Converts this SubscribeTaskRequest to JSON.
         * @function toJSON
         * @memberof eiva.SubscribeTaskRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SubscribeTaskRequest.prototype.toJSON = function() {
            return SubscribeTaskRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SubscribeTaskRequest
         * @function getTypeUrl
         * @memberof eiva.SubscribeTaskRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SubscribeTaskRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.SubscribeTaskRequest";
        };

        return SubscribeTaskRequest;
    })();

    eiva.Ping = (function() {

        /**
         * Properties of a Ping.
         * @typedef {Object} eiva.Ping.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Ping.
         * @memberof eiva
         * @interface IPing
         * @augments eiva.Ping.$Properties
         * @deprecated Use eiva.Ping.$Properties instead.
         */

        /**
         * Shape of a Ping.
         * @typedef {eiva.Ping.$Properties} eiva.Ping.$Shape
         */

        /**
         * Constructs a new Ping.
         * @memberof eiva
         * @classdesc Represents a Ping.
         * @constructor
         * @param {eiva.Ping.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Ping = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new Ping instance using the specified properties.
         * @function create
         * @memberof eiva.Ping
         * @static
         * @param {eiva.Ping.$Properties=} [properties] Properties to set
         * @returns {eiva.Ping} Ping instance
         * @type {{
         *   (properties: eiva.Ping.$Shape): eiva.Ping & eiva.Ping.$Shape;
         *   (properties?: eiva.Ping.$Properties): eiva.Ping;
         * }}
         */
        Ping.create = function(properties) {
            return new Ping(properties);
        };

        /**
         * Encodes the specified Ping message. Does not implicitly {@link eiva.Ping.verify|verify} messages.
         * @function encode
         * @memberof eiva.Ping
         * @static
         * @param {eiva.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link eiva.Ping.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.Ping
         * @static
         * @param {eiva.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.Ping & eiva.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.Ping();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.Ping & eiva.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Ping message.
         * @function verify
         * @memberof eiva.Ping
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Ping.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.Ping
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.Ping} Ping
         */
        Ping.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.Ping)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.Ping: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.eiva.Ping();
        };

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.Ping
         * @static
         * @param {eiva.Ping} message Ping
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Ping.toObject = function () {
            return {};
        };

        /**
         * Converts this Ping to JSON.
         * @function toJSON
         * @memberof eiva.Ping
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Ping.prototype.toJSON = function() {
            return Ping.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Ping
         * @function getTypeUrl
         * @memberof eiva.Ping
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Ping.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.Ping";
        };

        return Ping;
    })();

    eiva.ServerMessage = (function() {

        /**
         * Properties of a ServerMessage.
         * @typedef {Object} eiva.ServerMessage.$Properties
         * @property {eiva.TaskCreatedEvent.$Properties|null} [taskCreated] ServerMessage taskCreated
         * @property {eiva.TaskStatusEvent.$Properties|null} [taskStatus] ServerMessage taskStatus
         * @property {eiva.TaskLogEvent.$Properties|null} [taskLog] ServerMessage taskLog
         * @property {eiva.TaskCompletedEvent.$Properties|null} [taskCompleted] ServerMessage taskCompleted
         * @property {eiva.TaskFailedEvent.$Properties|null} [taskFailed] ServerMessage taskFailed
         * @property {eiva.TaskInterruptedEvent.$Properties|null} [taskInterrupted] ServerMessage taskInterrupted
         * @property {eiva.ErrorEvent.$Properties|null} [error] ServerMessage error
         * @property {eiva.Pong.$Properties|null} [pong] ServerMessage pong
         * @property {"taskCreated"|"taskStatus"|"taskLog"|"taskCompleted"|"taskFailed"|"taskInterrupted"|"error"|"pong"} [payload] ServerMessage payload
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ServerMessage.
         * @memberof eiva
         * @interface IServerMessage
         * @augments eiva.ServerMessage.$Properties
         * @deprecated Use eiva.ServerMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a ServerMessage.
         * @typedef {{
         *   taskCreated?: eiva.TaskCreatedEvent.$Shape|null;
         *   taskStatus?: eiva.TaskStatusEvent.$Shape|null;
         *   taskLog?: eiva.TaskLogEvent.$Shape|null;
         *   taskCompleted?: eiva.TaskCompletedEvent.$Shape|null;
         *   taskFailed?: eiva.TaskFailedEvent.$Shape|null;
         *   taskInterrupted?: eiva.TaskInterruptedEvent.$Shape|null;
         *   error?: eiva.ErrorEvent.$Shape|null;
         *   pong?: eiva.Pong.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ payload?: undefined; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskCreated"; taskCreated: eiva.TaskCreatedEvent.$Shape; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskStatus"; taskCreated?: null; taskStatus: eiva.TaskStatusEvent.$Shape; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskLog"; taskCreated?: null; taskStatus?: null; taskLog: eiva.TaskLogEvent.$Shape; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskCompleted"; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted: eiva.TaskCompletedEvent.$Shape; taskFailed?: null; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskFailed"; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed: eiva.TaskFailedEvent.$Shape; taskInterrupted?: null; error?: null; pong?: null }|{ payload?: "taskInterrupted"; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted: eiva.TaskInterruptedEvent.$Shape; error?: null; pong?: null }|{ payload?: "error"; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error: eiva.ErrorEvent.$Shape; pong?: null }|{ payload?: "pong"; taskCreated?: null; taskStatus?: null; taskLog?: null; taskCompleted?: null; taskFailed?: null; taskInterrupted?: null; error?: null; pong: eiva.Pong.$Shape })
         * )} eiva.ServerMessage.$Shape
         */

        /**
         * Constructs a new ServerMessage.
         * @memberof eiva
         * @classdesc Represents a ServerMessage.
         * @constructor
         * @param {eiva.ServerMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ServerMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ServerMessage taskCreated.
         * @member {eiva.TaskCreatedEvent.$Properties|null|undefined} taskCreated
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskCreated = null;

        /**
         * ServerMessage taskStatus.
         * @member {eiva.TaskStatusEvent.$Properties|null|undefined} taskStatus
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskStatus = null;

        /**
         * ServerMessage taskLog.
         * @member {eiva.TaskLogEvent.$Properties|null|undefined} taskLog
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskLog = null;

        /**
         * ServerMessage taskCompleted.
         * @member {eiva.TaskCompletedEvent.$Properties|null|undefined} taskCompleted
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskCompleted = null;

        /**
         * ServerMessage taskFailed.
         * @member {eiva.TaskFailedEvent.$Properties|null|undefined} taskFailed
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskFailed = null;

        /**
         * ServerMessage taskInterrupted.
         * @member {eiva.TaskInterruptedEvent.$Properties|null|undefined} taskInterrupted
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.taskInterrupted = null;

        /**
         * ServerMessage error.
         * @member {eiva.ErrorEvent.$Properties|null|undefined} error
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.error = null;

        /**
         * ServerMessage pong.
         * @member {eiva.Pong.$Properties|null|undefined} pong
         * @memberof eiva.ServerMessage
         * @instance
         */
        ServerMessage.prototype.pong = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ServerMessage payload.
         * @member {"taskCreated"|"taskStatus"|"taskLog"|"taskCompleted"|"taskFailed"|"taskInterrupted"|"error"|"pong"|undefined} payload
         * @memberof eiva.ServerMessage
         * @instance
         */
        $Object.defineProperty(ServerMessage.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["taskCreated", "taskStatus", "taskLog", "taskCompleted", "taskFailed", "taskInterrupted", "error", "pong"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ServerMessage instance using the specified properties.
         * @function create
         * @memberof eiva.ServerMessage
         * @static
         * @param {eiva.ServerMessage.$Properties=} [properties] Properties to set
         * @returns {eiva.ServerMessage} ServerMessage instance
         * @type {{
         *   (properties: eiva.ServerMessage.$Shape): eiva.ServerMessage & eiva.ServerMessage.$Shape;
         *   (properties?: eiva.ServerMessage.$Properties): eiva.ServerMessage;
         * }}
         */
        ServerMessage.create = function(properties) {
            return new ServerMessage(properties);
        };

        /**
         * Encodes the specified ServerMessage message. Does not implicitly {@link eiva.ServerMessage.verify|verify} messages.
         * @function encode
         * @memberof eiva.ServerMessage
         * @static
         * @param {eiva.ServerMessage.$Properties} message ServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskCreated != null && $Object.hasOwnProperty.call(message, "taskCreated"))
                $root.eiva.TaskCreatedEvent.encode(message.taskCreated, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.taskStatus != null && $Object.hasOwnProperty.call(message, "taskStatus"))
                $root.eiva.TaskStatusEvent.encode(message.taskStatus, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.taskLog != null && $Object.hasOwnProperty.call(message, "taskLog"))
                $root.eiva.TaskLogEvent.encode(message.taskLog, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.taskCompleted != null && $Object.hasOwnProperty.call(message, "taskCompleted"))
                $root.eiva.TaskCompletedEvent.encode(message.taskCompleted, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.taskFailed != null && $Object.hasOwnProperty.call(message, "taskFailed"))
                $root.eiva.TaskFailedEvent.encode(message.taskFailed, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.taskInterrupted != null && $Object.hasOwnProperty.call(message, "taskInterrupted"))
                $root.eiva.TaskInterruptedEvent.encode(message.taskInterrupted, writer.uint32(/* id 6, wireType 2 =*/50).fork(), _depth + 1).ldelim();
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                $root.eiva.ErrorEvent.encode(message.error, writer.uint32(/* id 7, wireType 2 =*/58).fork(), _depth + 1).ldelim();
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong"))
                $root.eiva.Pong.encode(message.pong, writer.uint32(/* id 8, wireType 2 =*/66).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ServerMessage message, length delimited. Does not implicitly {@link eiva.ServerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.ServerMessage
         * @static
         * @param {eiva.ServerMessage.$Properties} message ServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ServerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.ServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.ServerMessage & eiva.ServerMessage.$Shape} ServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.ServerMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.taskCreated = $root.eiva.TaskCreatedEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskCreated);
                        message.payload = "taskCreated";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.taskStatus = $root.eiva.TaskStatusEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskStatus);
                        message.payload = "taskStatus";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.taskLog = $root.eiva.TaskLogEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskLog);
                        message.payload = "taskLog";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.taskCompleted = $root.eiva.TaskCompletedEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskCompleted);
                        message.payload = "taskCompleted";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.taskFailed = $root.eiva.TaskFailedEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskFailed);
                        message.payload = "taskFailed";
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        message.taskInterrupted = $root.eiva.TaskInterruptedEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.taskInterrupted);
                        message.payload = "taskInterrupted";
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        message.error = $root.eiva.ErrorEvent.decode(reader, reader.uint32(), $undefined, _depth + 1, message.error);
                        message.payload = "error";
                        continue;
                    }
                case 8: {
                        if (wireType !== 2)
                            break;
                        message.pong = $root.eiva.Pong.decode(reader, reader.uint32(), $undefined, _depth + 1, message.pong);
                        message.payload = "pong";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ServerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.ServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.ServerMessage & eiva.ServerMessage.$Shape} ServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ServerMessage message.
         * @function verify
         * @memberof eiva.ServerMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ServerMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.taskCreated != null && $Object.hasOwnProperty.call(message, "taskCreated")) {
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskCreatedEvent.verify(message.taskCreated, _depth + 1);
                    if (error)
                        return "taskCreated." + error;
                }
            }
            if (message.taskStatus != null && $Object.hasOwnProperty.call(message, "taskStatus")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskStatusEvent.verify(message.taskStatus, _depth + 1);
                    if (error)
                        return "taskStatus." + error;
                }
            }
            if (message.taskLog != null && $Object.hasOwnProperty.call(message, "taskLog")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskLogEvent.verify(message.taskLog, _depth + 1);
                    if (error)
                        return "taskLog." + error;
                }
            }
            if (message.taskCompleted != null && $Object.hasOwnProperty.call(message, "taskCompleted")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskCompletedEvent.verify(message.taskCompleted, _depth + 1);
                    if (error)
                        return "taskCompleted." + error;
                }
            }
            if (message.taskFailed != null && $Object.hasOwnProperty.call(message, "taskFailed")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskFailedEvent.verify(message.taskFailed, _depth + 1);
                    if (error)
                        return "taskFailed." + error;
                }
            }
            if (message.taskInterrupted != null && $Object.hasOwnProperty.call(message, "taskInterrupted")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.TaskInterruptedEvent.verify(message.taskInterrupted, _depth + 1);
                    if (error)
                        return "taskInterrupted." + error;
                }
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.ErrorEvent.verify(message.error, _depth + 1);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.eiva.Pong.verify(message.pong, _depth + 1);
                    if (error)
                        return "pong." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ServerMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.ServerMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.ServerMessage} ServerMessage
         */
        ServerMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.ServerMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.ServerMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.ServerMessage();
            if (object.taskCreated != null) {
                if (!$util.isObject(object.taskCreated))
                    throw $TypeError(".eiva.ServerMessage.taskCreated: object expected");
                message.taskCreated = $root.eiva.TaskCreatedEvent.fromObject(object.taskCreated, _depth + 1);
            }
            if (object.taskStatus != null) {
                if (!$util.isObject(object.taskStatus))
                    throw $TypeError(".eiva.ServerMessage.taskStatus: object expected");
                message.taskStatus = $root.eiva.TaskStatusEvent.fromObject(object.taskStatus, _depth + 1);
            }
            if (object.taskLog != null) {
                if (!$util.isObject(object.taskLog))
                    throw $TypeError(".eiva.ServerMessage.taskLog: object expected");
                message.taskLog = $root.eiva.TaskLogEvent.fromObject(object.taskLog, _depth + 1);
            }
            if (object.taskCompleted != null) {
                if (!$util.isObject(object.taskCompleted))
                    throw $TypeError(".eiva.ServerMessage.taskCompleted: object expected");
                message.taskCompleted = $root.eiva.TaskCompletedEvent.fromObject(object.taskCompleted, _depth + 1);
            }
            if (object.taskFailed != null) {
                if (!$util.isObject(object.taskFailed))
                    throw $TypeError(".eiva.ServerMessage.taskFailed: object expected");
                message.taskFailed = $root.eiva.TaskFailedEvent.fromObject(object.taskFailed, _depth + 1);
            }
            if (object.taskInterrupted != null) {
                if (!$util.isObject(object.taskInterrupted))
                    throw $TypeError(".eiva.ServerMessage.taskInterrupted: object expected");
                message.taskInterrupted = $root.eiva.TaskInterruptedEvent.fromObject(object.taskInterrupted, _depth + 1);
            }
            if (object.error != null) {
                if (!$util.isObject(object.error))
                    throw $TypeError(".eiva.ServerMessage.error: object expected");
                message.error = $root.eiva.ErrorEvent.fromObject(object.error, _depth + 1);
            }
            if (object.pong != null) {
                if (!$util.isObject(object.pong))
                    throw $TypeError(".eiva.ServerMessage.pong: object expected");
                message.pong = $root.eiva.Pong.fromObject(object.pong, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a ServerMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.ServerMessage
         * @static
         * @param {eiva.ServerMessage} message ServerMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ServerMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.taskCreated != null && $Object.hasOwnProperty.call(message, "taskCreated")) {
                object.taskCreated = $root.eiva.TaskCreatedEvent.toObject(message.taskCreated, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskCreated";
            }
            if (message.taskStatus != null && $Object.hasOwnProperty.call(message, "taskStatus")) {
                object.taskStatus = $root.eiva.TaskStatusEvent.toObject(message.taskStatus, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskStatus";
            }
            if (message.taskLog != null && $Object.hasOwnProperty.call(message, "taskLog")) {
                object.taskLog = $root.eiva.TaskLogEvent.toObject(message.taskLog, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskLog";
            }
            if (message.taskCompleted != null && $Object.hasOwnProperty.call(message, "taskCompleted")) {
                object.taskCompleted = $root.eiva.TaskCompletedEvent.toObject(message.taskCompleted, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskCompleted";
            }
            if (message.taskFailed != null && $Object.hasOwnProperty.call(message, "taskFailed")) {
                object.taskFailed = $root.eiva.TaskFailedEvent.toObject(message.taskFailed, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskFailed";
            }
            if (message.taskInterrupted != null && $Object.hasOwnProperty.call(message, "taskInterrupted")) {
                object.taskInterrupted = $root.eiva.TaskInterruptedEvent.toObject(message.taskInterrupted, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "taskInterrupted";
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                object.error = $root.eiva.ErrorEvent.toObject(message.error, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "error";
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                object.pong = $root.eiva.Pong.toObject(message.pong, options, _depth + 1);
                if (options.oneofs)
                    object.payload = "pong";
            }
            return object;
        };

        /**
         * Converts this ServerMessage to JSON.
         * @function toJSON
         * @memberof eiva.ServerMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ServerMessage.prototype.toJSON = function() {
            return ServerMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ServerMessage
         * @function getTypeUrl
         * @memberof eiva.ServerMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ServerMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.ServerMessage";
        };

        return ServerMessage;
    })();

    eiva.TaskCreatedEvent = (function() {

        /**
         * Properties of a TaskCreatedEvent.
         * @typedef {Object} eiva.TaskCreatedEvent.$Properties
         * @property {string|null} [taskId] TaskCreatedEvent taskId
         * @property {string|null} [status] TaskCreatedEvent status
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskCreatedEvent.
         * @memberof eiva
         * @interface ITaskCreatedEvent
         * @augments eiva.TaskCreatedEvent.$Properties
         * @deprecated Use eiva.TaskCreatedEvent.$Properties instead.
         */

        /**
         * Shape of a TaskCreatedEvent.
         * @typedef {eiva.TaskCreatedEvent.$Properties} eiva.TaskCreatedEvent.$Shape
         */

        /**
         * Constructs a new TaskCreatedEvent.
         * @memberof eiva
         * @classdesc Represents a TaskCreatedEvent.
         * @constructor
         * @param {eiva.TaskCreatedEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskCreatedEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskCreatedEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskCreatedEvent
         * @instance
         */
        TaskCreatedEvent.prototype.taskId = "";

        /**
         * TaskCreatedEvent status.
         * @member {string} status
         * @memberof eiva.TaskCreatedEvent
         * @instance
         */
        TaskCreatedEvent.prototype.status = "";

        /**
         * Creates a new TaskCreatedEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {eiva.TaskCreatedEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskCreatedEvent} TaskCreatedEvent instance
         * @type {{
         *   (properties: eiva.TaskCreatedEvent.$Shape): eiva.TaskCreatedEvent & eiva.TaskCreatedEvent.$Shape;
         *   (properties?: eiva.TaskCreatedEvent.$Properties): eiva.TaskCreatedEvent;
         * }}
         */
        TaskCreatedEvent.create = function(properties) {
            return new TaskCreatedEvent(properties);
        };

        /**
         * Encodes the specified TaskCreatedEvent message. Does not implicitly {@link eiva.TaskCreatedEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {eiva.TaskCreatedEvent.$Properties} message TaskCreatedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskCreatedEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.status);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskCreatedEvent message, length delimited. Does not implicitly {@link eiva.TaskCreatedEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {eiva.TaskCreatedEvent.$Properties} message TaskCreatedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskCreatedEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskCreatedEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskCreatedEvent & eiva.TaskCreatedEvent.$Shape} TaskCreatedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskCreatedEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskCreatedEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.status = value;
                        else
                            delete message.status;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskCreatedEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskCreatedEvent & eiva.TaskCreatedEvent.$Shape} TaskCreatedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskCreatedEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskCreatedEvent message.
         * @function verify
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskCreatedEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                if (!$util.isString(message.status))
                    return "status: string expected";
            return null;
        };

        /**
         * Creates a TaskCreatedEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskCreatedEvent} TaskCreatedEvent
         */
        TaskCreatedEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskCreatedEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskCreatedEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskCreatedEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.status != null)
                if (typeof object.status !== "string" || object.status.length)
                    message.status = $String(object.status);
            return message;
        };

        /**
         * Creates a plain object from a TaskCreatedEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {eiva.TaskCreatedEvent} message TaskCreatedEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskCreatedEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.status = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                object.status = message.status;
            return object;
        };

        /**
         * Converts this TaskCreatedEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskCreatedEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskCreatedEvent.prototype.toJSON = function() {
            return TaskCreatedEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskCreatedEvent
         * @function getTypeUrl
         * @memberof eiva.TaskCreatedEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskCreatedEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskCreatedEvent";
        };

        return TaskCreatedEvent;
    })();

    eiva.TaskStatusEvent = (function() {

        /**
         * Properties of a TaskStatusEvent.
         * @typedef {Object} eiva.TaskStatusEvent.$Properties
         * @property {string|null} [taskId] TaskStatusEvent taskId
         * @property {string|null} [status] TaskStatusEvent status
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskStatusEvent.
         * @memberof eiva
         * @interface ITaskStatusEvent
         * @augments eiva.TaskStatusEvent.$Properties
         * @deprecated Use eiva.TaskStatusEvent.$Properties instead.
         */

        /**
         * Shape of a TaskStatusEvent.
         * @typedef {eiva.TaskStatusEvent.$Properties} eiva.TaskStatusEvent.$Shape
         */

        /**
         * Constructs a new TaskStatusEvent.
         * @memberof eiva
         * @classdesc Represents a TaskStatusEvent.
         * @constructor
         * @param {eiva.TaskStatusEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskStatusEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskStatusEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskStatusEvent
         * @instance
         */
        TaskStatusEvent.prototype.taskId = "";

        /**
         * TaskStatusEvent status.
         * @member {string} status
         * @memberof eiva.TaskStatusEvent
         * @instance
         */
        TaskStatusEvent.prototype.status = "";

        /**
         * Creates a new TaskStatusEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {eiva.TaskStatusEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskStatusEvent} TaskStatusEvent instance
         * @type {{
         *   (properties: eiva.TaskStatusEvent.$Shape): eiva.TaskStatusEvent & eiva.TaskStatusEvent.$Shape;
         *   (properties?: eiva.TaskStatusEvent.$Properties): eiva.TaskStatusEvent;
         * }}
         */
        TaskStatusEvent.create = function(properties) {
            return new TaskStatusEvent(properties);
        };

        /**
         * Encodes the specified TaskStatusEvent message. Does not implicitly {@link eiva.TaskStatusEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {eiva.TaskStatusEvent.$Properties} message TaskStatusEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskStatusEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.status);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskStatusEvent message, length delimited. Does not implicitly {@link eiva.TaskStatusEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {eiva.TaskStatusEvent.$Properties} message TaskStatusEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskStatusEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskStatusEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskStatusEvent & eiva.TaskStatusEvent.$Shape} TaskStatusEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskStatusEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskStatusEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.status = value;
                        else
                            delete message.status;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskStatusEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskStatusEvent & eiva.TaskStatusEvent.$Shape} TaskStatusEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskStatusEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskStatusEvent message.
         * @function verify
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskStatusEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                if (!$util.isString(message.status))
                    return "status: string expected";
            return null;
        };

        /**
         * Creates a TaskStatusEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskStatusEvent} TaskStatusEvent
         */
        TaskStatusEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskStatusEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskStatusEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskStatusEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.status != null)
                if (typeof object.status !== "string" || object.status.length)
                    message.status = $String(object.status);
            return message;
        };

        /**
         * Creates a plain object from a TaskStatusEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {eiva.TaskStatusEvent} message TaskStatusEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskStatusEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.status = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                object.status = message.status;
            return object;
        };

        /**
         * Converts this TaskStatusEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskStatusEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskStatusEvent.prototype.toJSON = function() {
            return TaskStatusEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskStatusEvent
         * @function getTypeUrl
         * @memberof eiva.TaskStatusEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskStatusEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskStatusEvent";
        };

        return TaskStatusEvent;
    })();

    eiva.TaskLogEvent = (function() {

        /**
         * Properties of a TaskLogEvent.
         * @typedef {Object} eiva.TaskLogEvent.$Properties
         * @property {string|null} [taskId] TaskLogEvent taskId
         * @property {string|null} [message] TaskLogEvent message
         * @property {string|null} [at] TaskLogEvent at
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskLogEvent.
         * @memberof eiva
         * @interface ITaskLogEvent
         * @augments eiva.TaskLogEvent.$Properties
         * @deprecated Use eiva.TaskLogEvent.$Properties instead.
         */

        /**
         * Shape of a TaskLogEvent.
         * @typedef {eiva.TaskLogEvent.$Properties} eiva.TaskLogEvent.$Shape
         */

        /**
         * Constructs a new TaskLogEvent.
         * @memberof eiva
         * @classdesc Represents a TaskLogEvent.
         * @constructor
         * @param {eiva.TaskLogEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskLogEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskLogEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskLogEvent
         * @instance
         */
        TaskLogEvent.prototype.taskId = "";

        /**
         * TaskLogEvent message.
         * @member {string} message
         * @memberof eiva.TaskLogEvent
         * @instance
         */
        TaskLogEvent.prototype.message = "";

        /**
         * TaskLogEvent at.
         * @member {string} at
         * @memberof eiva.TaskLogEvent
         * @instance
         */
        TaskLogEvent.prototype.at = "";

        /**
         * Creates a new TaskLogEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {eiva.TaskLogEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskLogEvent} TaskLogEvent instance
         * @type {{
         *   (properties: eiva.TaskLogEvent.$Shape): eiva.TaskLogEvent & eiva.TaskLogEvent.$Shape;
         *   (properties?: eiva.TaskLogEvent.$Properties): eiva.TaskLogEvent;
         * }}
         */
        TaskLogEvent.create = function(properties) {
            return new TaskLogEvent(properties);
        };

        /**
         * Encodes the specified TaskLogEvent message. Does not implicitly {@link eiva.TaskLogEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {eiva.TaskLogEvent.$Properties} message TaskLogEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskLogEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.message != null && $Object.hasOwnProperty.call(message, "message") && message.message !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            if (message.at != null && $Object.hasOwnProperty.call(message, "at") && message.at !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.at);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskLogEvent message, length delimited. Does not implicitly {@link eiva.TaskLogEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {eiva.TaskLogEvent.$Properties} message TaskLogEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskLogEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskLogEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskLogEvent & eiva.TaskLogEvent.$Shape} TaskLogEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskLogEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskLogEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.message = value;
                        else
                            delete message.message;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.at = value;
                        else
                            delete message.at;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskLogEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskLogEvent & eiva.TaskLogEvent.$Shape} TaskLogEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskLogEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskLogEvent message.
         * @function verify
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskLogEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                if (!$util.isString(message.at))
                    return "at: string expected";
            return null;
        };

        /**
         * Creates a TaskLogEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskLogEvent} TaskLogEvent
         */
        TaskLogEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskLogEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskLogEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskLogEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.message != null)
                if (typeof object.message !== "string" || object.message.length)
                    message.message = $String(object.message);
            if (object.at != null)
                if (typeof object.at !== "string" || object.at.length)
                    message.at = $String(object.at);
            return message;
        };

        /**
         * Creates a plain object from a TaskLogEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {eiva.TaskLogEvent} message TaskLogEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskLogEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.message = "";
                object.at = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                object.message = message.message;
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                object.at = message.at;
            return object;
        };

        /**
         * Converts this TaskLogEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskLogEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskLogEvent.prototype.toJSON = function() {
            return TaskLogEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskLogEvent
         * @function getTypeUrl
         * @memberof eiva.TaskLogEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskLogEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskLogEvent";
        };

        return TaskLogEvent;
    })();

    eiva.TaskCompletedEvent = (function() {

        /**
         * Properties of a TaskCompletedEvent.
         * @typedef {Object} eiva.TaskCompletedEvent.$Properties
         * @property {string|null} [taskId] TaskCompletedEvent taskId
         * @property {string|null} [result] TaskCompletedEvent result
         * @property {string|null} [at] TaskCompletedEvent at
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskCompletedEvent.
         * @memberof eiva
         * @interface ITaskCompletedEvent
         * @augments eiva.TaskCompletedEvent.$Properties
         * @deprecated Use eiva.TaskCompletedEvent.$Properties instead.
         */

        /**
         * Shape of a TaskCompletedEvent.
         * @typedef {eiva.TaskCompletedEvent.$Properties} eiva.TaskCompletedEvent.$Shape
         */

        /**
         * Constructs a new TaskCompletedEvent.
         * @memberof eiva
         * @classdesc Represents a TaskCompletedEvent.
         * @constructor
         * @param {eiva.TaskCompletedEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskCompletedEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskCompletedEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskCompletedEvent
         * @instance
         */
        TaskCompletedEvent.prototype.taskId = "";

        /**
         * TaskCompletedEvent result.
         * @member {string} result
         * @memberof eiva.TaskCompletedEvent
         * @instance
         */
        TaskCompletedEvent.prototype.result = "";

        /**
         * TaskCompletedEvent at.
         * @member {string} at
         * @memberof eiva.TaskCompletedEvent
         * @instance
         */
        TaskCompletedEvent.prototype.at = "";

        /**
         * Creates a new TaskCompletedEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {eiva.TaskCompletedEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskCompletedEvent} TaskCompletedEvent instance
         * @type {{
         *   (properties: eiva.TaskCompletedEvent.$Shape): eiva.TaskCompletedEvent & eiva.TaskCompletedEvent.$Shape;
         *   (properties?: eiva.TaskCompletedEvent.$Properties): eiva.TaskCompletedEvent;
         * }}
         */
        TaskCompletedEvent.create = function(properties) {
            return new TaskCompletedEvent(properties);
        };

        /**
         * Encodes the specified TaskCompletedEvent message. Does not implicitly {@link eiva.TaskCompletedEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {eiva.TaskCompletedEvent.$Properties} message TaskCompletedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskCompletedEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.result != null && $Object.hasOwnProperty.call(message, "result") && message.result !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.result);
            if (message.at != null && $Object.hasOwnProperty.call(message, "at") && message.at !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.at);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskCompletedEvent message, length delimited. Does not implicitly {@link eiva.TaskCompletedEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {eiva.TaskCompletedEvent.$Properties} message TaskCompletedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskCompletedEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskCompletedEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskCompletedEvent & eiva.TaskCompletedEvent.$Shape} TaskCompletedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskCompletedEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskCompletedEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.result = value;
                        else
                            delete message.result;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.at = value;
                        else
                            delete message.at;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskCompletedEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskCompletedEvent & eiva.TaskCompletedEvent.$Shape} TaskCompletedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskCompletedEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskCompletedEvent message.
         * @function verify
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskCompletedEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.result != null && $Object.hasOwnProperty.call(message, "result"))
                if (!$util.isString(message.result))
                    return "result: string expected";
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                if (!$util.isString(message.at))
                    return "at: string expected";
            return null;
        };

        /**
         * Creates a TaskCompletedEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskCompletedEvent} TaskCompletedEvent
         */
        TaskCompletedEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskCompletedEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskCompletedEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskCompletedEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.result != null)
                if (typeof object.result !== "string" || object.result.length)
                    message.result = $String(object.result);
            if (object.at != null)
                if (typeof object.at !== "string" || object.at.length)
                    message.at = $String(object.at);
            return message;
        };

        /**
         * Creates a plain object from a TaskCompletedEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {eiva.TaskCompletedEvent} message TaskCompletedEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskCompletedEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.result = "";
                object.at = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.result != null && $Object.hasOwnProperty.call(message, "result"))
                object.result = message.result;
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                object.at = message.at;
            return object;
        };

        /**
         * Converts this TaskCompletedEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskCompletedEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskCompletedEvent.prototype.toJSON = function() {
            return TaskCompletedEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskCompletedEvent
         * @function getTypeUrl
         * @memberof eiva.TaskCompletedEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskCompletedEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskCompletedEvent";
        };

        return TaskCompletedEvent;
    })();

    eiva.TaskFailedEvent = (function() {

        /**
         * Properties of a TaskFailedEvent.
         * @typedef {Object} eiva.TaskFailedEvent.$Properties
         * @property {string|null} [taskId] TaskFailedEvent taskId
         * @property {string|null} [error] TaskFailedEvent error
         * @property {string|null} [at] TaskFailedEvent at
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskFailedEvent.
         * @memberof eiva
         * @interface ITaskFailedEvent
         * @augments eiva.TaskFailedEvent.$Properties
         * @deprecated Use eiva.TaskFailedEvent.$Properties instead.
         */

        /**
         * Shape of a TaskFailedEvent.
         * @typedef {eiva.TaskFailedEvent.$Properties} eiva.TaskFailedEvent.$Shape
         */

        /**
         * Constructs a new TaskFailedEvent.
         * @memberof eiva
         * @classdesc Represents a TaskFailedEvent.
         * @constructor
         * @param {eiva.TaskFailedEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskFailedEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskFailedEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskFailedEvent
         * @instance
         */
        TaskFailedEvent.prototype.taskId = "";

        /**
         * TaskFailedEvent error.
         * @member {string} error
         * @memberof eiva.TaskFailedEvent
         * @instance
         */
        TaskFailedEvent.prototype.error = "";

        /**
         * TaskFailedEvent at.
         * @member {string} at
         * @memberof eiva.TaskFailedEvent
         * @instance
         */
        TaskFailedEvent.prototype.at = "";

        /**
         * Creates a new TaskFailedEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {eiva.TaskFailedEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskFailedEvent} TaskFailedEvent instance
         * @type {{
         *   (properties: eiva.TaskFailedEvent.$Shape): eiva.TaskFailedEvent & eiva.TaskFailedEvent.$Shape;
         *   (properties?: eiva.TaskFailedEvent.$Properties): eiva.TaskFailedEvent;
         * }}
         */
        TaskFailedEvent.create = function(properties) {
            return new TaskFailedEvent(properties);
        };

        /**
         * Encodes the specified TaskFailedEvent message. Does not implicitly {@link eiva.TaskFailedEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {eiva.TaskFailedEvent.$Properties} message TaskFailedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskFailedEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.error != null && $Object.hasOwnProperty.call(message, "error") && message.error !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.error);
            if (message.at != null && $Object.hasOwnProperty.call(message, "at") && message.at !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.at);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskFailedEvent message, length delimited. Does not implicitly {@link eiva.TaskFailedEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {eiva.TaskFailedEvent.$Properties} message TaskFailedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskFailedEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskFailedEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskFailedEvent & eiva.TaskFailedEvent.$Shape} TaskFailedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskFailedEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskFailedEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.error = value;
                        else
                            delete message.error;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.at = value;
                        else
                            delete message.at;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskFailedEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskFailedEvent & eiva.TaskFailedEvent.$Shape} TaskFailedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskFailedEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskFailedEvent message.
         * @function verify
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskFailedEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                if (!$util.isString(message.error))
                    return "error: string expected";
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                if (!$util.isString(message.at))
                    return "at: string expected";
            return null;
        };

        /**
         * Creates a TaskFailedEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskFailedEvent} TaskFailedEvent
         */
        TaskFailedEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskFailedEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskFailedEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskFailedEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.error != null)
                if (typeof object.error !== "string" || object.error.length)
                    message.error = $String(object.error);
            if (object.at != null)
                if (typeof object.at !== "string" || object.at.length)
                    message.at = $String(object.at);
            return message;
        };

        /**
         * Creates a plain object from a TaskFailedEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {eiva.TaskFailedEvent} message TaskFailedEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskFailedEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.error = "";
                object.at = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                object.error = message.error;
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                object.at = message.at;
            return object;
        };

        /**
         * Converts this TaskFailedEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskFailedEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskFailedEvent.prototype.toJSON = function() {
            return TaskFailedEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskFailedEvent
         * @function getTypeUrl
         * @memberof eiva.TaskFailedEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskFailedEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskFailedEvent";
        };

        return TaskFailedEvent;
    })();

    eiva.TaskInterruptedEvent = (function() {

        /**
         * Properties of a TaskInterruptedEvent.
         * @typedef {Object} eiva.TaskInterruptedEvent.$Properties
         * @property {string|null} [taskId] TaskInterruptedEvent taskId
         * @property {string|null} [error] TaskInterruptedEvent error
         * @property {string|null} [at] TaskInterruptedEvent at
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TaskInterruptedEvent.
         * @memberof eiva
         * @interface ITaskInterruptedEvent
         * @augments eiva.TaskInterruptedEvent.$Properties
         * @deprecated Use eiva.TaskInterruptedEvent.$Properties instead.
         */

        /**
         * Shape of a TaskInterruptedEvent.
         * @typedef {eiva.TaskInterruptedEvent.$Properties} eiva.TaskInterruptedEvent.$Shape
         */

        /**
         * Constructs a new TaskInterruptedEvent.
         * @memberof eiva
         * @classdesc Represents a TaskInterruptedEvent.
         * @constructor
         * @param {eiva.TaskInterruptedEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TaskInterruptedEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TaskInterruptedEvent taskId.
         * @member {string} taskId
         * @memberof eiva.TaskInterruptedEvent
         * @instance
         */
        TaskInterruptedEvent.prototype.taskId = "";

        /**
         * TaskInterruptedEvent error.
         * @member {string} error
         * @memberof eiva.TaskInterruptedEvent
         * @instance
         */
        TaskInterruptedEvent.prototype.error = "";

        /**
         * TaskInterruptedEvent at.
         * @member {string} at
         * @memberof eiva.TaskInterruptedEvent
         * @instance
         */
        TaskInterruptedEvent.prototype.at = "";

        /**
         * Creates a new TaskInterruptedEvent instance using the specified properties.
         * @function create
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {eiva.TaskInterruptedEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.TaskInterruptedEvent} TaskInterruptedEvent instance
         * @type {{
         *   (properties: eiva.TaskInterruptedEvent.$Shape): eiva.TaskInterruptedEvent & eiva.TaskInterruptedEvent.$Shape;
         *   (properties?: eiva.TaskInterruptedEvent.$Properties): eiva.TaskInterruptedEvent;
         * }}
         */
        TaskInterruptedEvent.create = function(properties) {
            return new TaskInterruptedEvent(properties);
        };

        /**
         * Encodes the specified TaskInterruptedEvent message. Does not implicitly {@link eiva.TaskInterruptedEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {eiva.TaskInterruptedEvent.$Properties} message TaskInterruptedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskInterruptedEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId") && message.taskId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.taskId);
            if (message.error != null && $Object.hasOwnProperty.call(message, "error") && message.error !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.error);
            if (message.at != null && $Object.hasOwnProperty.call(message, "at") && message.at !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.at);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TaskInterruptedEvent message, length delimited. Does not implicitly {@link eiva.TaskInterruptedEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {eiva.TaskInterruptedEvent.$Properties} message TaskInterruptedEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TaskInterruptedEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TaskInterruptedEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.TaskInterruptedEvent & eiva.TaskInterruptedEvent.$Shape} TaskInterruptedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskInterruptedEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.TaskInterruptedEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.taskId = value;
                        else
                            delete message.taskId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.error = value;
                        else
                            delete message.error;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.at = value;
                        else
                            delete message.at;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TaskInterruptedEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.TaskInterruptedEvent & eiva.TaskInterruptedEvent.$Shape} TaskInterruptedEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TaskInterruptedEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TaskInterruptedEvent message.
         * @function verify
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TaskInterruptedEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                if (!$util.isString(message.taskId))
                    return "taskId: string expected";
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                if (!$util.isString(message.error))
                    return "error: string expected";
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                if (!$util.isString(message.at))
                    return "at: string expected";
            return null;
        };

        /**
         * Creates a TaskInterruptedEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.TaskInterruptedEvent} TaskInterruptedEvent
         */
        TaskInterruptedEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.TaskInterruptedEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.TaskInterruptedEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.TaskInterruptedEvent();
            if (object.taskId != null)
                if (typeof object.taskId !== "string" || object.taskId.length)
                    message.taskId = $String(object.taskId);
            if (object.error != null)
                if (typeof object.error !== "string" || object.error.length)
                    message.error = $String(object.error);
            if (object.at != null)
                if (typeof object.at !== "string" || object.at.length)
                    message.at = $String(object.at);
            return message;
        };

        /**
         * Creates a plain object from a TaskInterruptedEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {eiva.TaskInterruptedEvent} message TaskInterruptedEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TaskInterruptedEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.taskId = "";
                object.error = "";
                object.at = "";
            }
            if (message.taskId != null && $Object.hasOwnProperty.call(message, "taskId"))
                object.taskId = message.taskId;
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                object.error = message.error;
            if (message.at != null && $Object.hasOwnProperty.call(message, "at"))
                object.at = message.at;
            return object;
        };

        /**
         * Converts this TaskInterruptedEvent to JSON.
         * @function toJSON
         * @memberof eiva.TaskInterruptedEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TaskInterruptedEvent.prototype.toJSON = function() {
            return TaskInterruptedEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TaskInterruptedEvent
         * @function getTypeUrl
         * @memberof eiva.TaskInterruptedEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TaskInterruptedEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.TaskInterruptedEvent";
        };

        return TaskInterruptedEvent;
    })();

    eiva.ErrorEvent = (function() {

        /**
         * Properties of an ErrorEvent.
         * @typedef {Object} eiva.ErrorEvent.$Properties
         * @property {string|null} [message] ErrorEvent message
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an ErrorEvent.
         * @memberof eiva
         * @interface IErrorEvent
         * @augments eiva.ErrorEvent.$Properties
         * @deprecated Use eiva.ErrorEvent.$Properties instead.
         */

        /**
         * Shape of an ErrorEvent.
         * @typedef {eiva.ErrorEvent.$Properties} eiva.ErrorEvent.$Shape
         */

        /**
         * Constructs a new ErrorEvent.
         * @memberof eiva
         * @classdesc Represents an ErrorEvent.
         * @constructor
         * @param {eiva.ErrorEvent.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ErrorEvent = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ErrorEvent message.
         * @member {string} message
         * @memberof eiva.ErrorEvent
         * @instance
         */
        ErrorEvent.prototype.message = "";

        /**
         * Creates a new ErrorEvent instance using the specified properties.
         * @function create
         * @memberof eiva.ErrorEvent
         * @static
         * @param {eiva.ErrorEvent.$Properties=} [properties] Properties to set
         * @returns {eiva.ErrorEvent} ErrorEvent instance
         * @type {{
         *   (properties: eiva.ErrorEvent.$Shape): eiva.ErrorEvent & eiva.ErrorEvent.$Shape;
         *   (properties?: eiva.ErrorEvent.$Properties): eiva.ErrorEvent;
         * }}
         */
        ErrorEvent.create = function(properties) {
            return new ErrorEvent(properties);
        };

        /**
         * Encodes the specified ErrorEvent message. Does not implicitly {@link eiva.ErrorEvent.verify|verify} messages.
         * @function encode
         * @memberof eiva.ErrorEvent
         * @static
         * @param {eiva.ErrorEvent.$Properties} message ErrorEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorEvent.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.message != null && $Object.hasOwnProperty.call(message, "message") && message.message !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.message);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ErrorEvent message, length delimited. Does not implicitly {@link eiva.ErrorEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.ErrorEvent
         * @static
         * @param {eiva.ErrorEvent.$Properties} message ErrorEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorEvent.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an ErrorEvent message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.ErrorEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.ErrorEvent & eiva.ErrorEvent.$Shape} ErrorEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorEvent.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.ErrorEvent(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.message = value;
                        else
                            delete message.message;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an ErrorEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.ErrorEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.ErrorEvent & eiva.ErrorEvent.$Shape} ErrorEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorEvent.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ErrorEvent message.
         * @function verify
         * @memberof eiva.ErrorEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ErrorEvent.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            return null;
        };

        /**
         * Creates an ErrorEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.ErrorEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.ErrorEvent} ErrorEvent
         */
        ErrorEvent.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.ErrorEvent)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.ErrorEvent: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.eiva.ErrorEvent();
            if (object.message != null)
                if (typeof object.message !== "string" || object.message.length)
                    message.message = $String(object.message);
            return message;
        };

        /**
         * Creates a plain object from an ErrorEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.ErrorEvent
         * @static
         * @param {eiva.ErrorEvent} message ErrorEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ErrorEvent.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.message = "";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                object.message = message.message;
            return object;
        };

        /**
         * Converts this ErrorEvent to JSON.
         * @function toJSON
         * @memberof eiva.ErrorEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ErrorEvent.prototype.toJSON = function() {
            return ErrorEvent.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ErrorEvent
         * @function getTypeUrl
         * @memberof eiva.ErrorEvent
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ErrorEvent.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.ErrorEvent";
        };

        return ErrorEvent;
    })();

    eiva.Pong = (function() {

        /**
         * Properties of a Pong.
         * @typedef {Object} eiva.Pong.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Pong.
         * @memberof eiva
         * @interface IPong
         * @augments eiva.Pong.$Properties
         * @deprecated Use eiva.Pong.$Properties instead.
         */

        /**
         * Shape of a Pong.
         * @typedef {eiva.Pong.$Properties} eiva.Pong.$Shape
         */

        /**
         * Constructs a new Pong.
         * @memberof eiva
         * @classdesc Represents a Pong.
         * @constructor
         * @param {eiva.Pong.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Pong = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new Pong instance using the specified properties.
         * @function create
         * @memberof eiva.Pong
         * @static
         * @param {eiva.Pong.$Properties=} [properties] Properties to set
         * @returns {eiva.Pong} Pong instance
         * @type {{
         *   (properties: eiva.Pong.$Shape): eiva.Pong & eiva.Pong.$Shape;
         *   (properties?: eiva.Pong.$Properties): eiva.Pong;
         * }}
         */
        Pong.create = function(properties) {
            return new Pong(properties);
        };

        /**
         * Encodes the specified Pong message. Does not implicitly {@link eiva.Pong.verify|verify} messages.
         * @function encode
         * @memberof eiva.Pong
         * @static
         * @param {eiva.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link eiva.Pong.verify|verify} messages.
         * @function encodeDelimited
         * @memberof eiva.Pong
         * @static
         * @param {eiva.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @function decode
         * @memberof eiva.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {eiva.Pong & eiva.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.eiva.Pong();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof eiva.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {eiva.Pong & eiva.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Pong message.
         * @function verify
         * @memberof eiva.Pong
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Pong.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof eiva.Pong
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {eiva.Pong} Pong
         */
        Pong.fromObject = function (object, _depth) {
            if (object instanceof $root.eiva.Pong)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".eiva.Pong: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.eiva.Pong();
        };

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @function toObject
         * @memberof eiva.Pong
         * @static
         * @param {eiva.Pong} message Pong
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Pong.toObject = function () {
            return {};
        };

        /**
         * Converts this Pong to JSON.
         * @function toJSON
         * @memberof eiva.Pong
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Pong.prototype.toJSON = function() {
            return Pong.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Pong
         * @function getTypeUrl
         * @memberof eiva.Pong
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Pong.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/eiva.Pong";
        };

        return Pong;
    })();

    return eiva;
})();

export {
  $root as default
};
