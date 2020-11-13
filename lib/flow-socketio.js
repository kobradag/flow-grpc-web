import {FlowEvents} from './flow-events.js';
import {dpc, UID} from './helpers.js';

export class FlowSocketIO {
	constructor(options){
		this.online = false;

		this.options = Object.assign({
			path:'/grpc',
			id:UID(),
			timeout:30,
			origin:window.location.origin
		}, options || {});

		this.timeout  = this.options.timeout;
		this.id = this.options.id;

		this.init();
	}

	init() {
		this.initEvent();
		this.connected = false;
		if (this.options.path)
			this.connect();
	}

	initEvent() {
		this.pending = new Map();
		this.events = new FlowEvents();
	}

	async connect(){
		if (this._connected || !this.options.path)
			return;
		if(this.options.path[0]!='/')
			this.options.path = "/"+this.options.path;
		this._connected = true;
		this.events.emitAsync('rpc-connecting');
		let io = this.options.io || window.io;
		this.socket = io(this.options.origin+this.options.path, this.options.args || {});
		//console.log("this.options.args"+this.options.args)
		this.socket.on('ready', ()=>{
			this.online = true;
		})
		this.socket.on('connect', ()=>{
			console.log("RPC connected");
			this.events.emit('connect');
		})
		this.socket.on('connect_error', (err)=>{
			this.events.emit('connect.error', err);
		})
		this.socket.on('error', (...args)=>{ 
			console.log("RPC error", args);
			this.events.emit('error', args);
		})
		this.socket.on('offline', ()=>{
			//window.location.reload();
			this.events.emit('offline');
		})
		this.socket.on('disconnect', ()=>{ 
			this.online = false;
			console.log("RPC disconnected", arguments);
			this.events.emit('disconnect');

			this.pending.forEach((info, id)=>{
				info.callback({ error : "Connection Closed"});
			});

			this.pending.clear();
		});

		await this.initSocketHandlers();

		let timeoutMonitor = ()=>{
			let ts = Date.now();
			let purge = [ ]
			this.pending.forEach((info, id)=>{
				if(ts - info.ts > this.timeout * 1000) {
					info.callback({ error : "Timeout "});
					purge.push(id);
				}
			});
			purge.forEach(id=>{
				this.pending.delete(id);
			});
			dpc(1000, timeoutMonitor);
		}
		dpc(1000, timeoutMonitor);

	}
	close(){
		if(this.socket)
			this.socket.close();
	}
	on(op, callback) {
		return this.events.on(op, callback);
	}
	off(uid, op){
		this.events.off(uid, op);
	}
	initSocketHandlers() {
		return Promise.resolve();
	}
}


