const {dpc, UID} = require('./helpers.js');

class FlowEvents{

	constructor(){
		this.events = new Map();
		this.refs = new Map();
		this.listeners = [];
		this.mevents = [];

		this.on('destroy', ()=>{
			this.mevents.forEach(uid=>{
			   this.off(uid);
			});
		})
	}

	on(op, fn){
		if(!fn)
			throw new Error("events::on() - callback is required");
		let uid = UID();
		if(!this.events.has(op))
			this.events.set(op, new Map());
		this.events.get(op).set(uid, fn)
		this.refs.set(uid, op);
		return uid;
	}

	mon(op, fn){
		let uid = this.on(op, fn);
		this.mevents.push(uid);
		return uid;
	}

	off(uid, op) {
		if (uid) {
			let op = this.refs.get(uid);
			this.refs.delete(uid);
			let list = this.events.get(op)
			if(list)
				list.delete(uid);
		}else if(op){
			(this.events.get(op)||[]).forEach((fn, uid)=>{
				this.refs.delete(uid);
			});

			this.events.delete(op);
		};
	}

	emit(op, args) {

		let list = this.events.get(op);
		list && list.forEach(fn=>{
			fn(args);
		})

		this.listeners.forEach(listener=>{
			listener.emit.call(listener, op, args);
		})
	}

	emitAsync(op, ...args) {
		dpc(()=>{
			this.emit(op, ...args);
		})
	}

	addListener(listener) {
		if(this.listeners.indexOf(listener)<0)
			this.listeners.push(listener);
	}

	removeListener(listener) {
		let index = this.listeners.indexOf(listener);
		if(index>-1)
			this.listeners.splice(index, 1);
	}

	getListeners() {
		return this.listeners;
	}
}

module.exports = FlowEvents;