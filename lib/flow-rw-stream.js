import {FlowEvents} from './flow-events.js';
import {UID} from './helpers.js';

export class FlowRWStream {
	constructor(rpc, options){
		this.id = options.id || UID();
		this.rpc = rpc;
		this.options = options;
		const {client, method, config} = options
		this.client = client;
		this.method = method;
		this.config = config;
		this.rids = new Set();
		this.init();
	}
	init(){
		this.initEvents();
	}
	initEvents(){
		this.events = new FlowEvents();
		this.streamDataSubId = this.rpc.on("grpc.stream.data", (msg)=>{
			const {sIds, data} = msg;
			if(!sIds.includes(this.id))
				return
			this.events.emit("data", data);
		})
		this.streamEndSubId = this.rpc.on("grpc.stream.end", (msg)=>{
			const {sIds} = msg;
			if(!sIds.includes(this.id))
				return
			this.events.emit("end");
			this.rpc.removePendings(this.rids);
			this.rpc.off(this.streamEndSubId);
			this.rpc.off(this.streamErrorSubId);
			this.rpc.off(this.streamDataSubId);
		})
		this.streamErrorSubId = this.rpc.on("grpc.stream.error", (msg)=>{
			const {sIds, error} = msg;
			if(!sIds.includes(this.id))
				return
			console.log("grpc.stream.error", msg)
			this.events.emit("error", error);
		})
	}

	on(eventName, callback){
		return this.events.on(eventName, callback);
	}
	off(uid, op){
		this.events.off(uid, op);
	}

	write(data){
		const {client, method} = this;
		let inData = data;
		let valid = true;
		let deleteReq = ()=>{
			valid = false;
			if(deleteReq.rid)
				this.rids.delete(deleteReq.rid);
		}
		let rid = this.rpc.streamMessage(this.id, client, method, data, (err, data)=>{
			deleteReq()
			if(err){
				//console.log("grpc write error", err, {client, method, data:inData})
				this.events.emit("error", err)
				return
			}
			this.events.emit("data", data)
		});
		if(valid)
			this.rids.add(rid);
		deleteReq.rid = rid; 
	}
	end(){
		const {client, method} = this;
		this.rpc.socketEmit('stream.end', {client, method, sId:this.id})
	}
}
