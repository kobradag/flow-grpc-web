import {FlowSocket} from './flow-socket.js';
import {dpc, UID} from './helpers.js';
import {FlowRWStream} from './flow-rw-stream.js';
export * from './helpers.js';

export class FlowGRPCWeb extends FlowSocket{
	constructor(options) {
		super(options);
		this.on('grpc.proto', (msg)=>{
			if(this._ready)
				return
			//console.log('grpc.proto:', msg)
			this.buildClients(msg.proto);
			this._ready = true;
			this.events.emit("ready", this.clients);
		})
		this.on('connect', ()=>{
			//console.log('sending...grpc.proto.get:')
			this.socket.emit("grpc.proto.get");
		});
	}

	initSocketHandlers() {
		this.socket.on('message', ({subject, data})=>{
			if(this.trace) {
				if(this.trace === 1 || this.trace === true)
					console.log('gRPC ['+this.id+']:', subject);
				else
				if(this.trace === 2)
					console.log('gRPC ['+this.id+']:', subject, data);                
			}
			this.events.emit(subject, data);
		});
		this.socket.on('grpc.response', (msg)=>{
			let {rid, error, response} = msg;
			let info = rid && this.pending.get(rid);
			if(info)
				info.callback.call(this, error, response);
			else if(rid)
				console.log("grpc.response received unknown callback (strange server-side retransmit?)");

			rid && this.pending.delete(rid);
		})

		this.socket.on('grpc.stream.response', (msg)=>{
			let {rid, sId, error, response} = msg;
			let info = rid && this.pending.get(rid);
			if(info)
				info.callback.call(this, error, response);
			else if(rid)
				console.log("grpc.stream.response received unknown callback");
		})

		

		return Promise.resolve();
	}

	buildClients({services, msg}){
		this.clients = {};
		Object.keys(services).forEach(key=>{
			this.clients[key] = this.buildClient(key, services[key]);
		})
	}

	buildClient(name, config){
		let instance = {};
		Object.keys(config).forEach(method=>{
			instance[method] = this.buildMethod(name, method, config[method])
		})

		return instance;
	}

	buildMethod(client, method, config){
		console.log("buildMethod:config", client, method, config)
		const {requestStream, responseStream} = config;
		if(requestStream && responseStream){
			return ()=>{
				return new FlowRWStream(this, {client, method, config});
			}
		}
		return (data, callback)=>{
			this.rpcCall(client, method, data, callback);
		}
	}

	rpcCall(client, method, data, callback) {
		if(typeof(data)=='function'){
			callback = data;
			data = undefined;
		}

		if(!callback)
			return this.socket.emit('message', {client, method, data});

		let rid = UID();
		this.pending.set(rid, {
			ts:Date.now(),
			callback
		})

		this.socket.emit('grpc.request', { 
			rid,
			req : {client, method, data}
		});

		return rid;
	}

	streamMessage(sId, client, method, data, callback){
		let rid = UID();
		this.pending.set(rid, {
			ts:Date.now(),
			sId,
			callback
		})

		this.socket.emit('grpc.stream.write', { 
			rid, sId,
			req : {client, method, data}
		});
		return rid;
	}
	removePendings(rids){
		rids.forEach(rid=>{
			this.pending.delete(rid);
		})
	}
}

window.FlowGRPCWeb = FlowGRPCWeb;

