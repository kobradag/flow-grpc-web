const FlowSocketIO = require('./flow-socketio.js');
const {dpc, UID} = require('./helpers.js');

class FlowGRPCWeb extends FlowSocketIO {
	constructor(options) {
		super(options);
		this.on('grpc.proto', (msg)=>{
			console.log('grpc.proto:', msg)
			this.buildClients(msg.proto);
			this.events.emit("ready");
		})
		this.on('connect', ()=>{
			console.log('sending...grpc.proto.get:')
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
				console.log("RPC received unknown rpc callback (strange server-side retransmit?)");

			rid && this.pending.delete(rid);
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
		return (data, callback)=>{
			this.rpcCall(client, method, data, callback);
		}
	}

	rpcCall(client, subject, data, callback) {
		if(typeof(data)=='function'){
			callback = data;
			data = undefined;
		}

		if(!callback)
			return this.socket.emit('message', {client, subject, data});

		let rid = UID();
		this.pending.set(rid, {
			ts:Date.now(),
			callback
		})

		this.socket.emit('grpc.request', { 
			rid,
			req : {client, subject, data}
		});
	}
}

window.FlowGRPCWeb = FlowGRPCWeb;
module.exports = FlowGRPCWeb;

