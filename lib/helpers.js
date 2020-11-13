const toString = Object.prototype.toString;
const is = (obj, type) =>toString.call(obj)=='[object '+type+']'

const utils = {};
utils.toString = toString;
utils.is = is;
utils.isArray = obj=>Array.isArray(obj);
utils.isObject = obj=>is(obj, 'Object');
utils.isString = obj=>is(obj, 'String');
utils.isNumber = obj=>is(obj, 'Number');
utils.isBoolean = obj=>is(obj, 'Boolean');
utils.isFunction = obj=>is(obj, 'Function');
utils.isUndefined = obj=>is(obj, 'Undefined');

const bs58e = (()=>{
    let alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
        base = alphabet.length;
    return enc=>{
		let encoded = '';
		while(enc) {
			let remainder = enc % base;
			enc = Math.floor(enc / base);
			encoded = alphabet[remainder].toString() + encoded;        
		}
		return encoded;
	}
})();

let uid_vec = new Uint32Array(6);
const UID = (len = 26)=>{
	window.crypto.getRandomValues(uid_vec);
	return [...uid_vec].map(v=>bs58e(v)).join('').substring(0,len);
}
//if(!window.UID)
//	window.UID = UID;

const dpc = (delay, fn)=>{
	if(typeof delay == 'function')
		return setTimeout(delay, fn||0);
	return setTimeout(fn, delay||0);
}
const clearDPC = (dpc_)=>{
	clearTimeout(dpc_);
}
const deferred = () => {
    let methods = {};
    const p = new Promise((resolve, reject) => {
        methods = { resolve, reject };
    });
    return Object.assign(p, methods);
}

export {utils, UID, dpc, clearDPC, deferred, bs58e};
