const FlowSocketIO = require('./flow-socketio.js');
const {dpc, UID} = require('./helpers.js');

class FlowGRPCWeb extends FlowSocketIO {
	constructor(options) {
		super(options);
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
		this.socket.on('grpc::response', (msg)=>{
			let {rid, error, data} = msg;
			let info = rid && this.pending.get(rid);
			if(info)
				info.callback.call(this, error, data);
			else if(rid)
				console.log("RPC received unknown rpc callback (strange server-side retransmit?)");

			rid && this.pending.delete(rid);
		})

		return Promise.resolve();
	}

	dispatch(subject, data, callback) {
		if(typeof(data)=='function'){
			callback = data;
			data = undefined;
		}

		if(!callback)
			return this.socket.emit('message', {subject, data});

		let rid = UID();

		this.pending.set(rid, {
			ts:Date.now(),
			callback
		})

		this.socket.emit('grpc.req', { 
			rid,
			req : {subject, data}
		});
	}
}

window.FlowGRPCWeb = FlowGRPCWeb;
module.exports = FlowGRPCWeb;

